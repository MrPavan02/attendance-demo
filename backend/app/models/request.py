"""
Request Models
Defines regularization, overtime, permission, and shift change request schemas
"""

from sqlalchemy import Column, String, DateTime, Float, Enum as SQLEnum, ForeignKey, Text
from sqlalchemy.sql import func
from datetime import datetime
import enum

from app.core.database import Base


class RequestStatus(str, enum.Enum):
    """Request status enumeration"""
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    CANCELLED = "CANCELLED"


class RegularizationType(str, enum.Enum):
    """Regularization type enumeration"""
    LOGIN = "LOGIN"
    LOGOUT = "LOGOUT"
    BOTH = "BOTH"
    MISSED_CHECKIN = "MISSED_CHECKIN"
    MISSED_CHECKOUT = "MISSED_CHECKOUT"
    FULL_DAY = "FULL_DAY"


class RegularizationRequest(Base):
    """Regularization request model"""
    __tablename__ = "regularization_requests"
    
    id = Column(String, primary_key=True, index=True)  # UUID
    employee_id = Column(String, ForeignKey("users.employee_id"), nullable=False, index=True)
    date = Column(String, nullable=False, index=True)  # YYYY-MM-DD
    type = Column(SQLEnum(RegularizationType), nullable=False)
    
    # Time details
    actual_time = Column(String)
    requested_login_time = Column(String)
    requested_logout_time = Column(String)
    
    # Request details
    reason = Column(Text, nullable=False)
    remarks = Column(Text)
    # Request metadata
    submitted_date = Column(DateTime(timezone=True), server_default=func.now())
    status = Column(SQLEnum(RequestStatus), default=RequestStatus.PENDING, nullable=False)
    
    # Manager decision details (approval or rejection)
    manager_name = Column(String)
    decision_date = Column(DateTime(timezone=True))
    
    def __repr__(self):
        return f"<RegularizationRequest {self.employee_id} - {self.date} - {self.status}>"


class ShiftChangeRequest(Base):
    """Shift change request model"""
    __tablename__ = "shift_change_requests"
    
    id = Column(String, primary_key=True, index=True)  # UUID
    employee_id = Column(String, ForeignKey("users.employee_id"), nullable=False, index=True)
    current_shift_id = Column(String, ForeignKey("shifts.id"), nullable=False)
    requested_shift_id = Column(String, ForeignKey("shifts.id"), nullable=False)
    date = Column(String, nullable=False, index=True)  # YYYY-MM-DD
    reason = Column(Text, nullable=False)
    # Request metadata
    submitted_date = Column(DateTime(timezone=True), server_default=func.now())
    status = Column(SQLEnum(RequestStatus), default=RequestStatus.PENDING, nullable=False)
    
    # Manager decision details (approval or rejection)
    manager_name = Column(String)
    decision_date = Column(DateTime(timezone=True))
    
    def __repr__(self):
        return f"<ShiftChangeRequest {self.employee_id} - {self.date} - {self.status}>"


class OvertimeRequest(Base):
    """Overtime request model"""
    __tablename__ = "overtime_requests"
    
    id = Column(String, primary_key=True, index=True)  # UUID
    employee_id = Column(String, ForeignKey("users.employee_id"), nullable=False, index=True)
    date = Column(String, nullable=False, index=True)  # YYYY-MM-DD
    hours = Column(Float, nullable=False)
    reason = Column(Text, nullable=False)
    # Request metadata
    submitted_date = Column(DateTime(timezone=True), server_default=func.now())
    status = Column(SQLEnum(RequestStatus), default=RequestStatus.PENDING, nullable=False)
    
    # Manager decision details (approval or rejection)
    manager_name = Column(String)
    decision_date = Column(DateTime(timezone=True))
    
    def __repr__(self):
        return f"<OvertimeRequest {self.employee_id} - {self.date} - {self.hours}h>"


class PermissionRequest(Base):
    """Permission request model"""
    __tablename__ = "permission_requests"
    
    id = Column(String, primary_key=True, index=True)  # UUID
    employee_id = Column(String, ForeignKey("users.employee_id"), nullable=False, index=True)
    date = Column(String, nullable=False, index=True)  # YYYY-MM-DD
    start_time = Column(String, nullable=False)  # HH:MM
    end_time = Column(String, nullable=False)  # HH:MM
    reason = Column(Text, nullable=False)
    # Request metadata
    submitted_date = Column(DateTime(timezone=True), server_default=func.now())
    status = Column(SQLEnum(RequestStatus), default=RequestStatus.PENDING, nullable=False)
    
    # Manager decision details (approval or rejection)
    manager_name = Column(String)
    decision_date = Column(DateTime(timezone=True))
    
    def __repr__(self):
        return f"<PermissionRequest {self.employee_id} - {self.date}>"
