from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from app.core.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse
from app.api.auth import get_current_user, require_role
from app.services.auth import AuthService

router = APIRouter(prefix="/api/users", tags=["users"])

class UserRoleUpdate(BaseModel):
    role: str

@router.get("", response_model=List[UserResponse])
def get_users(
    factory_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all users. Only owner or manager can access this endpoint."""
    if current_user.role not in ["owner", "manager", "Owner", "Manager"]:
        raise HTTPException(status_code=403, detail="Not authorized to view users")
    
    query = db.query(User)
    if factory_id is not None:
        query = query.filter(User.factory_id == factory_id)
        
    return query.all()

@router.post("/invite", response_model=UserResponse)
def invite_user(
    user: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Invite a new user."""
    if current_user.role not in ["owner", "manager", "Owner", "Manager"]:
        raise HTTPException(status_code=403, detail="Not authorized to invite users")
    
    if current_user.role in ["manager", "Manager"] and user.role in ["owner", "Owner"]:
        raise HTTPException(status_code=403, detail="Managers cannot create owner accounts")
        
    existing = db.query(User).filter(
        (User.username == user.username) | (User.email == user.email)
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Username or email already exists")
    
    db_user = AuthService.create_user(
        db,
        username=user.username,
        email=user.email,
        password=user.password,
        role=user.role
    )
    db_user.factory_id = user.factory_id
    db.commit()
    db.refresh(db_user)
    
    return db_user

@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a user."""
    if current_user.role not in ["owner", "manager", "Owner", "Manager"]:
        raise HTTPException(status_code=403, detail="Not authorized to delete users")
        
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if current_user.id == target_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
        
    if current_user.role in ["manager", "Manager"] and target_user.role in ["owner", "Owner"]:
        raise HTTPException(status_code=403, detail="Managers cannot delete owner accounts")
        
    db.delete(target_user)
    db.commit()
    return {"message": "User deleted successfully"}

@router.put("/{user_id}/role", response_model=UserResponse)
def update_user_role(
    user_id: int,
    role_update: UserRoleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update user role. Only owners can do this."""
    if current_user.role not in ["owner", "Owner"]:
        raise HTTPException(status_code=403, detail="Only owners can change user roles")
        
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    target_user.role = role_update.role
    db.commit()
    db.refresh(target_user)
    return target_user
