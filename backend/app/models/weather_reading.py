from sqlalchemy import Column, Integer, Float, DateTime, ForeignKey, String
from sqlalchemy.sql import func
from app.core.database import Base


class WeatherReading(Base):
    __tablename__ = "weather_readings"

    id = Column(Integer, primary_key=True, index=True)
    factory_id = Column(Integer, ForeignKey("factories.id"), nullable=False)
    timestamp = Column(DateTime, nullable=False)
    temperature_c = Column(Float, nullable=True)
    cloud_cover_pct = Column(Float, nullable=True)
    humidity_pct = Column(Float, nullable=True)
    precipitation_mm = Column(Float, nullable=True)
    wind_speed_kmh = Column(Float, nullable=True)
    shortwave_radiation_wm2 = Column(Float, nullable=True)
    direct_radiation_wm2 = Column(Float, nullable=True)
    diffuse_radiation_wm2 = Column(Float, nullable=True)
    source = Column(String(50), default="open_meteo")
    created_at = Column(DateTime, server_default=func.now())
