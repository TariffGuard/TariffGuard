from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey
from sqlalchemy.sql import func
from app.core.database import Base

class Alert(Base):
    __tablename__ = "alerts"
    
    id = Column(Integer, primary_key=True, index=True)
    factory_id = Column(Integer, ForeignKey("factories.id"), nullable=False)
    type = Column(String(50), nullable=False)  # peak_demand, deadline, low_solar, high_consumption
    severity = Column(String(20), default="warning")  # info, warning, critical
    message = Column(String(500), nullable=False)
    value = Column(Float, nullable=True)
    threshold = Column(Float, nullable=True)
    is_read = Column(Boolean, default=False)
    is_resolved = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())
    resolved_at = Column(DateTime, nullable=True)