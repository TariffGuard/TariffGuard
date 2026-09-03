from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.models.alert import Alert
from app.schemas.alert import AlertCreate, AlertResponse, AlertUpdate
from app.services.alert_service import AlertService
from app.api.auth import require_role, get_current_user
from app.models.user import User

router = APIRouter(prefix="/api/alerts", tags=["alerts"])

@router.get("/", response_model=List[AlertResponse])
def list_alerts(
    factory_id: int = None,
    severity: str = None,
    is_resolved: bool = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List alerts with filters"""
    query = db.query(Alert)
    
    if factory_id:
        query = query.filter(Alert.factory_id == factory_id)
    if severity:
        query = query.filter(Alert.severity == severity)
    if is_resolved is not None:
        query = query.filter(Alert.is_resolved == is_resolved)
    
    return query.order_by(Alert.created_at.desc()).limit(limit).all()

@router.post("/generate/{factory_id}", response_model=List[AlertResponse])
def generate_alerts(
    factory_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("manager"))
):
    """Generate alerts for a factory"""
    alerts = AlertService.generate_all_alerts(db, factory_id)
    return alerts

@router.get("/unresolved/{factory_id}", response_model=List[AlertResponse])
def get_unresolved_alerts(
    factory_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get unresolved alerts"""
    alerts = db.query(Alert).filter(
        Alert.factory_id == factory_id,
        Alert.is_resolved == False
    ).order_by(Alert.severity.desc(), Alert.created_at.desc()).all()
    
    return alerts

@router.put("/{alert_id}", response_model=AlertResponse)
def update_alert(
    alert_id: int,
    alert_update: AlertUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("manager"))
):
    """Update alert status"""
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    for key, value in alert_update.dict(exclude_unset=True).items():
        setattr(alert, key, value)
    
    if alert.is_resolved and not alert.resolved_at:
        from datetime import datetime
        alert.resolved_at = datetime.now()
    
    db.commit()
    db.refresh(alert)
    return alert

@router.get("/stats/{factory_id}")
def alert_stats(
    factory_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get alert statistics"""
    from sqlalchemy import func
    
    total = db.query(func.count(Alert.id)).filter(Alert.factory_id == factory_id).scalar()
    unresolved = db.query(func.count(Alert.id)).filter(
        Alert.factory_id == factory_id,
        Alert.is_resolved == False
    ).scalar()
    critical = db.query(func.count(Alert.id)).filter(
        Alert.factory_id == factory_id,
        Alert.severity == "critical",
        Alert.is_resolved == False
    ).scalar()
    
    return {
        "total": total,
        "unresolved": unresolved,
        "critical": critical,
        "resolved": total - unresolved
    }