"""
Forecast API endpoints for TariffGuard
Provides solar, load, and demand-risk forecasts to the frontend and optimizer.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional

from app.core.database import get_db
from app.models.factory import Factory
from app.services.solar_estimator import SolarEstimator
from app.services.load_forecaster import LoadForecaster
from app.services.demand_risk import DemandRiskCalculator

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
