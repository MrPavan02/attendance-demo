"""
Holiday Schemas
Pydantic models for holiday data validation
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class HolidayBase(BaseModel):
    """Base holiday schema"""
    date: str = Field(..., pattern="^\\d{4}-\\d{2}-\\d{2}$", description="Holiday date (YYYY-MM-DD)")
    name: str = Field(..., min_length=1, max_length=100)
    country: str = Field(..., min_length=1, max_length=100)
    state: str = Field(..., min_length=1, max_length=100)


class HolidayCreate(HolidayBase):
    """Schema for creating holiday"""
    created_by: Optional[str] = None


class HolidayResponse(HolidayBase):
    """Schema for holiday response"""
    id: str
    created_at: datetime
    created_by: Optional[str] = None
    
    class Config:
        from_attributes = True
