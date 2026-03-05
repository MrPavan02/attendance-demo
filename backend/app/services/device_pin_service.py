"""
Device PIN Service
Handles device-specific PIN setup and verification
"""

from sqlalchemy.orm import Session
from app.models.user import User
from app.core.security import get_password_hash, verify_password
from typing import Optional
import logging

logger = logging.getLogger(__name__)


class DevicePinService:
    """Service for managing device-specific PINs"""

    @staticmethod
    def setup_device_pin(db: Session, employee_id: str, device_id: str, pin: str) -> bool:
        """
        Setup or update PIN for a specific device
        
        Args:
            db: Database session
            employee_id: Employee ID
            device_id: Device fingerprint/ID
            pin: PIN to set (will be hashed)
            
        Returns:
            True if successful, False otherwise
        """
        try:
            user = db.query(User).filter(User.employee_id == employee_id).first()
            
            if not user:
                logger.warning(f"User not found: {employee_id}")
                return False
            
            # Initialize device_pins if None
            if user.device_pins is None:
                user.device_pins = {}
            
            # Hash the PIN before storing
            hashed_pin = get_password_hash(pin)
            
            # Store the hashed PIN for this device
            device_pins = user.device_pins or {}
            device_pins[device_id] = hashed_pin
            user.device_pins = device_pins
            
            db.commit()
            logger.info(f"Device PIN setup successful for {employee_id} on device {device_id[:8]}...")
            return True
            
        except Exception as e:
            logger.exception(f"Error setting up device PIN for {employee_id}")
            db.rollback()
            return False

    @staticmethod
    def verify_device_pin(db: Session, employee_id: str, device_id: str, pin: str) -> bool:
        """
        Verify PIN for a specific device
        
        Args:
            db: Database session
            employee_id: Employee ID
            device_id: Device fingerprint/ID
            pin: PIN to verify
            
        Returns:
            True if PIN is valid, False otherwise
        """
        try:
            user = db.query(User).filter(User.employee_id == employee_id).first()
            
            if not user:
                logger.warning(f"User not found: {employee_id}")
                return False
            
            if not user.device_pins:
                logger.warning(f"No device PINs setup for {employee_id}")
                return False
            
            # Get the stored hashed PIN for this device
            stored_hash = user.device_pins.get(device_id)
            
            if not stored_hash:
                logger.warning(f"No PIN setup for device {device_id[:8]}...")
                return False
            
            # Verify the PIN
            is_valid = verify_password(pin, stored_hash)
            
            if is_valid:
                logger.info(f"Device PIN verified for {employee_id} on device {device_id[:8]}...")
            else:
                logger.warning(f"Invalid device PIN for {employee_id} on device {device_id[:8]}...")
            
            return is_valid
            
        except Exception as e:
            logger.exception(f"Error verifying device PIN for {employee_id}")
            return False

    @staticmethod
    def get_device_pin_status(db: Session, employee_id: str, device_id: str) -> bool:
        """
        Check if a device has a PIN setup
        
        Args:
            db: Database session
            employee_id: Employee ID
            device_id: Device fingerprint/ID
            
        Returns:
            True if device has PIN setup, False otherwise
        """
        try:
            user = db.query(User).filter(User.employee_id == employee_id).first()
            
            if not user or not user.device_pins:
                return False
            
            return device_id in user.device_pins
            
        except Exception as e:
            logger.exception(f"Error checking device PIN status for {employee_id}")
            return False


device_pin_service = DevicePinService()
