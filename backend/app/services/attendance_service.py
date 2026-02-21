"""
Attendance Service
Business logic for attendance management
"""

from typing import List, Optional, Dict
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from fastapi import HTTPException, status
import uuid
import logging

from app.models.attendance import AttendanceEntry, AttendanceType, WorkMode, AttendanceLock
from app.models.user import User
from app.schemas.attendance import AttendanceEntryCreate, AttendanceStatusResponse
from app.services.security_service import security_service
from app.core.exceptions import SecurityValidationError

logger = logging.getLogger(__name__)


class AttendanceService:
    """Attendance service for attendance management"""
    
    @staticmethod
    def create_attendance_entry(
        db: Session,
        entry_data: AttendanceEntryCreate,
        current_user: User
    ) -> AttendanceEntry:
        """
        Create new attendance entry with security validation
        
        Args:
            db: Database session
            entry_data: Attendance entry data
            current_user: Current authenticated user
            
        Returns:
            Created attendance entry
            
        Raises:
            SecurityValidationError: If security validation fails
            ValidationError: If data validation fails
            NotFoundError: If required resources not found
        """
        # Validate security - may raise various exceptions
        try:
            is_valid, reason, anomalies = security_service.validate_attendance(
                db=db,
                employee_id=entry_data.employee_id,
                latitude=entry_data.latitude,
                longitude=entry_data.longitude,
                work_mode=entry_data.mode,
                timestamp=entry_data.timestamp,
                image_data=entry_data.image_data or "",
                device_id=entry_data.device_id
            )
            
            if not is_valid:
                logger.warning(f"Attendance validation failed for {entry_data.employee_id}: {reason}")
                raise SecurityValidationError(reason, anomalies)
                
        except (SecurityValidationError, Exception) as e:
            logger.error(f"Attendance validation exception: {str(e)}")
            raise
        
        # Calculate duration for OUT entries
        duration = None
        if entry_data.type == AttendanceType.OUT:
            last_check_in = AttendanceService.get_last_check_in(db, entry_data.employee_id)
            if last_check_in:
                duration = security_service.calculate_duration(
                    last_check_in,
                    entry_data.timestamp
                )
                
                # Check for short duration
                is_short, short_reason = security_service.check_short_duration(duration)
                if is_short:
                    anomalies.append(short_reason)
        
        # Create entry
        db_entry = AttendanceEntry(
            id=str(uuid.uuid4()),
            employee_id=entry_data.employee_id,
            timestamp=entry_data.timestamp,
            type=entry_data.type,
            mode=entry_data.mode,
            latitude=entry_data.latitude,
            longitude=entry_data.longitude,
            device_id=entry_data.device_id,
            verification_method=entry_data.verification_method,
            field_work_reason=entry_data.field_work_reason,
            image_data=entry_data.image_data,
            duration=duration,
            is_flagged=len(anomalies) > 0,
            flag_reason=", ".join(anomalies) if anomalies else None
        )
        
        db.add(db_entry)
        db.commit()
        db.refresh(db_entry)
        
        logger.info(f"Created attendance entry for {entry_data.employee_id}: {db_entry.type}")
        
        return db_entry
    
    @staticmethod
    def get_employee_status(db: Session, employee_id: str) -> AttendanceStatusResponse:
        """
        Get current attendance status for employee
        
        Args:
            db: Database session
            employee_id: Employee ID
            
        Returns:
            Attendance status response
        """
        last_entry = db.query(AttendanceEntry).filter(
            AttendanceEntry.employee_id == employee_id
        ).order_by(AttendanceEntry.timestamp.desc()).first()
        
        if not last_entry:
            return AttendanceStatusResponse(
                employee_id=employee_id,
                current_status="CHECKED_OUT",
                last_check_in=None
            )
        
        current_status = "CHECKED_IN" if last_entry.type == AttendanceType.IN else "CHECKED_OUT"
        
        last_check_in = None
        if current_status == "CHECKED_IN":
            last_check_in = last_entry
        
        return AttendanceStatusResponse(
            employee_id=employee_id,
            current_status=current_status,
            last_check_in=last_check_in
        )
    
    @staticmethod
    def get_last_check_in(db: Session, employee_id: str) -> Optional[AttendanceEntry]:
        """
        Get last check-in entry for employee
        
        Args:
            db: Database session
            employee_id: Employee ID
            
        Returns:
            Last check-in entry or None
        """
        return db.query(AttendanceEntry).filter(
            and_(
                AttendanceEntry.employee_id == employee_id,
                AttendanceEntry.type == AttendanceType.IN
            )
        ).order_by(AttendanceEntry.timestamp.desc()).first()
    
    @staticmethod
    def get_entries_by_date_range(
        db: Session,
        employee_id: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        department: Optional[str] = None
    ) -> List[AttendanceEntry]:
        """
        Get attendance entries by date range with optional filters
        
        Args:
            db: Database session
            employee_id: Optional employee ID filter
            start_date: Start date (YYYY-MM-DD)
            end_date: End date (YYYY-MM-DD)
            department: Optional department filter
            
        Returns:
            List of attendance entries
        """
        query = db.query(AttendanceEntry)
        
        if employee_id:
            query = query.filter(AttendanceEntry.employee_id == employee_id)
        
        if start_date:
            start_datetime = datetime.fromisoformat(f"{start_date}T00:00:00")
            query = query.filter(AttendanceEntry.timestamp >= start_datetime)
        
        if end_date:
            end_datetime = datetime.fromisoformat(f"{end_date}T23:59:59")
            query = query.filter(AttendanceEntry.timestamp <= end_datetime)
        
        if department:
            # Join with users table to filter by department
            query = query.join(User, AttendanceEntry.employee_id == User.employee_id)
            query = query.filter(User.department == department)
        
        return query.order_by(AttendanceEntry.timestamp.desc()).all()
    
    @staticmethod
    def get_entries_for_date(db: Session, employee_id: str, date: str) -> List[AttendanceEntry]:
        """
        Get all attendance entries for a specific date
        
        Args:
            db: Database session
            employee_id: Employee ID
            date: Date string (YYYY-MM-DD)
            
        Returns:
            List of attendance entries for the date
        """
        start_datetime = datetime.fromisoformat(f"{date}T00:00:00")
        end_datetime = datetime.fromisoformat(f"{date}T23:59:59")
        
        return db.query(AttendanceEntry).filter(
            and_(
                AttendanceEntry.employee_id == employee_id,
                AttendanceEntry.timestamp >= start_datetime,
                AttendanceEntry.timestamp <= end_datetime
            )
        ).order_by(AttendanceEntry.timestamp).all()
    
    @staticmethod
    def lock_attendance_date(db: Session, date: str, locked_by: str) -> AttendanceLock:
        """
        Lock attendance for a specific date (prevent further modifications)
        
        Args:
            db: Database session
            date: Date to lock (YYYY-MM-DD)
            locked_by: Employee ID who locked the date
            
        Returns:
            Attendance lock record
        """
        # Check if already locked
        existing_lock = db.query(AttendanceLock).filter(
            AttendanceLock.date == date
        ).first()
        
        if existing_lock:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Date {date} is already locked"
            )
        
        lock = AttendanceLock(
            id=str(uuid.uuid4()),
            date=date,
            locked_by=locked_by
        )
        
        db.add(lock)
        db.commit()
        db.refresh(lock)
        
        return lock
    
    @staticmethod
    def unlock_attendance_date(db: Session, date: str) -> None:
        """
        Unlock attendance for a specific date
        
        Args:
            db: Database session
            date: Date to unlock (YYYY-MM-DD)
        """
        lock = db.query(AttendanceLock).filter(AttendanceLock.date == date).first()
        
        if not lock:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No lock found for date {date}"
            )
        
        db.delete(lock)
        db.commit()
    
    @staticmethod
    def is_date_locked(db: Session, date: str) -> bool:
        """
        Check if a date is locked
        
        Args:
            db: Database session
            date: Date to check (YYYY-MM-DD)
            
        Returns:
            True if locked, False otherwise
        """
        lock = db.query(AttendanceLock).filter(AttendanceLock.date == date).first()
        return lock is not None


# Create service instance
attendance_service = AttendanceService()
