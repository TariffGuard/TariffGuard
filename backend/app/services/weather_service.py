"""
Weather Data Service for TariffGuard
Fetches historical weather and solar radiation data from Open-Meteo
for Faisalabad, Pakistan. Falls back to synthetic generation if the
API is unreachable.
"""

import math
import random
import logging
from datetime import datetime, timedelta, date
from typing import List, Dict, Optional

import httpx

from sqlalchemy.orm import Session
from app.models.weather_reading import WeatherReading

logger = logging.getLogger(__name__)

# Faisalabad coordinates
FAISALABAD_LAT = 31.4167
FAISALABAD_LON = 73.0833
FAISALABAD_TZ = "Asia/Karachi"

OPEN_METEO_ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive"
OPEN_METEO_FORECAST_URL = "https://api.open-meteo.com/v1/forecast"

HOURLY_PARAMS = [
    "temperature_2m",
    "relative_humidity_2m",
    "precipitation",
    "cloud_cover",
    "wind_speed_10m",
    "shortwave_radiation",
    "direct_radiation",
    "diffuse_radiation",
]

# Open-Meteo caps requests at ~31 days per call.  We chunk accordingly.
_MAX_DAYS_PER_REQUEST = 30


class WeatherService:
    """Fetch and persist weather data for a factory."""

    def __init__(self, db: Session, factory_id: int):
        self.db = db
        self.factory_id = factory_id

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def fetch_and_store(
        self,
        start_date: date,
        end_date: date,
        lat: float = FAISALABAD_LAT,
        lon: float = FAISALABAD_LON,
    ) -> List[Dict]:
        """
        Fetch hourly weather from Open-Meteo for the given date range
        and store rows in the weather_readings table.

        Returns the list of weather dicts (same shape regardless of source).
        """
        raw = self._fetch_open_meteo(start_date, end_date, lat, lon)

        if raw is None:
            logger.warning(
                "Open-Meteo unavailable — generating synthetic weather for %s to %s",
                start_date,
                end_date,
            )
            raw = self._generate_synthetic(start_date, end_date)

        records = self._to_records(raw)
        self._persist(records)
        return records

    def get_readings(
        self,
        start: Optional[datetime] = None,
        end: Optional[datetime] = None,
    ) -> List[WeatherReading]:
        """Query persisted weather readings with optional time filter."""
        q = self.db.query(WeatherReading).filter(
            WeatherReading.factory_id == self.factory_id
        )
        if start:
            q = q.filter(WeatherReading.timestamp >= start)
        if end:
            q = q.filter(WeatherReading.timestamp <= end)
        return q.order_by(WeatherReading.timestamp).all()

    # ------------------------------------------------------------------
    # Open-Meteo fetch
    # ------------------------------------------------------------------

    def _fetch_open_meteo(
        self,
        start_date: date,
        end_date: date,
        lat: float,
        lon: float,
    ) -> Optional[Dict]:
        """
        Call the Open-Meteo archive or forecast API. Returns a merged dict with
        keys 'time', 'temperature_2m', etc. or None on failure.
        """
        chunks = self._chunk_dates(start_date, end_date)
        merged: Dict = {p: [] for p in HOURLY_PARAMS}
        merged["time"] = []
        today = date.today()

        try:
            with httpx.Client(timeout=30) as client:
                for chunk_start, chunk_end in chunks:
                    # Choose forecast API for today/future dates, archive API for past dates
                    api_url = (
                        OPEN_METEO_FORECAST_URL
                        if chunk_end >= today
                        else OPEN_METEO_ARCHIVE_URL
                    )
                    params = {
                        "latitude": lat,
                        "longitude": lon,
                        "start_date": chunk_start.isoformat(),
                        "end_date": chunk_end.isoformat(),
                        "hourly": ",".join(HOURLY_PARAMS),
                        "timezone": FAISALABAD_TZ,
                    }
                    resp = client.get(api_url, params=params)
                    resp.raise_for_status()
                    data = resp.json()

                    hourly = data.get("hourly", {})
                    times = hourly.get("time", [])
                    if not times:
                        logger.warning(
                            "Empty hourly data for chunk %s–%s",
                            chunk_start,
                            chunk_end,
                        )
                        return None

                    merged["time"].extend(times)
                    for param in HOURLY_PARAMS:
                        values = hourly.get(param, [])
                        # Replace None with 0 for radiation fields
                        if param in (
                            "shortwave_radiation",
                            "direct_radiation",
                            "diffuse_radiation",
                        ):
                            values = [v if v is not None else 0 for v in values]
                        merged[param].extend(values)

            if not merged["time"]:
                return None
            return merged

        except (httpx.HTTPError, httpx.TimeoutException, KeyError) as exc:
            logger.error("Open-Meteo fetch failed: %s", exc)
            return None

    # ------------------------------------------------------------------
    # Synthetic fallback
    # ------------------------------------------------------------------

    def _generate_synthetic(
        self, start_date: date, end_date: date
    ) -> Dict:
        """
        Generate realistic synthetic weather data for Faisalabad when
        the API is unavailable.  Models seasonal temperature, monsoon
        humidity and a bell-curve solar radiation profile.
        """
        times: List[str] = []
        temperature: List[float] = []
        humidity: List[float] = []
        precipitation: List[float] = []
        cloud_cover: List[float] = []
        wind_speed: List[float] = []
        shortwave: List[float] = []
        direct_rad: List[float] = []
        diffuse_rad: List[float] = []

        current = datetime.combine(start_date, datetime.min.time())
        end_dt = datetime.combine(end_date, datetime.min.time()) + timedelta(
            hours=23
        )

        while current <= end_dt:
            hour = current.hour
            day_of_year = current.timetuple().tm_yday

            # --- Temperature (°C) ---
            # Faisalabad: summer 35-45°C, winter 8-22°C
            seasonal_base = 26.5 + 14 * math.sin(
                math.radians((day_of_year - 100) * 360 / 365)
            )
            diurnal = -5 * math.cos(
                math.radians((hour - 14) * 15)
            )  # peak at 14:00
            temp = seasonal_base + diurnal + random.gauss(0, 1.5)

            # --- Cloud cover (%) ---
            # Monsoon Jul-Sep higher cloud, otherwise clearer
            is_monsoon = 182 <= day_of_year <= 273  # Jul–Sep
            base_cloud = 35 if is_monsoon else 15
            cloud = max(
                0, min(100, base_cloud + random.gauss(0, 15))
            )

            # --- Humidity (%) ---
            base_humidity = 55 if is_monsoon else 35
            hum = max(
                10,
                min(100, base_humidity + 10 * math.cos(math.radians(hour * 15)) + random.gauss(0, 8)),
            )

            # --- Precipitation (mm) ---
            precip = 0.0
            if is_monsoon and random.random() < 0.15:
                precip = round(random.expovariate(0.3), 1)

            # --- Wind speed (km/h) ---
            wind = max(0, 8 + random.gauss(0, 4))

            # --- Solar radiation (W/m²) ---
            sw, dr, dfr = self._solar_radiation(hour, cloud)

            times.append(current.strftime("%Y-%m-%dT%H:%M"))
            temperature.append(round(temp, 1))
            humidity.append(round(hum, 1))
            precipitation.append(precip)
            cloud_cover.append(round(cloud, 1))
            wind_speed.append(round(wind, 1))
            shortwave.append(round(sw, 1))
            direct_rad.append(round(dr, 1))
            diffuse_rad.append(round(dfr, 1))

            current += timedelta(hours=1)

        return {
            "time": times,
            "temperature_2m": temperature,
            "relative_humidity_2m": humidity,
            "precipitation": precipitation,
            "cloud_cover": cloud_cover,
            "wind_speed_10m": wind_speed,
            "shortwave_radiation": shortwave,
            "direct_radiation": direct_rad,
            "diffuse_radiation": diffuse_rad,
        }

    @staticmethod
    def _solar_radiation(
        hour: int, cloud_cover_pct: float
    ) -> tuple:
        """
        Estimate shortwave, direct and diffuse radiation for Faisalabad
        based on hour-of-day and cloud cover.

        Peak clear-sky shortwave ≈ 950 W/m² at solar noon (~12:30 PKT).
        """
        if hour < 6 or hour > 19:
            return 0.0, 0.0, 0.0

        # Solar elevation approximation for latitude 31.4°
        solar_hour = hour - 6  # 0 at sunrise, 13 at sunset
        peak_hour = 6.5  # ~12:30 PKT
        elevation_factor = math.sin(
            math.pi * solar_hour / 13
        )  # 0→1→0 bell curve
        clear_sky_peak = 950  # W/m² for Faisalabad summer

        clear_sky = clear_sky_peak * max(0, elevation_factor)

        # Cloud attenuation: simple Kasten-Czeckaj approximation
        cloud_fraction = cloud_cover_pct / 100
        attenuation = 1 - 0.75 * (cloud_fraction ** 3.4)
        attenuation = max(0.15, attenuation)  # never fully zero during day

        shortwave = clear_sky * attenuation
        # Split into direct and diffuse
        direct = shortwave * (1 - 0.3 * cloud_fraction)
        diffuse = shortwave - direct

        return shortwave, direct, diffuse

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _to_records(self, raw: Dict) -> List[Dict]:
        """Convert merged Open-Meteo/synthetic dict to list of row dicts."""
        times = raw["time"]
        records = []
        for i, t in enumerate(times):
            ts = datetime.fromisoformat(t)
            records.append(
                {
                    "factory_id": self.factory_id,
                    "timestamp": ts,
                    "temperature_c": raw["temperature_2m"][i],
                    "cloud_cover_pct": raw["cloud_cover"][i],
                    "humidity_pct": raw["relative_humidity_2m"][i],
                    "precipitation_mm": raw["precipitation"][i],
                    "wind_speed_kmh": raw["wind_speed_10m"][i],
                    "shortwave_radiation_wm2": raw["shortwave_radiation"][i],
                    "direct_radiation_wm2": raw["direct_radiation"][i],
                    "diffuse_radiation_wm2": raw["diffuse_radiation"][i],
                    "source": "open_meteo",
                }
            )
        return records

    def _persist(self, records: List[Dict]) -> None:
        """Upsert weather records (skip duplicates by timestamp)."""
        if not records:
            return

        timestamps = [r["timestamp"] for r in records]
        existing = {
            row.timestamp
            for row in self.db.query(WeatherReading.timestamp)
            .filter(
                WeatherReading.factory_id == self.factory_id,
                WeatherReading.timestamp.in_(timestamps),
            )
            .all()
        }

        new_records = [
            WeatherReading(**r) for r in records if r["timestamp"] not in existing
        ]
        if new_records:
            self.db.bulk_save_objects(new_records)
            self.db.commit()
            logger.info("Stored %d new weather readings", len(new_records))
        else:
            logger.info("All weather readings already exist — nothing to insert")

    @staticmethod
    def _chunk_dates(
        start: date, end: date, max_days: int = _MAX_DAYS_PER_REQUEST
    ) -> List[tuple]:
        """Split a date range into chunks of at most *max_days* days."""
        chunks = []
        current = start
        while current <= end:
            chunk_end = min(current + timedelta(days=max_days - 1), end)
            chunks.append((current, chunk_end))
            current = chunk_end + timedelta(days=1)
        return chunks
