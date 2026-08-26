from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.models.factory import Factory
from app.models.user import User
from app.schemas.factory import FactoryCreate, FactoryResponse, FactoryUpdate
from app.api.auth import require_role, get_current_user

router = APIRouter(prefix="/api/factories", tags=["factories"])

@router.post("/", response_model=FactoryResponse)
def create_factory(
    factory: FactoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("manager"))
):
    """Create factory - Manager or Owner only"""
    db_factory = Factory(**factory.dict())
    db.add(db_factory)
    db.commit()
    db.refresh(db_factory)
    return db_factory

@router.get("/", response_model=List[FactoryResponse])
def list_factories(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List factories - Any authenticated user"""
    factories = db.query(Factory).offset(skip).limit(limit).all()
    return factories

@router.get("/{factory_id}", response_model=FactoryResponse)
def get_factory(
    factory_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get factory - Any authenticated user"""
    factory = db.query(Factory).filter(Factory.id == factory_id).first()
    if not factory:
        raise HTTPException(status_code=404, detail="Factory not found")
    return factory

@router.put("/{factory_id}", response_model=FactoryResponse)
def update_factory(
    factory_id: int,
    factory: FactoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("manager"))
):
    """Update factory - Manager or Owner only"""
    db_factory = db.query(Factory).filter(Factory.id == factory_id).first()
    if not db_factory:
        raise HTTPException(status_code=404, detail="Factory not found")
    
    for key, value in factory.dict(exclude_unset=True).items():
        setattr(db_factory, key, value)
    
    db.commit()
    db.refresh(db_factory)
    return db_factory

@router.delete("/{factory_id}")
def delete_factory(
    factory_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("owner"))
):
    """Delete factory - Owner only"""
    db_factory = db.query(Factory).filter(Factory.id == factory_id).first()
    if not db_factory:
        raise HTTPException(status_code=404, detail="Factory not found")
    
    db.delete(db_factory)
    db.commit()
    return {"message": "Factory deleted successfully"}