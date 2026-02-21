"""
User Schemas
Pydantic models for user/employee data validation
"""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
from app.models.user import UserRole


class UserBase(BaseModel):
    """Base user schema"""
    employee_id: str = Field(..., description="Employee ID (e.g., EMP-101)")
    name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    department: str = Field(..., min_length=1, max_length=100)
    role: UserRole = UserRole.EMPLOYEE
    face_image_url: Optional[str] = Field(None, description="URL to enrolled face image")


class UserCreate(UserBase):
    """Schema for creating a new user"""
    password: str = Field(..., min_length=6, max_length=100)


class UserUpdate(BaseModel):
    """Schema for updating user information"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    email: Optional[EmailStr] = None
    department: Optional[str] = Field(None, min_length=1, max_length=100)
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
    password: Optional[str] = Field(None, min_length=6, max_length=100)
    face_image_url: Optional[str] = Field(None, description="URL to enrolled face image")


class UserResponse(UserBase):
    """Schema for user response"""
    id: str
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    last_login: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class Token(BaseModel):
    """JWT token response"""
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """Token payload data"""
    user_id: Optional[str] = None


class LoginRequest(BaseModel):
    """Login request schema"""
    employee_id: str = Field(..., description="Employee ID")
    password: str = Field(..., description="Password")

class LoginResponse(BaseModel):
    """Login response with token"""
    access_token: str = Field(..., description="JWT access token")
    token_type: str = Field(default="bearer", description="Token type")
    user: Optional[UserResponse] = Field(None, description="User information")