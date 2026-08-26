from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional

from app.core.database import get_db
from app.services.optimizer import ScheduleOptimizer

router = APIRouter(prefix="/api/optimize", tags=["optimization"])

@router.post("/schedule/{factory_id}")
def optimize_schedule(
    factory_id: int,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    db: Session = Depends(get_db)
):
    """Generate optimized schedule for a factory"""
    
    # Default to next 24 hours if not specified
    if not start_time:
        start_time = datetime.now().replace(minute=0, second=0, microsecond=0)
    if not end_time:
        end_time = start_time + timedelta(hours=24)
    
    optimizer = ScheduleOptimizer(db)
    result = optimizer.create_optimized_schedule(factory_id, start_time, end_time)
    
    return result

@router.post("/compare/{factory_id}")
def compare_schedules(
    factory_id: int,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    db: Session = Depends(get_db)
):
    """Compare baseline vs optimized schedule"""
    
    if not start_time:
        start_time = datetime.now().replace(minute=0, second=0, microsecond=0)
    if not end_time:
        end_time = start_time + timedelta(hours=24)
    
    optimizer = ScheduleOptimizer(db)
    result = optimizer.compare_baseline_vs_optimized(factory_id, start_time, end_time)
    
    return result