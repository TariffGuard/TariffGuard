from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.models.machine import Machine
from app.models.user import User
from app.schemas.machine import MachineCreate, MachineResponse
from app.api.auth import require_role, get_current_user

router = APIRouter(prefix="/api/machines", tags=["machines"])

@router.post("/", response_model=MachineResponse)
def create_machine(
    machine: MachineCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("manager"))
):
    """Create machine - Manager or Owner only"""
    db_machine = Machine(**machine.dict())
    db.add(db_machine)
    db.commit()
    db.refresh(db_machine)
    return db_machine

@router.get("/", response_model=List[MachineResponse])
def list_machines(
    factory_id: int = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List machines - Any authenticated user"""
    query = db.query(Machine)
    if factory_id:
        query = query.filter(Machine.factory_id == factory_id)
    return query.offset(skip).limit(limit).all()

@router.get("/{machine_id}", response_model=MachineResponse)
def get_machine(
    machine_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get machine - Any authenticated user"""
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")
    return machine

@router.delete("/{machine_id}")
def delete_machine(
    machine_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("manager"))
):
    """Delete machine - Manager or Owner only"""
    db_machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not db_machine:
        raise HTTPException(status_code=404, detail="Machine not found")
    
    db.delete(db_machine)
    db.commit()
    return {"message": "Machine deleted successfully"}