from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.models.production_order import ProductionOrder
from app.schemas.production_order import ProductionOrderCreate, ProductionOrderResponse

router = APIRouter(prefix="/api/orders", tags=["orders"])

@router.post("/", response_model=ProductionOrderResponse)
def create_order(order: ProductionOrderCreate, db: Session = Depends(get_db)):
    db_order = ProductionOrder(**order.dict())
    db.add(db_order)
    db.commit()
    db.refresh(db_order)
    return db_order

@router.get("/", response_model=List[ProductionOrderResponse])
def list_orders(factory_id: int = None, status: str = None, db: Session = Depends(get_db)):
    query = db.query(ProductionOrder)
    if factory_id:
        query = query.filter(ProductionOrder.factory_id == factory_id)
    if status:
        query = query.filter(ProductionOrder.status == status)
    return query.all()

@router.get("/{order_id}", response_model=ProductionOrderResponse)
def get_order(order_id: int, db: Session = Depends(get_db)):
    order = db.query(ProductionOrder).filter(ProductionOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order