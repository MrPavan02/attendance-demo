"""
Shift Models
Defines shift, shift assignment, and week-off schemas
"""

from sqlalchemy import Column, String, DateTime, ForeignKey, ARRAY, Integer
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import ARRAY as PG_ARRAY
from datetime import datetime

from app.core.database import Base


class Shift(Base):
    """Shift definition model"""
    __tablename__ = "shifts"
    
    id = Column(String, primary_key=True, index=True)  # shift_1, shift_2, etc.
    name = Column(String, nullable=False)  # Shift1, Shift2, etc.
    start_time = Column(String, nullable=False)  # HH:MM format
    end_time = Column(String, nullable=False)  # HH:MM format
    description = Column(String)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def __repr__(self):
        return f"<Shift {self.name} ({self.start_time}-{self.end_time})>"


class ShiftAssignment(Base):
    """Shift assignment model"""
    __tablename__ = "shift_assignments"
    
    id = Column(String, primary_key=True, index=True)  # UUID
    employee_id = Column(String, ForeignKey("users.employee_id"), nullable=False, index=True)
    shift_id = Column(String, ForeignKey("shifts.id"), nullable=False)
    date = Column(String, nullable=False, index=True)  # YYYY-MM-DD
    effective_from = Column(DateTime(timezone=True), nullable=False)
    effective_to = Column(DateTime(timezone=True))
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    assigned_by = Column(String, ForeignKey("users.employee_id"))
    
    def __repr__(self):
        return f"<ShiftAssignment {self.employee_id} - {self.shift_id} on {self.date}>"


class EmployeeWeekOff(Base):
    """Employee week-off configuration"""
    __tablename__ = "employee_week_offs"
    
    id = Column(String, primary_key=True, index=True)  # UUID
    employee_id = Column(String, ForeignKey("users.employee_id"), unique=True, nullable=False)
    week_offs = Column(PG_ARRAY(Integer), default=[0, 6])  # Array of day numbers (0=Sunday, 6=Saturday)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def __repr__(self):
        return f"<EmployeeWeekOff {self.employee_id} - {self.week_offs}>"
