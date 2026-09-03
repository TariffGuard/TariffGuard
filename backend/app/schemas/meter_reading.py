from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class MeterReadingBase(BaseModel):
    timestamp: datetime
    kwh: float
    kw: Optional[float] = None
    solar_kwh: float = 0
    voltage: Optional[float] = None
    current: Optional[float] = None
    power_factor: Optional[float] = None

class MeterReadingCreate(MeterReadingBase):
    factory_id: int

class MeterReadingResponse(MeterReadingBase):
    id: int
    factory_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class MeterReadingBulkCreate(BaseModel):
    factory_id: int
    readings: list[MeterReadingBase]