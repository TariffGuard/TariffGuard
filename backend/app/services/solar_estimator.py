"""
Solar PV Estimation Service for TariffGuard

Estimates hourly solar PV output for a factory using weather radiation
data and the installed PV capacity.  Uses a transparent, physics-based
calculation — no ML model needed for this component.

Formula overview
----------------
    P_pv = G / G_stc × P_installed × η_system × f_temp

Where:
    G          = plane-of-array irradiance (W/m²) from weather data
    G_stc      = 1000 W/m²  (standard test conditions)
    P_installed = factory solar_capacity_kw
    η_system   = overall system efficiency (inverter + wiring + soiling)
    f_temp     = temperature derating factor
"""

import logging
from datetime import datetime
from typing import List, Dict, Optional

from sqlalchemy.orm import Session

from app.models.factory import Factory
from app.models.weather_reading import WeatherReading

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Physical constants / defaults
# ---------------------------------------------------------------------------
G_STC = 1000.0  # W/m² at standard test conditions
T_STC = 25.0  # °C cell temperature at STC
TEMP_COEFFICIENT = -0.004  # Typical poly-Si: −0.4 %/°C above 25 °C
DEFAULT_SYSTEM_EFFICIENCY = 0.85  # Inverter + wiring + soiling losses
NOCT_DELTA = 20.0  # °C cell temp rise above ambient at 800 W/m² (NOCT approx.)


class SolarEstimator:
    """
    Estimate hourly PV generation from weather radiation data.

    Usage::

        estimator = SolarEstimator(db, factory_id)
        hourly = estimator.estimate_period(start_dt, end_dt)
        # hourly = [{"timestamp": ..., "solar_kw": ..., "solar_kwh": ...}, ...]
    """

    def __init__(
        self,
        db: Session,
        factory_id: int,
        system_efficiency: float = DEFAULT_SYSTEM_EFFICIENCY,
    ):
        self.db = db
        self.factory_id = factory_id
        self.system_efficiency = system_efficiency

        # Load factory once
        self.factory: Optional[Factory] = (
            db.query(Factory)
            .filter(Factory.id == factory_id)
            .first()
        )
        if self.factory is None:
            raise ValueError(f"Factory {factory_id} not found")

        self.solar_capacity_kw = self.factory.solar_capacity_kw or 0

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def estimate_period(
        self,
        start: datetime,
        end: datetime,
    ) -> List[Dict]:
        """
        Return per-hour solar estimates for the given time range.

        Each dict contains:
            timestamp   — datetime
            solar_kw    — instantaneous PV output (kW)
            solar_kwh   — energy produced in the slot (kWh, ≈ kW × 1 h)
            irradiance_wm2 — input shortwave radiation
            cell_temp_c    — estimated cell temperature
            derating         — temperature derating factor (0–1)
        """
        if self.solar_capacity_kw <= 0:
            logger.warning(
                "Factory %d has solar_capacity_kw=0 — returning zeros",
                self.factory_id,
            )
            return self._zero_period(start, end)

        readings = (
            self.db.query(WeatherReading)
            .filter(
                WeatherReading.factory_id == self.factory_id,
                WeatherReading.timestamp >= start,
                WeatherReading.timestamp <= end,
            )
            .order_by(WeatherReading.timestamp)
            .all()
        )

        if not readings:
            logger.warning(
                "No weather data for factory %d in range %s–%s — using fallback",
                self.factory_id,
                start,
                end,
            )
            return self._fallback_period(start, end)

        results: List[Dict] = []
        for wx in readings:
            estimate = self._estimate_single(wx)
            results.append(estimate)

        return results

    def estimate_single(self, timestamp: datetime) -> Dict:
        """Estimate solar output for a single timestamp."""
        wx = (
            self.db.query(WeatherReading)
            .filter(
                WeatherReading.factory_id == self.factory_id,
                WeatherReading.timestamp == timestamp,
            )
            .first()
        )
        if wx is None:
            return self._fallback_single(timestamp)
        return self._estimate_single(wx)

    def total_solar_kwh(
        self, start: datetime, end: datetime
    ) -> float:
        """Return total estimated solar energy (kWh) for a period."""
        estimates = self.estimate_period(start, end)
        return round(sum(e["solar_kwh"] for e in estimates), 2)

    def solar_availability_profile(
        self, start: datetime, end: datetime
    ) -> Dict[int, float]:
        """
        Return average solar kW by hour-of-day over the given period.
        Useful for the optimizer to know typical solar windows.

        Returns: {hour: avg_solar_kw}
        """
        estimates = self.estimate_period(start, end)
        hourly_totals: Dict[int, List[float]] = {}
        for e in estimates:
            h = e["timestamp"].hour
            hourly_totals.setdefault(h, []).append(e["solar_kw"])

        return {
            h: round(sum(vals) / len(vals), 2) if vals else 0.0
            for h, vals in sorted(hourly_totals.items())
        }

    # ------------------------------------------------------------------
    # Core estimation
    # ------------------------------------------------------------------

    def _estimate_single(self, wx: WeatherReading) -> Dict:
        """Core physics-based PV output calculation for one weather row."""
        irradiance = wx.shortwave_radiation_wm2 or 0
        temp_ambient = wx.temperature_c or 30.0

        # Cell temperature approximation (NOCT model)
        cell_temp = temp_ambient + NOCT_DELTA * (irradiance / 800.0)

        # Temperature derating
        if cell_temp > T_STC:
            derating = 1.0 + TEMP_COEFFICIENT * (cell_temp - T_STC)
        else:
            derating = 1.0
        derating = max(0.0, min(1.0, derating))

        # PV output
        solar_kw = (
            (irradiance / G_STC)
            * self.solar_capacity_kw
            * self.system_efficiency
            * derating
        )
        solar_kw = max(0.0, round(solar_kw, 2))

        # For hourly slots, kWh ≈ kW × 1 h
        solar_kwh = round(solar_kw, 2)

        return {
            "timestamp": wx.timestamp,
            "solar_kw": solar_kw,
            "solar_kwh": solar_kwh,
            "irradiance_wm2": round(irradiance, 1),
            "cell_temp_c": round(cell_temp, 1),
            "derating": round(derating, 4),
        }

    # ------------------------------------------------------------------
    # Fallbacks
    # ------------------------------------------------------------------

    def _fallback_single(self, timestamp: datetime) -> Dict:
        """
        Simple bell-curve fallback when no weather data exists.
        Assumes clear-sky Faisalabad conditions.
        """
        hour = timestamp.hour
        if hour < 6 or hour > 19:
            solar_kw = 0.0
        else:
            import math

            solar_hour = hour - 6
            elevation = math.sin(math.pi * solar_hour / 13)
            clear_sky_irradiance = 900 * max(0, elevation)
            solar_kw = (
                (clear_sky_irradiance / G_STC)
                * self.solar_capacity_kw
                * self.system_efficiency
            )

        return {
            "timestamp": timestamp,
            "solar_kw": round(max(0, solar_kw), 2),
            "solar_kwh": round(max(0, solar_kw), 2),
            "irradiance_wm2": 0,
            "cell_temp_c": 0,
            "derating": 1.0,
            "source": "fallback_no_weather_data",
        }

    def _fallback_period(
        self, start: datetime, end: datetime
    ) -> List[Dict]:
        """Generate fallback estimates for every hour in the range."""
        from datetime import timedelta

        results = []
        current = start.replace(minute=0, second=0, microsecond=0)
        while current <= end:
            results.append(self._fallback_single(current))
            current += timedelta(hours=1)
        return results

    def _zero_period(
        self, start: datetime, end: datetime
    ) -> List[Dict]:
        """Return zero-output entries when solar capacity is 0."""
        from datetime import timedelta

        results = []
        current = start.replace(minute=0, second=0, microsecond=0)
        while current <= end:
            results.append(
                {
                    "timestamp": current,
                    "solar_kw": 0.0,
                    "solar_kwh": 0.0,
                    "irradiance_wm2": 0,
                    "cell_temp_c": 0,
                    "derating": 0.0,
                }
            )
            current += timedelta(hours=1)
        return results
