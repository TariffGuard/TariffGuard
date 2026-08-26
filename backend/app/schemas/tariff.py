from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime

class TariffBase(BaseModel):
    category: str
    period_name: str
    start_time: str
    end_time: str
    rate_pkr_per_kwh: float
    fixed_charge_pkr_per_kw: float = 0
    effective_from: date
    effective_to: Optional[date] = None
    source: str = "NEPRA"

class TariffCreate(TariffBase):
    pass

class TariffUpdate(BaseModel):
    category: Optional[str] = None
    period_name: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    rate_pkr_per_kwh: Optional[float] = None
    fixed_charge_pkr_per_kw: Optional[float] = None
    effective_from: Optional[date] = None
    effective_to: Optional[date] = None
    source: Optional[str] = None

class TariffResponse(TariffBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True