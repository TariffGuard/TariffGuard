"""
Forecast API endpoints for TariffGuard
Provides solar, load, and demand-risk forecasts to the frontend and optimizer.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, date
from typing import Optional

from app.core.database import get_db
from app.models.factory import Factory
from app.services.solar_estimator import SolarEstimator
from app.services.load_forecaster import LoadForecaster
from app.services.demand_risk import DemandRiskCalculator
from app.services.weather_service import WeatherService

router = APIRouter(prefix="/api/forecast", tags=["forecast"])


@router.post("/solar/{factory_id}")
def solar_forecast(
    factory_id: int,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    db: Session = Depends(get_db),
):
    """
    Return estimated solar PV output for each hour in the given range.

    Uses weather radiation data + factory solar capacity to calculate
    hourly PV generation.  Falls back to a clear-sky model when no
    weather data is available.
    """
    if not start_time:
        start_time = datetime.now().replace(minute=0, second=0, microsecond=0)
    if not end_time:
        end_time = start_time + timedelta(hours=24)

    try:
        estimator = SolarEstimator(db, factory_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    estimates = estimator.estimate_period(start_time, end_time)
    total_kwh = sum(e["solar_kwh"] for e in estimates)
    peak_kw = max((e["solar_kw"] for e in estimates), default=0)

    return {
        "factory_id": factory_id,
        "start_time": start_time,
        "end_time": end_time,
        "total_solar_kwh": round(total_kwh, 2),
        "peak_solar_kw": round(peak_kw, 2),
        "solar_capacity_kw": estimator.solar_capacity_kw,
        "system_efficiency": estimator.system_efficiency,
        "hourly": estimates,
    }


@router.post("/solar/{factory_id}/profile")
def solar_profile(
    factory_id: int,
    days_back: int = 30,
    db: Session = Depends(get_db),
):
    """
    Return average solar availability by hour-of-day.

    Useful for the optimizer to identify solar-rich time windows.
    """
    try:
        estimator = SolarEstimator(db, factory_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    end = datetime.now()
    start = end - timedelta(days=days_back)
    profile = estimator.solar_availability_profile(start, end)

    return {
        "factory_id": factory_id,
        "days_analyzed": days_back,
        "hourly_avg_solar_kw": profile,
    }


@router.post("/load/{factory_id}")
def load_forecast(
    factory_id: int,
    hours: int = 24,
    start_time: Optional[datetime] = None,
    db: Session = Depends(get_db),
):
    """
    Predict near-term electricity load using the trained XGBoost model.

    Returns hourly predicted kWh/kW for the planning horizon.
    The model must be trained first via `train_model.py`.
    """
    if not start_time:
        start_time = datetime.now().replace(
            minute=0, second=0, microsecond=0
        ) + timedelta(hours=1)

    fc = LoadForecaster(db, factory_id)
    if not fc.load_model():
        raise HTTPException(
            status_code=503,
            detail="Load forecasting model not trained yet. "
                   "Run: python train_model.py",
        )

    predictions = fc.predict_horizon(hours=hours, start_time=start_time)
    total_kwh = sum(p["predicted_kwh"] for p in predictions)
    peak_kw = max((p["predicted_kw"] for p in predictions), default=0)

    return {
        "factory_id": factory_id,
        "start_time": start_time,
        "hours": hours,
        "total_predicted_kwh": round(total_kwh, 2),
        "peak_predicted_kw": round(peak_kw, 2),
        "model": "XGBoost",
        "hourly": predictions,
    }


@router.post("/demand-risk/{factory_id}")
def demand_risk_forecast(
    factory_id: int,
    hours: int = 24,
    db: Session = Depends(get_db),
):
    """
    Calculate demand risk scores for the next *hours* hours.

    Combines the load forecast with solar estimates to determine
    grid demand, then scores each slot against the factory's
    sanctioned load.
    """
    factory = db.query(Factory).filter(Factory.id == factory_id).first()
    if not factory:
        raise HTTPException(status_code=404, detail="Factory not found")

    sanctioned = factory.sanctioned_load_kw or 250

    # Get load forecast
    fc = LoadForecaster(db, factory_id)
    has_model = fc.load_model()

    start_time = datetime.now().replace(
        minute=0, second=0, microsecond=0
    ) + timedelta(hours=1)
    end_time = start_time + timedelta(hours=hours - 1)

    if has_model:
        predictions = fc.predict_horizon(hours=hours, start_time=start_time)
        slot_loads = [
            {"timestamp": p["timestamp"], "load_kw": p["predicted_kw"]}
            for p in predictions
        ]
        source = "xgboost_model"
    else:
        # Fallback: use recent average from meter readings
        from app.models.meter_reading import MeterReading
        from sqlalchemy import func
        avg_kw = (
            db.query(func.avg(MeterReading.kw))
            .filter(MeterReading.factory_id == factory_id)
            .scalar()
        ) or 150.0
        slot_loads = [
            {
                "timestamp": start_time + timedelta(hours=h),
                "load_kw": float(avg_kw),
            }
            for h in range(hours)
        ]
        source = "historical_average"

    # Get solar estimates
    try:
        solar_est = SolarEstimator(db, factory_id)
        solar_data = solar_est.estimate_period(start_time, end_time)
        solar_map = {s["timestamp"]: s["solar_kw"] for s in solar_data}
    except ValueError:
        solar_map = {}

    # Calculate risk
    calc = DemandRiskCalculator(sanctioned_load_kw=sanctioned)
    risk_result = calc.score_profile(slot_loads, solar_map)
    risk_result["source"] = source

    return risk_result


@router.get("/weather/{factory_id}")
def weather_forecast(
    factory_id: int,
    days: int = 7,
    db: Session = Depends(get_db),
):
    """
    Return a 7-day (configurable) daily weather forecast for solar planning.

    Fetches or generates weather data, then aggregates into daily summaries
    showing temperature range, cloud cover, precipitation, and estimated
    solar generation with a quality rating (good/moderate/poor).
    """
    factory = db.query(Factory).filter(Factory.id == factory_id).first()
    if not factory:
        raise HTTPException(status_code=404, detail="Factory not found")

    today = date.today()
    end_date = today + timedelta(days=days - 1)

    # Fetch/generate weather data for the forecast period
    svc = WeatherService(db, factory_id)
    svc.fetch_and_store(today, end_date)

    # Query the stored hourly readings
    start_dt = datetime.combine(today, datetime.min.time())
    end_dt = datetime.combine(end_date, datetime.min.time()) + timedelta(hours=23)
    readings = svc.get_readings(start=start_dt, end=end_dt)

    if not readings:
        raise HTTPException(status_code=500, detail="Failed to generate weather data")

    # Aggregate into daily summaries
    daily: dict = {}
    for r in readings:
        day_key = r.timestamp.date().isoformat()
        if day_key not in daily:
            daily[day_key] = {
                "temps": [],
                "clouds": [],
                "precip": 0.0,
                "humidity": [],
                "wind": [],
                "radiation": [],
            }
        d = daily[day_key]
        if r.temperature_c is not None:
            d["temps"].append(r.temperature_c)
        if r.cloud_cover_pct is not None:
            d["clouds"].append(r.cloud_cover_pct)
        d["precip"] += (r.precipitation_mm or 0)
        if r.humidity_pct is not None:
            d["humidity"].append(r.humidity_pct)
        if r.wind_speed_kmh is not None:
            d["wind"].append(r.wind_speed_kmh)
        if r.shortwave_radiation_wm2 is not None:
            d["radiation"].append(r.shortwave_radiation_wm2)

    # Estimate solar for the period
    solar_capacity = factory.solar_capacity_kw or 0
    try:
        solar_est = SolarEstimator(db, factory_id)
        solar_hourly = solar_est.estimate_period(start_dt, end_dt)
        # Aggregate solar by day
        solar_daily: dict = {}
        for s in solar_hourly:
            day_key = s["timestamp"].date().isoformat() if hasattr(s["timestamp"], "date") else str(s["timestamp"])[:10]
            solar_daily.setdefault(day_key, 0.0)
            solar_daily[day_key] += s["solar_kwh"]
    except ValueError:
        solar_daily = {}

    # Build response
    forecast_days = []
    for day_key in sorted(daily.keys()):
        d = daily[day_key]
        temps = d["temps"]
        clouds = d["clouds"]
        avg_cloud = sum(clouds) / len(clouds) if clouds else 0
        estimated_solar = solar_daily.get(day_key, 0.0)

        # Solar quality rating based on cloud cover
        if avg_cloud < 30:
            solar_quality = "good"
        elif avg_cloud < 60:
            solar_quality = "moderate"
        else:
            solar_quality = "poor"

        # Determine weather condition
        precip = round(d["precip"], 1)
        if precip > 5:
            condition = "rainy"
        elif avg_cloud > 65:
            condition = "cloudy"
        elif avg_cloud > 35:
            condition = "partly_cloudy"
        else:
            condition = "sunny"

        forecast_days.append({
            "date": day_key,
            "temp_high": round(max(temps), 1) if temps else None,
            "temp_low": round(min(temps), 1) if temps else None,
            "avg_cloud_cover": round(avg_cloud, 1),
            "precipitation_mm": precip,
            "avg_humidity": round(sum(d["humidity"]) / len(d["humidity"]), 1) if d["humidity"] else None,
            "avg_wind_speed": round(sum(d["wind"]) / len(d["wind"]), 1) if d["wind"] else None,
            "estimated_solar_kwh": round(estimated_solar, 2),
            "solar_quality": solar_quality,
            "condition": condition,
        })

    return {
        "factory_id": factory_id,
        "forecast_days": len(forecast_days),
        "solar_capacity_kw": solar_capacity,
        "daily": forecast_days,
    }
