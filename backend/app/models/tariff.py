from sqlalchemy import Column, Integer, String, Float, DateTime, Date
from sqlalchemy.sql import func
from app.core.database import Base

class Tariff(Base):
    __tablename__ = "tariffs"
    
    id = Column(Integer, primary_key=True, index=True)
    category = Column(String(50), nullable=False)  # e.g., Industrial
    period_name = Column(String(50), nullable=False)  # e.g., Peak, Off-Peak
    start_time = Column(String(10), nullable=False)  # e.g., "18:00"
    end_time = Column(String(10), nullable=False)  # e.g., "22:00"
    rate_pkr_per_kwh = Column(Float, nullable=False)
    fixed_charge_pkr_per_kw = Column(Float, default=0)
    effective_from = Column(Date, nullable=False)
    effective_to = Column(Date, nullable=True)
    source = Column(String(200), default="NEPRA")
    last_verified_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())