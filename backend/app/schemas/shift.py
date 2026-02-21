"""
Shift Schemas
Pydantic models for shift data validation
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class ShiftBase(BaseModel):
    """Base shift schema"""
    id: str = Field(..., description="Shift ID (e.g., shift_1)")
    name: str = Field(..., description="Shift name (e.g., Shift1)")
    start_time: str = Field(..., pattern="^([01]?[0-9]|2[0-3]):[0-5][0-9]$")
    end_time: str = Field(..., pattern="^([01]?[0-9]|2[0-3]):[0-5][0-9]$")
    description: Optional[str] = None


class ShiftCreate(ShiftBase):
    """Schema for creating shift"""
    pass


class ShiftResponse(ShiftBase):
    """Schema for shift response"""
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class ShiftAssignmentBase(BaseModel):
    """Base shift assignment schema"""
    employee_id: str
    shift_id: str
    date: str = Field(..., pattern="^\\d{4}-\\d{2}-\\d{2}$")


class ShiftAssignmentCreate(ShiftAssignmentBase):
    """Schema for creating shift assignment"""
    effective_from: Optional[datetime] = None
    effective_to: Optional[datetime] = None
    assigned_by: Optional[str] = None


class ShiftAssignmentResponse(ShiftAssignmentBase):
    """Schema for shift assignment response"""
    id: str
    effective_from: datetime
    effective_to: Optional[datetime] = None
    created_at: datetime
    assigned_by: Optional[str] = None
    
    class Config:
        from_attributes = True


class BulkShiftAssignment(BaseModel):
    """Schema for bulk shift assignment"""
    assignments: List[ShiftAssignmentCreate]


class EmployeeWeekOffBase(BaseModel):
    """Base employee week-off schema"""
    employee_id: str
    week_offs: List[int] = Field(..., description="List of week-off days (0=Sunday, 6=Saturday)")


class EmployeeWeekOffCreate(EmployeeWeekOffBase):
    """Schema for creating employee week-off"""
    pass


class EmployeeWeekOffResponse(EmployeeWeekOffBase):
    """Schema for employee week-off response"""
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True
