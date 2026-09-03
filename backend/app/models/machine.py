from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from app.core.database import Base

class Machine(Base):
    __tablename__ = "machines"
    
    id = Column(Integer, primary_key=True, index=True)
    factory_id = Column(Integer, ForeignKey("factories.id"), nullable=False)
    name = Column(String(100), nullable=False)
    machine_type = Column(String(50), nullable=False)  # e.g., Dyeing, Spinning
    power_kw = Column(Float, nullable=False)
    min_run_minutes = Column(Integer, default=60)
    setup_minutes = Column(Integer, default=0)
    shiftable = Column(Boolean, default=True)
    priority = Column(Integer, default=1)  # 1=High, 2=Medium, 3=Low
    available_from = Column(String(10), default="08:00")
    available_to = Column(String(10), default="22:00")
    status = Column(String(20), default="running")
    manufacturer = Column(String(100), nullable=True)
    model_name = Column(String(100), nullable=True)
    maintenance_windows = Column(JSON, nullable=True)  # List of time ranges
    created_at = Column(DateTime, server_default=func.now())