"""
User Model
Defines employee/user database schema
"""

from sqlalchemy import Column, String, Boolean, DateTime, Enum as SQLEnum, JSON
from sqlalchemy.sql import func
from datetime import datetime
import enum

from app.core.database import Base


class UserRole(str, enum.Enum):
    """User role enumeration"""
    EMPLOYEE = "EMPLOYEE"
    HR = "HR"


class User(Base):
    """User/Employee model"""
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, index=True)  # UUID
    employee_id = Column(String, unique=True, index=True, nullable=False)  # EMP-101, HR-001
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String, nullable=False)
    department = Column(String, nullable=False)
    role = Column(SQLEnum(UserRole), default=UserRole.EMPLOYEE, nullable=False)
    is_active = Column(Boolean, default=True)
    face_image_url = Column(String, nullable=True)
    device_pins = Column(JSON, nullable=True, default=dict)  # Store device-specific PINs as JSON
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_login = Column(DateTime(timezone=True))
    
    def __repr__(self):
        return f"<User {self.employee_id} - {self.name}>"
