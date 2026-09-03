from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class MachineBase(BaseModel):
    name: str
    machine_type: str
    power_kw: float
    min_run_minutes: int = 60
    setup_minutes: int = 0
    shiftable: bool = True
    priority: int = 1
    available_from: str = "08:00"
    available_to: str = "22:00"
    status: str = "running"
    manufacturer: Optional[str] = None
    model_name: Optional[str] = None
    maintenance_windows: Optional[List[str]] = None

class MachineCreate(MachineBase):
    factory_id: int

class MachineResponse(MachineBase):
    id: int
    factory_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True