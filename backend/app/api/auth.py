from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
import secrets

from app.core.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserLogin, UserResponse, Token
from app.services.auth import AuthService

router = APIRouter(prefix="/api/auth", tags=["auth"])

# Simple token storage (in-memory)
active_tokens = {}

@router.post("/register", response_model=UserResponse)
def register(user: UserCreate, db: Session = Depends(get_db)):
    """Register a new user"""
    # Check if username or email already exists
    existing = db.query(User).filter(
        (User.username == user.username) | (User.email == user.email)
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Username or email already exists")
    
    # Create user
    db_user = AuthService.create_user(
        db,
        username=user.username,
        email=user.email,
        password=user.password,
        role=user.role
    )
    
    return db_user

@router.post("/login", response_model=Token)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    """Login user"""
    user = AuthService.authenticate(db, credentials.username, credentials.password)
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    # Generate token
    token = secrets.token_urlsafe(32)
    active_tokens[token] = user.id
    
    return Token(
        access_token=token,
        user=user
    )

@router.post("/logout")
def logout(authorization: str = Header(None)):
    """Logout user"""
    if authorization and authorization.startswith("Bearer "):
        token = authorization.replace("Bearer ", "")
        active_tokens.pop(token, None)
    
    return {"message": "Logged out successfully"}

def get_current_user(
    authorization: str = Header(None),
    db: Session = Depends(get_db)
) -> User:
    """Dependency to get current user from token"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = authorization.replace("Bearer ", "")
    user_id = active_tokens.get(token)
    
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    return user

def require_role(role: str):
    """Dependency to require specific role"""
    def role_checker(current_user: User = Depends(get_current_user)):
        if current_user.role != role and current_user.role != "owner":
            raise HTTPException(status_code=403, detail=f"Requires {role} role")
        return current_user
    return role_checker