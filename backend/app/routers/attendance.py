"""
Attendance Router
Endpoints for attendance management
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import logging

from app.core.database import get_db
from app.core.exceptions import (
    ValidationError, SecurityValidationError, NotFoundError,
    ImageProcessingError, FaceVerificationError
)
from app.schemas.attendance import (
    AttendanceEntryCreate,
    AttendanceEntryResponse,
    AttendanceStatusResponse
)
from app.core.schemas import SuccessResponse, MessageResponse, ResponseStatus
from app.services.attendance_service import attendance_service
from app.dependencies import get_current_active_user, require_hr_role
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/attendance", tags=["Attendance"])


@router.post("/check-in", response_model=SuccessResponse, status_code=status.HTTP_201_CREATED)
def check_in(
    entry_data: AttendanceEntryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Record check-in attendance with face verification and security validation.
    
    Request body:
    ```json
    {
      "employee_id": "EMP002",
      "entry_type": "IN",
      "latitude": 19.244449,
      "longitude": 83.422297,
      "work_mode": "OFFICE",
      "image_data": "data:image/jpeg;base64,..."
    }
    ```
    
    Returns:
    - 201: Check-in successful with attendance entry details
    - 400: Face not detected, image invalid, or security validation failed
    - 401: Unauthorized
    - 404: Employee or enrolled face not found
    - 422: Validation error
    - 500: Internal server error
    
    Response format:
    ```json
    {
      "status": "success",
      "message": "Check-in successful",
      "data": {
        "entry_id": "...",
        "entry_type": "IN",
        "timestamp": "...",
        ...
      }
    }
    ```
    """
    try:
        # Ensure employee is checking in for themselves (unless HR)
        if current_user.role.value != "HR" and entry_data.employee_id != current_user.employee_id:
            logger.warning(
                f"Unauthorized check-in attempt: {current_user.employee_id} for {entry_data.employee_id}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Can only check in for yourself"
            )
        
        logger.info(f"Processing check-in for {entry_data.employee_id}")
        entry = attendance_service.create_attendance_entry(db, entry_data, current_user)
        logger.info(f"Check-in successful for {entry_data.employee_id}")
        
        return SuccessResponse(
            status=ResponseStatus.SUCCESS,
            message="Check-in successful",
            data=AttendanceEntryResponse.from_orm(entry)
        )
        
    except ValidationError as e:
        logger.warning(f"Validation error during check-in: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=e.message
        )
    except ImageProcessingError as e:
        logger.warning(f"Image processing error during check-in: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.message
        )
    except FaceVerificationError as e:
        logger.warning(f"Face verification error during check-in: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.message
        )
    except SecurityValidationError as e:
        logger.warning(f"Security validation error during check-in: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.message
        )
    except NotFoundError as e:
        logger.warning(f"Resource not found during check-in: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=e.message
        )
    except Exception as e:
        logger.exception(f"Unexpected error during check-in for {entry_data.employee_id}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Check-in failed. Please try again later."
        )


@router.post("/check-out", response_model=SuccessResponse, status_code=status.HTTP_201_CREATED)
def check_out(
    entry_data: AttendanceEntryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Record check-out attendance with face verification and security validation.
    
    Request body:
    ```json
    {
      "employee_id": "EMP002",
      "entry_type": "OUT",
      "latitude": 19.244449,
      "longitude": 83.422297,
      "work_mode": "OFFICE",
      "image_data": "data:image/jpeg;base64,..."
    }
    ```
    
    Returns:
    - 201: Check-out successful with attendance entry details
    - 400: Face not detected, image invalid, or security validation failed
    - 401: Unauthorized
    - 404: Employee or enrolled face not found
    - 422: Validation error
    - 500: Internal server error
    """
    try:
        # Ensure employee is checking out for themselves (unless HR)
        if current_user.role.value != "HR" and entry_data.employee_id != current_user.employee_id:
            logger.warning(
                f"Unauthorized check-out attempt: {current_user.employee_id} for {entry_data.employee_id}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Can only check out for yourself"
            )
        
        logger.info(f"Processing check-out for {entry_data.employee_id}")
        entry = attendance_service.create_attendance_entry(db, entry_data, current_user)
        logger.info(f"Check-out successful for {entry_data.employee_id}")
        
        return SuccessResponse(
            status=ResponseStatus.SUCCESS,
            message="Check-out successful",
            data=AttendanceEntryResponse.from_orm(entry)
        )
        
    except ValidationError as e:
        logger.warning(f"Validation error during check-out: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=e.message
        )
    except ImageProcessingError as e:
        logger.warning(f"Image processing error during check-out: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.message
        )
    except FaceVerificationError as e:
        logger.warning(f"Face verification error during check-out: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.message
        )
    except SecurityValidationError as e:
        logger.warning(f"Security validation error during check-out: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.message
        )
    except NotFoundError as e:
        logger.warning(f"Resource not found during check-out: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=e.message
        )
    except Exception as e:
        logger.exception(f"Unexpected error during check-out for {entry_data.employee_id}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Check-out failed. Please try again later."
        )


@router.get("/status/{employee_id}", response_model=SuccessResponse)
def get_employee_status(
    employee_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get current attendance status for an employee.
    
    Returns:
    - 200: Status retrieved successfully
    - 401: Unauthorized
    - 403: Insufficient permissions
    - 404: Employee not found
    - 500: Internal server error
    """
    try:
        # Employees can only view their own status (unless HR)
        if current_user.role.value != "HR" and employee_id != current_user.employee_id:
            logger.warning(
                f"Unauthorized status access attempt: {current_user.employee_id} for {employee_id}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Can only view your own status"
            )
        
        logger.info(f"Fetching status for {employee_id}")
        status_data = attendance_service.get_employee_status(db, employee_id)
        
        return SuccessResponse(
            status=ResponseStatus.SUCCESS,
            message=f"Status retrieved for {employee_id}",
            data=status_data
        )
    except NotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=e.message
        )
    except Exception as e:
        logger.exception(f"Error fetching status for {employee_id}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve status"
        )


@router.get("/entries", response_model=SuccessResponse)
def get_attendance_entries(
    employee_id: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None, pattern=r"^\d{4}-\d{2}-\d{2}$"),
    end_date: Optional[str] = Query(None, pattern=r"^\d{4}-\d{2}-\d{2}$"),
    department: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get attendance entries with optional filters.
    Employees can only view their own entries; HR can view all.
    
    Query Parameters:
    - employee_id: Filter by employee
    - start_date: Filter from date (YYYY-MM-DD)
    - end_date: Filter to date (YYYY-MM-DD)
    - department: Filter by department (HR only)
    
    Returns:
    - 200: Entries retrieved successfully
    - 401: Unauthorized
    - 500: Internal server error
    """
    try:
        # If not HR, restrict to own employee_id
        if current_user.role.value != "HR":
            employee_id = current_user.employee_id
            department = None  # Employees can't filter by department
        
        logger.info(f"Fetching attendance entries for employee_id={employee_id}, start={start_date}, end={end_date}")
        
        entries = attendance_service.get_entries_by_date_range(
            db,
            employee_id=employee_id,
            start_date=start_date,
            end_date=end_date,
            department=department
        )
        serialized_entries = [AttendanceEntryResponse.from_orm(entry) for entry in entries]
        safe_entries = jsonable_encoder(serialized_entries)
        
        return SuccessResponse(
            status=ResponseStatus.SUCCESS,
            message=f"Retrieved {len(serialized_entries)} attendance entries",
            data=safe_entries
        )
    except Exception as e:
        logger.exception(f"Error fetching attendance entries")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve attendance entries"
        )


@router.get("/entries/{employee_id}/date/{date}", response_model=SuccessResponse)
def get_entries_by_date(
    employee_id: str,
    date: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get all attendance entries for a specific employee on a specific date.
    
    Parameters:
    - employee_id: Employee ID
    - date: Date in YYYY-MM-DD format
    
    Returns:
    - 200: Entries retrieved successfully
    - 401: Unauthorized
    - 403: Insufficient permissions
    - 500: Internal server error
    """
    try:
        # Employees can only view their own entries (unless HR)
        if current_user.role.value != "HR" and employee_id != current_user.employee_id:
            logger.warning(
                f"Unauthorized entries access: {current_user.employee_id} for {employee_id}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Can only view your own attendance"
            )
        
        logger.info(f"Fetching entries for {employee_id} on {date}")
        entries = attendance_service.get_entries_for_date(db, employee_id, date)
        serialized_entries = [AttendanceEntryResponse.from_orm(entry) for entry in entries]
        safe_entries = jsonable_encoder(serialized_entries)
        
        return SuccessResponse(
            status=ResponseStatus.SUCCESS,
            message=f"Retrieved {len(serialized_entries)} entries for {date}",
            data=safe_entries
        )
    except Exception as e:
        logger.exception(f"Error fetching entries for {employee_id} on {date}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve entries"
        )


@router.post("/lock/{date}", response_model=MessageResponse, status_code=status.HTTP_200_OK)
def lock_attendance_date(
    date: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_role)
):
    """
    Lock attendance for a specific date (HR only).
    Prevents further modifications to attendance entries on that date.
    
    Parameters:
    - date: Date in YYYY-MM-DD format
    
    Returns:
    - 200: Date locked successfully
    - 401: Unauthorized
    - 403: Not HR role
    - 500: Internal server error
    """
    try:
        logger.info(f"HR {current_user.employee_id} locking attendance for {date}")
        lock = attendance_service.lock_attendance_date(db, date, current_user.employee_id)
        
        return MessageResponse(
            status=ResponseStatus.SUCCESS,
            message=f"Date {date} has been locked successfully"
        )
    except Exception as e:
        logger.exception(f"Error locking date {date}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to lock attendance date"
        )


@router.delete("/lock/{date}", response_model=MessageResponse, status_code=status.HTTP_200_OK)
def unlock_attendance_date(
    date: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_role)
):
    """
    Unlock attendance for a specific date (HR only).
    Re-allows modifications to attendance entries on that date.
    
    Parameters:
    - date: Date in YYYY-MM-DD format
    
    Returns:
    - 200: Date unlocked successfully
    - 401: Unauthorized
    - 403: Not HR role
    - 500: Internal server error
    """
    try:
        logger.info(f"HR {current_user.employee_id} unlocking attendance for {date}")
        attendance_service.unlock_attendance_date(db, date)
        
        return MessageResponse(
            status=ResponseStatus.SUCCESS,
            message=f"Date {date} has been unlocked successfully"
        )
    except Exception as e:
        logger.exception(f"Error unlocking date {date}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to unlock attendance date"
        )


@router.get("/lock/{date}/status", response_model=SuccessResponse)
def check_date_lock_status(
    date: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Check if a date is locked.
    
    Parameters:
    - date: Date in YYYY-MM-DD format
    
    Returns:
    - 200: Lock status retrieved successfully
    - 401: Unauthorized
    - 500: Internal server error
    """
    try:
        logger.debug(f"Checking lock status for {date}")
        is_locked = attendance_service.is_date_locked(db, date)
        
        return SuccessResponse(
            status=ResponseStatus.SUCCESS,
            message=f"Lock status for {date}",
            data={"date": date, "is_locked": is_locked}
        )
    except Exception as e:
        logger.exception(f"Error checking lock status for {date}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to check lock status"
        )
