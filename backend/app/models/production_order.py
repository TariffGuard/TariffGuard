from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from app.core.database import Base

class ProductionOrder(Base):
    __tablename__ = "production_orders"
    
    id = Column(Integer, primary_key=True, index=True)
    factory_id = Column(Integer, ForeignKey("factories.id"), nullable=False)
    order_no = Column(String(50), unique=True, nullable=False)
    process = Column(String(50), nullable=False)
    quantity = Column(Float, nullable=False)
    duration_minutes = Column(Integer, nullable=False)
    earliest_start = Column(DateTime, nullable=True)
    deadline = Column(DateTime, nullable=False)
    priority = Column(Integer, default=2)
    machine_options = Column(JSON, nullable=True)
    locked = Column(Boolean, default=False)
    status = Column(String(20), default="pending")
    created_at = Column(DateTime, server_default=func.now())