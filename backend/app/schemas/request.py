"""
Request Schemas
Pydantic models for request data validation
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from app.models.request import RequestStatus, RegularizationType


# Regularization Request Schemas
class RegularizationRequestBase(BaseModel):
    """Base regularization request schema"""
    employee_id: str
    date: str = Field(..., pattern="^\\d{4}-\\d{2}-\\d{2}$")
    type: RegularizationType
    actual_time: Optional[str] = None
    requested_login_time: Optional[str] = None
    requested_logout_time: Optional[str] = None
    reason: str = Field(..., min_length=1)
    remarks: Optional[str] = None


class RegularizationRequestCreate(RegularizationRequestBase):
    """Schema for creating regularization request"""
    pass


class RegularizationRequestResponse(RegularizationRequestBase):
    """Schema for regularization request response"""
    id: str
    status: RequestStatus
    manager_name: Optional[str] = None
    decision_date: Optional[datetime] = None
    submitted_date: datetime
    
    class Config:
        from_attributes = True


# Shift Change Request Schemas
class ShiftChangeRequestBase(BaseModel):
    """Base shift change request schema"""
    employee_id: str
    current_shift_id: str
    requested_shift_id: str
    date: str = Field(..., pattern="^\\d{4}-\\d{2}-\\d{2}$")
    reason: str = Field(..., min_length=1)


class ShiftChangeRequestCreate(ShiftChangeRequestBase):
    """Schema for creating shift change request"""
    pass


class ShiftChangeRequestResponse(ShiftChangeRequestBase):
    """Schema for shift change request response"""
    id: str
    status: RequestStatus
    manager_name: Optional[str] = None
    decision_date: Optional[datetime] = None
    submitted_date: datetime
    
    class Config:
        from_attributes = True


# Overtime Request Schemas
class OvertimeRequestBase(BaseModel):
    """Base overtime request schema"""
    employee_id: str
    date: str = Field(..., pattern="^\\d{4}-\\d{2}-\\d{2}$")
    hours: float = Field(..., gt=0, le=12)
    reason: str = Field(..., min_length=1)


class OvertimeRequestCreate(OvertimeRequestBase):
    """Schema for creating overtime request"""
    pass


class OvertimeRequestResponse(OvertimeRequestBase):
    """Schema for overtime request response"""
    id: str
    status: RequestStatus
    manager_name: Optional[str] = None
    decision_date: Optional[datetime] = None
    submitted_date: datetime
    
    class Config:
        from_attributes = True


# Permission Request Schemas
class PermissionRequestBase(BaseModel):
    """Base permission request schema"""
    employee_id: str
    date: str = Field(..., pattern="^\\d{4}-\\d{2}-\\d{2}$")
    start_time: str = Field(..., pattern="^([01]?[0-9]|2[0-3]):[0-5][0-9]$")
    end_time: str = Field(..., pattern="^([01]?[0-9]|2[0-3]):[0-5][0-9]$")
    reason: str = Field(..., min_length=1)


class PermissionRequestCreate(PermissionRequestBase):
    """Schema for creating permission request"""
    pass


class PermissionRequestResponse(PermissionRequestBase):
    """Schema for permission request response"""
    id: str
    status: RequestStatus
    manager_name: Optional[str] = None
    decision_date: Optional[datetime] = None
    submitted_date: datetime
    
    class Config:
        from_attributes = True


# Request Approval Schema
class RequestApproval(BaseModel):
    """Schema for approving/rejecting requests"""
    status: RequestStatus = Field(..., description="APPROVED, REJECTED, or CANCELLED")
    remarks: Optional[str] = None
