from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.models.machine import Machine
from app.schemas.machine import MachineCreate, MachineResponse

router = APIRouter(prefix="/api/machines", tags=["machines"])

@router.post("/", response_model=MachineResponse)
def create_machine(machine: MachineCreate, db: Session = Depends(get_db)):
    db_machine = Machine(**machine.dict())
    db.add(db_machine)
    db.commit()
    db.refresh(db_machine)
    return db_machine

@router.get("/", response_model=List[MachineResponse])
def list_machines(factory_id: int = None, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    query = db.query(Machine)
    if factory_id:
        query = query.filter(Machine.factory_id == factory_id)
    return query.offset(skip).limit(limit).all()

@router.get("/{machine_id}", response_model=MachineResponse)
def get_machine(machine_id: int, db: Session = Depends(get_db)):
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")
    return machine