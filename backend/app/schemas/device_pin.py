"""
Device PIN Schema
Pydantic models for device PIN setup and verification
"""

from pydantic import BaseModel, Field


class DevicePinSetup(BaseModel):
    """Schema for setting up device PIN"""
    employee_id: str = Field(..., description="Employee ID")
    device_id: str = Field(..., description="Device fingerprint/ID")
    pin: str = Field(..., min_length=4, max_length=6, description="Device PIN (4-6 digits)")


class DevicePinVerify(BaseModel):
    """Schema for verifying device PIN"""
    employee_id: str = Field(..., description="Employee ID")
    device_id: str = Field(..., description="Device fingerprint/ID")
    pin: str = Field(..., description="Device PIN")


class DevicePinResponse(BaseModel):
    """Response after PIN verification"""
    verified: bool = Field(..., description="Whether PIN was verified successfully")
    device_id: str = Field(..., description="Device ID")
