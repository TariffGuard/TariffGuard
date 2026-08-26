from sqlalchemy import Column, Integer, Float, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.core.database import Base

class MeterReading(Base):
    __tablename__ = "meter_readings"
    
    id = Column(Integer, primary_key=True, index=True)
    factory_id = Column(Integer, ForeignKey("factories.id"), nullable=False)
    timestamp = Column(DateTime, nullable=False)
    kwh = Column(Float, nullable=False)
    kw = Column(Float, nullable=True)
    solar_kwh = Column(Float, default=0)
    voltage = Column(Float, nullable=True)
    current = Column(Float, nullable=True)
    power_factor = Column(Float, nullable=True)
    created_at = Column(DateTime, server_default=func.now())