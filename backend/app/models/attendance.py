"""
Attendance Models
Defines attendance entry and related schemas
"""

from sqlalchemy import Column, String, DateTime, Float, Boolean, Enum as SQLEnum, ForeignKey, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from app.core.database import Base


class WorkMode(str, enum.Enum):
    """Work mode enumeration"""
    OFFICE = "OFFICE"
    FIELD = "FIELD"
    BRANCH = "BRANCH"
    WFH = "WFH"


class AttendanceType(str, enum.Enum):
    """Attendance type enumeration"""
    IN = "IN"
    OUT = "OUT"


class VerificationMethod(str, enum.Enum):
    """Verification method enumeration"""
    BIOMETRIC = "BIOMETRIC"
    PIN = "PIN"
    FACE_ONLY = "FACE_ONLY"


class AttendanceEntry(Base):
    """Attendance entry model"""
    __tablename__ = "attendance_entries"
    
    id = Column(String, primary_key=True, index=True)  # UUID
    employee_id = Column(String, ForeignKey("users.employee_id"), nullable=False, index=True)
    timestamp = Column(DateTime(timezone=True), nullable=False, index=True)
    type = Column(SQLEnum(AttendanceType), nullable=False)
    mode = Column(SQLEnum(WorkMode), nullable=False)
    
    # Location data
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    
    # Security and validation
    is_flagged = Column(Boolean, default=False)
    flag_reason = Column(String)
    field_work_reason = Column(String)
    device_id = Column(String, nullable=False)
    verification_method = Column(SQLEnum(VerificationMethod), nullable=False)
    
    # Duration (for OUT entries)
    duration = Column(Float)  # Hours
    
    # Image data (base64 - in production, store in object storage)
    image_data = Column(Text)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    def __repr__(self):
        return f"<AttendanceEntry {self.employee_id} - {self.type} at {self.timestamp}>"


class AttendanceLock(Base):
    """Attendance lock model for finalizing dates"""
    __tablename__ = "attendance_locks"
    
    id = Column(String, primary_key=True, index=True)  # UUID
    date = Column(String, unique=True, nullable=False, index=True)  # YYYY-MM-DD
    locked_by = Column(String, ForeignKey("users.employee_id"))
    locked_at = Column(DateTime(timezone=True), server_default=func.now())
    
    def __repr__(self):
        return f"<AttendanceLock {self.date}>"
