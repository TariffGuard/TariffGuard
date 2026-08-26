from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.models.production_order import ProductionOrder
from app.models.user import User
from app.schemas.production_order import ProductionOrderCreate, ProductionOrderResponse
from app.api.auth import require_role, get_current_user

router = APIRouter(prefix="/api/orders", tags=["orders"])

@router.post("/", response_model=ProductionOrderResponse)
def create_order(
    order: ProductionOrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("manager"))
):
    """Create order - Manager or Owner only"""
    db_order = ProductionOrder(**order.dict())
    db.add(db_order)
    db.commit()
    db.refresh(db_order)
    return db_order

@router.get("/", response_model=List[ProductionOrderResponse])
def list_orders(
    factory_id: int = None,
    status: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List orders - Any authenticated user"""
    query = db.query(ProductionOrder)
    if factory_id:
        query = query.filter(ProductionOrder.factory_id == factory_id)
    if status:
        query = query.filter(ProductionOrder.status == status)
    return query.all()

@router.get("/{order_id}", response_model=ProductionOrderResponse)
def get_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get order - Any authenticated user"""
    order = db.query(ProductionOrder).filter(ProductionOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order

@router.delete("/{order_id}")
def delete_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("manager"))
):
    """Delete order - Manager or Owner only"""
    db_order = db.query(ProductionOrder).filter(ProductionOrder.id == order_id).first()
    if not db_order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    db.delete(db_order)
    db.commit()
    return {"message": "Order deleted successfully"}