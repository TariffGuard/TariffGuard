import hashlib
import secrets
from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session
from app.models.user import User

class AuthService:
    """Handle user authentication"""
    
    @staticmethod
    def hash_password(password: str, salt: str = None) -> tuple:
        """Hash password with salt"""
        if not salt:
            salt = secrets.token_hex(16)
        password_hash = hashlib.sha256((salt + password).encode()).hexdigest()
        return password_hash, salt
    
    @staticmethod
    def verify_password(password: str, salt: str, password_hash: str) -> bool:
        """Verify password"""
        computed_hash, _ = AuthService.hash_password(password, salt)
        return computed_hash == password_hash
    
    @staticmethod
    def create_user(db: Session, username: str, email: str, password: str, role: str = "viewer") -> User:
        """Create new user"""
        password_hash, salt = AuthService.hash_password(password)
        user = User(
            username=username,
            email=email,
            password_hash=f"{salt}:{password_hash}",
            role=role
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    
    @staticmethod
    def authenticate(db: Session, username: str, password: str) -> Optional[User]:
        """Authenticate user"""
        user = db.query(User).filter(User.username == username).first()
        if not user:
            return None
        
        salt, password_hash = user.password_hash.split(":")
        if AuthService.verify_password(password, salt, password_hash):
            user.last_login = datetime.now()
            db.commit()
            return user
        
        return None