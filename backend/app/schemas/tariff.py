from pydantic import BaseModel
from typing import Optional, Any
from datetime import date, datetime

class TariffBase(BaseModel):
    category: str = "Industrial"
    period_name: str = "Off-Peak"
    start_time: str = "00:00"
    end_time: str = "24:00"
    rate_pkr_per_kwh: float = 0.0
    fixed_charge_pkr_per_kw: Optional[float] = 0.0
    effective_from: Optional[Any] = None
    effective_to: Optional[Any] = None
    source: Optional[str] = "NEPRA"

class TariffCreate(TariffBase):
    pass

class TariffUpdate(BaseModel):
    category: Optional[str] = None
    period_name: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    rate_pkr_per_kwh: Optional[float] = None
    fixed_charge_pkr_per_kw: Optional[float] = None
    effective_from: Optional[Any] = None
    effective_to: Optional[Any] = None
    source: Optional[str] = None

class TariffResponse(TariffBase):
    id: int
    created_at: Optional[Any] = None
    last_verified_at: Optional[Any] = None
    
    class Config:
        from_attributes = True