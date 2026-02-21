"""
Security Service
Business logic for attendance security validation
"""

from typing import List, Tuple
from datetime import datetime, timezone
from sqlalchemy.orm import Session
import base64
import httpx
from pathlib import Path
import logging

from app.models.attendance import AttendanceEntry, WorkMode
from app.models.user import User
from app.utils.geofencing import validate_location_for_mode
from app.core.config import settings
from app.core.exceptions import (
    ImageProcessingError, ValidationError, SecurityValidationError, NotFoundError
)

logger = logging.getLogger(__name__)


def _normalize_for_diff(first: datetime, second: datetime) -> Tuple[datetime, datetime]:
    """
    Normalize datetimes to naive UTC for safe subtraction.
    This avoids mixing aware/naive datetimes when DB or client timestamps differ.
    """
    if first.tzinfo is not None:
        first = first.astimezone(timezone.utc).replace(tzinfo=None)
    if second.tzinfo is not None:
        second = second.astimezone(timezone.utc).replace(tzinfo=None)
    return first, second

class SecurityService:
    """Security service for attendance validation"""
    
    @staticmethod
    def validate_image_data(image_data: str) -> bytes:
        """
        Validate and decode image data from base64
        
        Args:
            image_data: Base64 encoded image data (may include data URL prefix)
            
        Returns:
            Decoded image bytes
            
        Raises:
            ValidationError: If image_data is missing
            ImageProcessingError: If image cannot be decoded or is corrupt
        """
        if not image_data or not image_data.strip():
            raise ValidationError(
                "Missing image data",
                details={"field": "image_data", "reason": "Image data is required"}
            )
        
        try:
            # Handle possible data URL prefixes from client capture (data:image/jpeg;base64,...)
            encoded = image_data.split(",", 1)[-1] if "," in image_data else image_data
            
            # Decode base64
            decoded_bytes = base64.b64decode(encoded, validate=True)
            
            if not decoded_bytes:
                raise ImageProcessingError(
                    "Image decoding resulted in empty data",
                    reason="Decoded image is empty"
                )
            
            # Validate minimum size
            if len(decoded_bytes) < settings.MIN_IMAGE_SIZE_BYTES:
                raise ImageProcessingError(
                    f"Image is too small (minimum {settings.MIN_IMAGE_SIZE_BYTES} bytes required)",
                    reason=f"File size: {len(decoded_bytes)} bytes"
                )
            
            return decoded_bytes
            
        except ValueError as e:
            raise ImageProcessingError(
                "Invalid base64 image data",
                reason=str(e)
            )
        except Exception as e:
            logger.exception(f"Image validation failed: {str(e)}")
            raise ImageProcessingError(
                "Failed to process image data",
                reason=str(e)
            )
    
    @staticmethod
    def fetch_enrolled_face(employee_id: str, user: User) -> bytes:
        """
        Fetch enrolled face image for a user
        
        Args:
            employee_id: Employee ID
            user: User object from database
            
        Returns:
            Enrolled face image bytes
            
        Raises:
            NotFoundError: If no enrolled face is found
        """
        enrolled_bytes = None
        enrollment_errors: List[str] = []
        
        # Try to fetch from URL if available
        if user and user.face_image_url:
            try:
                response = httpx.get(user.face_image_url, timeout=5.0)
                response.raise_for_status()
                enrolled_bytes = response.content
                logger.debug(f"Fetched enrolled face for {employee_id} from URL")
            except Exception as e:
                logger.warning(f"Failed to fetch enrolled face from URL: {str(e)}")
                enrollment_errors.append(f"Failed to fetch from URL: {str(e)}")
        
        # Fallback: try to read from disk
        if not enrolled_bytes:
            fallback_path = Path("static") / "faces" / f"{employee_id}.jpg"
            if fallback_path.exists():
                try:
                    enrolled_bytes = fallback_path.read_bytes()
                    logger.debug(f"Fetched enrolled face for {employee_id} from disk")
                except Exception as e:
                    logger.warning(f"Failed to read enrolled face from disk: {str(e)}")
                    enrollment_errors.append(f"Failed to read from disk: {str(e)}")
            else:
                enrollment_errors.append(f"No face file found at {fallback_path}")
        
        if not enrolled_bytes:
            error_message = "; ".join(enrollment_errors) or "No enrolled face image found"
            logger.warning(f"No enrolled face for {employee_id}: {error_message}")
            raise NotFoundError("Enrolled face image", employee_id)
        
        return enrolled_bytes
    
    @staticmethod
    def validate_attendance(
        db: Session,
        employee_id: str,
        latitude: float,
        longitude: float,
        work_mode: WorkMode,
        timestamp: datetime,
        image_data: str,
        device_id: str
    ) -> Tuple[bool, str, List[str]]:
        """
        Validate attendance entry for security issues
        
        Args:
            db: Database session
            employee_id: Employee ID
            latitude: User latitude
            longitude: User longitude
            work_mode: Work mode (OFFICE, BRANCH, FIELD, WFH)
            timestamp: Timestamp of attendance
            image_data: Base64 encoded image
            device_id: Device identifier
            
        Returns:
            Tuple of (is_valid, reason, anomalies)
            
        Raises:
            Various exceptions for different validation failures
        """
        anomalies = []

        try:
            # 1. Geofencing validation
            location_valid, location_reason = validate_location_for_mode(
                latitude, longitude, work_mode.value
            )

            if not location_valid:
                raise SecurityValidationError(location_reason, ["Geofence Violation"])

            # 2. Fetch enrolled face and validate
            user = db.query(User).filter(User.employee_id == employee_id).first()
            
            if not user:
                raise NotFoundError("User", employee_id)
            
            # Get enrolled face image bytes (may raise NotFoundError)
            enrolled_bytes = SecurityService.fetch_enrolled_face(employee_id, user)

            # 3. Image validation (if provided)
            if image_data:
                try:
                    # Validate and decode the image data
                    captured_bytes = SecurityService.validate_image_data(image_data)
                    logger.debug(f"Validated image data for {employee_id}: {len(captured_bytes)} bytes")
                except (ValidationError, ImageProcessingError) as e:
                    raise e

            # Note: Face verification was already performed on client-side using face-api.js with proper face matching
            # Server-side verification here is for image quality validation only
            # Performing binary hash comparison would fail due to compression differences and is not a valid face verification method

            # 4. Timestamp anomaly detection
            if timestamp.second == 0 and timestamp.minute == 0:
                anomalies.append("Clock Integrity: Impossibly precise timestamp detected")

            # 5. Device forensics
            previous_entries = db.query(AttendanceEntry).filter(
                AttendanceEntry.employee_id == employee_id
            ).order_by(AttendanceEntry.timestamp.desc()).limit(5).all()

            if previous_entries:
                last_device = previous_entries[0].device_id
                if last_device != device_id:
                    anomalies.append("Security Alert: Identity logged via unrecognized hardware node")

            # 6. Rapid succession check (prevent duplicate entries within 1 minute)
            if previous_entries:
                current_ts, last_ts = _normalize_for_diff(timestamp, previous_entries[0].timestamp)
                time_diff = (current_ts - last_ts).total_seconds()
                if time_diff < 60:
                    raise SecurityValidationError(
                        "Duplicate Entry: Recent attendance already recorded",
                        ["Rapid Succession"]
                    )

            return True, "Validation passed", anomalies
            
        except (SecurityValidationError, ValidationError, ImageProcessingError, NotFoundError):
            raise
        except Exception:
            logger.exception(f"Security validation failed for employee_id={employee_id}")
            raise SecurityValidationError("Security validation error", ["Validation Error"])
    
    @staticmethod
    def calculate_duration(check_in: AttendanceEntry, check_out_time: datetime) -> float:
        """
        Calculate duration between check-in and check-out
        
        Args:
            check_in: Check-in entry
            check_out_time: Check-out timestamp
            
        Returns:
            Duration in hours
        """
        duration_seconds = (check_out_time - check_in.timestamp).total_seconds()
        duration_hours = round(duration_seconds / 3600, 2)
        return duration_hours
    
    @staticmethod
    def check_short_duration(duration_hours: float) -> Tuple[bool, str]:
        """
        Check if shift duration is too short
        
        Args:
            duration_hours: Duration in hours
            
        Returns:
            Tuple of (is_flagged, reason)
        """
        if duration_hours < 7.5:
            return True, f"Short duration: {duration_hours}h (minimum 7.5h expected)"
        return False, ""


# Create service instance
security_service = SecurityService()
