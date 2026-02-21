"""
Authentication Service
Business logic for user authentication and management
"""

from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
import uuid

from app.models.user import User, UserRole
from app.schemas.user import UserCreate, Token
from app.utils.security import verify_password, get_password_hash, create_access_token
from app.core.config import settings


class AuthService:
    """Authentication service for user management"""
    
    @staticmethod
    def authenticate_user(db: Session, employee_id: str, password: str) -> Optional[User]:
        """
        Authenticate user with employee ID and password
        
        Args:
            db: Database session
            employee_id: Employee ID
            password: Plain text password
            
        Returns:
            User object if authentication successful, None otherwise
        """
        user = db.query(User).filter(User.employee_id == employee_id).first()
        
        if not user:
            return None
        
        if not verify_password(password, user.hashed_password):
            return None
        
        # Update last login
        user.last_login = datetime.utcnow()
        db.commit()
        
        return user
    
    @staticmethod
    def create_access_token_for_user(user: User) -> Token:
        """
        Create JWT access token for user
        
        Args:
            user: User object
            
        Returns:
            Token object with access token
        """
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.employee_id},
            expires_delta=access_token_expires
        )
        
        return Token(access_token=access_token, token_type="bearer")
    
    @staticmethod
    def create_user(db: Session, user_data: UserCreate) -> User:
        """
        Create new user
        
        Args:
            db: Database session
            user_data: User creation data
            
        Returns:
            Created user object
        """
        # Check if employee ID already exists
        existing_user = db.query(User).filter(
            User.employee_id == user_data.employee_id
        ).first()
        
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Employee ID already registered"
            )
        
        # Check if email already exists
        existing_email = db.query(User).filter(User.email == user_data.email).first()
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Create new user
        db_user = User(
            id=str(uuid.uuid4()),
            employee_id=user_data.employee_id,
            name=user_data.name,
            email=user_data.email,
            department=user_data.department,
            role=user_data.role,
            face_image_url=user_data.face_image_url,
            hashed_password=get_password_hash(user_data.password),
            is_active=True
        )
        
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        
        return db_user
    
    @staticmethod
    def get_user_by_employee_id(db: Session, employee_id: str) -> Optional[User]:
        """
        Get user by employee ID
        
        Args:
            db: Database session
            employee_id: Employee ID
            
        Returns:
            User object or None
        """
        return db.query(User).filter(User.employee_id == employee_id).first()
    
    @staticmethod
    def get_all_users(db: Session, skip: int = 0, limit: int = 100) -> list[User]:
        """
        Get all users with pagination
        
        Args:
            db: Database session
            skip: Number of records to skip
            limit: Maximum number of records to return
            
        Returns:
            List of users
        """
        return db.query(User).offset(skip).limit(limit).all()
    
    @staticmethod
    def get_users_by_department(db: Session, department: str) -> list[User]:
        """
        Get users by department
        
        Args:
            db: Database session
            department: Department name
            
        Returns:
            List of users in department
        """
        return db.query(User).filter(User.department == department).all()


# Create service instance
auth_service = AuthService()
