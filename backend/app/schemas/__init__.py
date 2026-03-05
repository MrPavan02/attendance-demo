"""
Pydantic Schemas
Data validation and serialization schemas
"""

from app.schemas.user import (
    UserBase, UserCreate, UserUpdate, UserResponse,
    Token, TokenData, LoginRequest
)
from app.schemas.device_pin import (
    DevicePinSetup, DevicePinVerify, DevicePinResponse
)
from app.schemas.attendance import (
    AttendanceEntryBase, AttendanceEntryCreate, AttendanceEntryResponse,
    AttendanceStatusResponse, SecurityScanResult
)
from app.schemas.shift import (
    ShiftBase, ShiftCreate, ShiftResponse,
    ShiftAssignmentBase, ShiftAssignmentCreate, ShiftAssignmentResponse,
    EmployeeWeekOffBase, EmployeeWeekOffCreate, EmployeeWeekOffResponse
)
from app.schemas.request import (
    RegularizationRequestBase, RegularizationRequestCreate, RegularizationRequestResponse,
    ShiftChangeRequestBase, ShiftChangeRequestCreate, ShiftChangeRequestResponse,
    OvertimeRequestBase, OvertimeRequestCreate, OvertimeRequestResponse,
    PermissionRequestBase, PermissionRequestCreate, PermissionRequestResponse,
    RequestApproval
)
from app.schemas.holiday import HolidayBase, HolidayCreate, HolidayResponse

__all__ = [
    "UserBase", "UserCreate", "UserUpdate", "UserResponse",
    "Token", "TokenData", "LoginRequest",
    "DevicePinSetup", "DevicePinVerify", "DevicePinResponse",
    "AttendanceEntryBase", "AttendanceEntryCreate", "AttendanceEntryResponse",
    "AttendanceStatusResponse", "SecurityScanResult",
    "ShiftBase", "ShiftCreate", "ShiftResponse",
    "ShiftAssignmentBase", "ShiftAssignmentCreate", "ShiftAssignmentResponse",
    "EmployeeWeekOffBase", "EmployeeWeekOffCreate", "EmployeeWeekOffResponse",
    "RegularizationRequestBase", "RegularizationRequestCreate", "RegularizationRequestResponse",
    "ShiftChangeRequestBase", "ShiftChangeRequestCreate", "ShiftChangeRequestResponse",
    "OvertimeRequestBase", "OvertimeRequestCreate", "OvertimeRequestResponse",
    "PermissionRequestBase", "PermissionRequestCreate", "PermissionRequestResponse",
    "RequestApproval",
    "HolidayBase", "HolidayCreate", "HolidayResponse"
]
