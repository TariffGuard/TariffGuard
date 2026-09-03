from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date

from app.core.database import get_db
from app.models.tariff import Tariff
from app.schemas.tariff import TariffCreate, TariffResponse, TariffUpdate

router = APIRouter(prefix="/api/tariffs", tags=["tariffs"])

@router.post("/", response_model=TariffResponse)
def create_tariff(tariff: TariffCreate, db: Session = Depends(get_db)):
    """Create a new tariff period"""
    data = tariff.dict()
    if isinstance(data.get("effective_from"), str):
        try:
            data["effective_from"] = date.fromisoformat(data["effective_from"])
        except Exception:
            data["effective_from"] = date.today()
    elif not data.get("effective_from"):
        data["effective_from"] = date.today()
        
    if isinstance(data.get("effective_to"), str):
        try:
            data["effective_to"] = date.fromisoformat(data["effective_to"])
        except Exception:
            data["effective_to"] = None

    db_tariff = Tariff(**data)
    db.add(db_tariff)
    db.commit()
    db.refresh(db_tariff)
    return db_tariff

@router.get("/", response_model=List[TariffResponse])
def list_tariffs(
    category: Optional[str] = None,
    active_only: bool = False,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """List all tariffs with optional filters"""
    query = db.query(Tariff)
    
    if category:
        query = query.filter(Tariff.category == category)
    
    if active_only:
        today = date.today()
        query = query.filter(
            Tariff.effective_from <= today,
            (Tariff.effective_to.is_(None)) | (Tariff.effective_to >= today)
        )
    
    return query.offset(skip).limit(limit).all()

@router.get("/{tariff_id}", response_model=TariffResponse)
def get_tariff(tariff_id: int, db: Session = Depends(get_db)):
    """Get a specific tariff by ID"""
    tariff = db.query(Tariff).filter(Tariff.id == tariff_id).first()
    if not tariff:
        raise HTTPException(status_code=404, detail="Tariff not found")
    return tariff

@router.put("/{tariff_id}", response_model=TariffResponse)
def update_tariff(tariff_id: int, tariff: TariffUpdate, db: Session = Depends(get_db)):
    """Update a tariff"""
    db_tariff = db.query(Tariff).filter(Tariff.id == tariff_id).first()
    if not db_tariff:
        raise HTTPException(status_code=404, detail="Tariff not found")
    
    updates = tariff.dict(exclude_unset=True)
    if isinstance(updates.get("effective_from"), str):
        try:
            updates["effective_from"] = date.fromisoformat(updates["effective_from"])
        except Exception:
            pass
    if isinstance(updates.get("effective_to"), str):
        try:
            updates["effective_to"] = date.fromisoformat(updates["effective_to"])
        except Exception:
            pass

    for key, value in updates.items():
        setattr(db_tariff, key, value)
    
    db.commit()
    db.refresh(db_tariff)
    return db_tariff

@router.delete("/{tariff_id}")
def delete_tariff(tariff_id: int, db: Session = Depends(get_db)):
    """Delete a tariff"""
    db_tariff = db.query(Tariff).filter(Tariff.id == tariff_id).first()
    if not db_tariff:
        raise HTTPException(status_code=404, detail="Tariff not found")
    
    db.delete(db_tariff)
    db.commit()
    return {"message": "Tariff deleted successfully"}

@router.get("/active/{category}")
def get_active_tariff(category: str, db: Session = Depends(get_db)):
    """Get currently active tariff for a category"""
    today = date.today()
    tariff = db.query(Tariff).filter(
        Tariff.category == category,
        Tariff.effective_from <= today,
        (Tariff.effective_to.is_(None)) | (Tariff.effective_to >= today)
    ).first()
    
    if not tariff:
        raise HTTPException(status_code=404, detail="No active tariff found for this category")
    
    return tariff