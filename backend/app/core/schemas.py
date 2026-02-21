"""
Response Schemas
Standardized response structures for the API
"""

from pydantic import BaseModel, Field
from typing import Any, Optional, Dict, List
from enum import Enum


class ResponseStatus(str, Enum):
    """Response status enumeration"""
    SUCCESS = "success"
    ERROR = "error"
    VALIDATION_ERROR = "validation_error"
    UNAUTHORIZED = "unauthorized"
    FORBIDDEN = "forbidden"


class BaseResponse(BaseModel):
    """Base response structure for all API responses"""
    status: ResponseStatus = Field(..., description="Response status")
    message: str = Field(..., description="Response message")
    
    class Config:
        use_enum_values = True


class ErrorResponse(BaseResponse):
    """Error response structure"""
    status: ResponseStatus = ResponseStatus.ERROR
    details: Optional[Dict[str, Any]] = Field(None, description="Additional error details")
    request_id: Optional[str] = Field(None, description="Request ID for tracking")


class FaceVerificationResponse(BaseResponse):
    """Face verification response"""
    status: ResponseStatus = ResponseStatus.SUCCESS
    match: bool = Field(..., description="Whether faces matched")
    confidence: float = Field(..., description="Confidence score (0.0-1.0)")


class AttendanceResponse(BaseResponse):
    """Attendance check-in/out response"""
    status: ResponseStatus = ResponseStatus.SUCCESS
    entry_id: str = Field(..., description="Attendance entry ID")
    entry_type: str = Field(..., description="IN or OUT")
    timestamp: str = Field(..., description="Entry timestamp")
    duration: Optional[float] = Field(None, description="Duration in hours (for OUT entries)")
    is_flagged: bool = Field(default=False, description="Whether entry is flagged for review")
    flag_reason: Optional[str] = Field(None, description="Reason for flagging")


class HealthCheckResponse(BaseModel):
    """Health check response"""
    status: str
    app_name: str
    version: str
    timestamp: str


class DataResponse(BaseResponse):
    """Generic data response"""
    status: ResponseStatus = ResponseStatus.SUCCESS
    data: Any = Field(..., description="Response data")


class PaginatedResponse(BaseResponse):
    """Paginated response"""
    status: ResponseStatus = ResponseStatus.SUCCESS
    data: List[Any] = Field(..., description="Data items")
    total: int = Field(..., description="Total items")
    page: int = Field(..., description="Current page")
    page_size: int = Field(..., description="Page size")


class ValidationErrorResponse(BaseResponse):
    """Validation error response"""
    status: ResponseStatus = ResponseStatus.VALIDATION_ERROR
    errors: List[Dict[str, str]] = Field(..., description="Validation errors")


class UnauthorizedResponse(BaseResponse):
    """Unauthorized response"""
    status: ResponseStatus = ResponseStatus.UNAUTHORIZED
    details: Optional[Dict[str, Any]] = Field(None, description="Additional details")


class ForbiddenResponse(BaseResponse):
    """Forbidden response"""
    status: ResponseStatus = ResponseStatus.FORBIDDEN
    details: Optional[Dict[str, Any]] = Field(None, description="Additional details")

class SuccessResponse(BaseResponse):
    """Generic success response with optional data"""
    status: ResponseStatus = ResponseStatus.SUCCESS
    data: Optional[Any] = Field(None, description="Response data")
    request_id: Optional[str] = Field(None, description="Request ID for tracking")


class MessageResponse(BaseResponse):
    """Simple message response"""
    status: ResponseStatus = ResponseStatus.SUCCESS
    request_id: Optional[str] = Field(None, description="Request ID for tracking")