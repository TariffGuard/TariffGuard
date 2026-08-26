from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class FactoryBase(BaseModel):
    name: str
    location: str = "Faisalabad"
    tariff_category: str = "Industrial"
    sanctioned_load_kw: float
    solar_capacity_kw: float = 0
    operating_hours: str = "08:00-22:00"
    working_days: str = "Mon-Sat"

class FactoryCreate(FactoryBase):
    pass

class FactoryUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    tariff_category: Optional[str] = None
    sanctioned_load_kw: Optional[float] = None
    solar_capacity_kw: Optional[float] = None
    operating_hours: Optional[str] = None
    working_days: Optional[str] = None

class FactoryResponse(FactoryBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True