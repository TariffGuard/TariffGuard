from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Dict, Any

from app.core.database import get_db
from app.models.factory import Factory
from app.models.machine import Machine
from app.models.production_order import ProductionOrder
from app.models.tariff import Tariff
from app.models.meter_reading import MeterReading

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

@router.get("/summary")
def get_dashboard_summary(db: Session = Depends(get_db)):
    """Get overall dashboard summary"""
    total_factories = db.query(func.count(Factory.id)).scalar()
    total_machines = db.query(func.count(Machine.id)).scalar()
    total_orders = db.query(func.count(ProductionOrder.id)).scalar()
    total_tariffs = db.query(func.count(Tariff.id)).scalar()
    total_readings = db.query(func.count(MeterReading.id)).scalar()
    
    # Order status breakdown
    pending_orders = db.query(func.count(ProductionOrder.id)).filter(ProductionOrder.status == "pending").scalar()
    running_orders = db.query(func.count(ProductionOrder.id)).filter(ProductionOrder.status == "running").scalar()
    completed_orders = db.query(func.count(ProductionOrder.id)).filter(ProductionOrder.status == "completed").scalar()
    
    return {
        "totals": {
            "factories": total_factories,
            "machines": total_machines,
            "orders": total_orders,
            "tariffs": total_tariffs,
            "meter_readings": total_readings
        },
        "order_status": {
            "pending": pending_orders,
            "running": running_orders,
            "completed": completed_orders
        }
    }

@router.get("/factory/{factory_id}")
def get_factory_dashboard(factory_id: int, db: Session = Depends(get_db)):
    """Get dashboard for specific factory"""
    factory = db.query(Factory).filter(Factory.id == factory_id).first()
    if not factory:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Factory not found")
    
    machines = db.query(func.count(Machine.id)).filter(Machine.factory_id == factory_id).scalar()
    orders = db.query(func.count(ProductionOrder.id)).filter(ProductionOrder.factory_id == factory_id).scalar()
    
    # Energy stats
    energy_stats = db.query(
        func.sum(MeterReading.kwh).label('total_kwh'),
        func.max(MeterReading.kw).label('peak_kw'),
        func.sum(MeterReading.solar_kwh).label('total_solar_kwh')
    ).filter(MeterReading.factory_id == factory_id).first()
    
    return {
        "factory": {
            "id": factory.id,
            "name": factory.name,
            "location": factory.location,
            "sanctioned_load_kw": factory.sanctioned_load_kw,
            "solar_capacity_kw": factory.solar_capacity_kw
        },
        "counts": {
            "machines": machines,
            "orders": orders
        },
        "energy": {
            "total_kwh": round(energy_stats.total_kwh or 0, 2) if energy_stats else 0,
            "peak_kw": round(energy_stats.peak_kw or 0, 2) if energy_stats else 0,
            "total_solar_kwh": round(energy_stats.total_solar_kwh or 0, 2) if energy_stats else 0
        }
    }