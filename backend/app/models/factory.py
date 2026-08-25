from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean
from sqlalchemy.sql import func
from app.core.database import Base

class Factory(Base):
    __tablename__ = "factories"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    location = Column(String(100), default="Faisalabad")
    tariff_category = Column(String(50), nullable=False, default="Industrial")
    sanctioned_load_kw = Column(Float, nullable=False)
    solar_capacity_kw = Column(Float, default=0)
    operating_hours = Column(String(50), default="08:00-22:00")
    working_days = Column(String(50), default="Mon-Sat")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())