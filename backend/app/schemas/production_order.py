from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class ProductionOrderBase(BaseModel):
    order_no: str
    process: str
    quantity: float
    duration_minutes: int
    earliest_start: Optional[datetime] = None
    deadline: datetime
    priority: int = 2
    machine_options: Optional[List[int]] = None
    locked: bool = False

class ProductionOrderCreate(ProductionOrderBase):
    factory_id: int

class ProductionOrderResponse(ProductionOrderBase):
    id: int
    factory_id: int
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True