"""
Attendance Schemas
Pydantic models for attendance data validation
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from app.models.attendance import WorkMode, AttendanceType, VerificationMethod


class Coordinates(BaseModel):
    """Geographic coordinates"""
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)


class AttendanceEntryBase(BaseModel):
    """Base attendance entry schema"""
    employee_id: str
    timestamp: datetime
    type: AttendanceType
    mode: WorkMode
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    device_id: str
    verification_method: VerificationMethod
    field_work_reason: Optional[str] = None
    image_data: Optional[str] = Field(None, description="Base64 encoded image")


class AttendanceEntryCreate(AttendanceEntryBase):
    """Schema for creating attendance entry"""
    pass


class AttendanceEntryResponse(AttendanceEntryBase):
    """Schema for attendance entry response"""
    id: str
    is_flagged: bool
    flag_reason: Optional[str] = None
    duration: Optional[float] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class AttendanceStatusResponse(BaseModel):
    """Current attendance status response"""
    employee_id: str
    current_status: str  # CHECKED_IN or CHECKED_OUT
    last_check_in: Optional[AttendanceEntryResponse] = None


class SecurityScanResult(BaseModel):
    """Security validation result"""
    is_valid: bool
    reason: Optional[str] = None
    anomalies: List[str] = []


class AttendanceReportQuery(BaseModel):
    """Attendance report query parameters"""
    employee_id: Optional[str] = None
    start_date: Optional[str] = None  # YYYY-MM-DD
    end_date: Optional[str] = None  # YYYY-MM-DD
    department: Optional[str] = None
    report_type: str = Field("daily", pattern="^(daily|range|monthly)$")
