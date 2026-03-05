"""
Authentication Router
Endpoints for user authentication and management
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import logging

from app.core.database import get_db
from app.core.exceptions import ValidationError, NotFoundError, AuthenticationError
from app.schemas.user import UserCreate, UserResponse, Token, LoginRequest, LoginResponse
from app.schemas.device_pin import DevicePinSetup, DevicePinVerify, DevicePinResponse
from app.core.schemas import SuccessResponse, MessageResponse, ResponseStatus
from app.services.auth_service import auth_service
from app.services.device_pin_service import device_pin_service
from app.dependencies import get_current_active_user, require_hr_role
from app.models.user import User

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=SuccessResponse, status_code=status.HTTP_201_CREATED)
def register_user(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_role)
):
    """
    Register a new user (HR only)
    
    Returns:
    - 201: User created successfully
    - 400: Validation error
    - 401: Unauthorized
    - 403: Not HR role
    """
    try:
        logger.info(f"HR {current_user.employee_id} registering new user {user_data.employee_id}")
        user = auth_service.create_user(db, user_data)
        logger.info(f"New user registered: {user.employee_id}")
        
        return SuccessResponse(
            status=ResponseStatus.SUCCESS,
            message=f"User {user.employee_id} registered successfully",
            data=UserResponse.from_orm(user)
        )
    except ValidationError as e:
        logger.warning(f"Registration validation error: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.message
        )
    except Exception as e:
        logger.exception(f"Registration error for user {user_data.employee_id}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to register user"
        )


@router.post("/login", response_model=SuccessResponse, status_code=status.HTTP_200_OK)
def login(
    login_data: LoginRequest,
    db: Session = Depends(get_db)
):
    """
    Login with employee ID and password.
    
    Returns:
    - 200: Login successful with access token
    - 401: Invalid credentials
    - 422: Validation error
    
    Response format:
    ```json
    {
      "status": "success",
      "message": "Login successful",
      "data": {
        "access_token": "eyJ...",
        "token_type": "bearer",
        "user": { ... }
      }
    }
    ```
    """
    try:
        logger.info(f"Login attempt for employee: {login_data.employee_id}")
        
        user = auth_service.authenticate_user(
            db,
            login_data.employee_id,
            login_data.password
        )
        
        if not user:
            logger.warning(f"Failed login attempt for employee: {login_data.employee_id}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid employee ID or password"
            )
        
        token_data = auth_service.create_access_token_for_user(user)
        logger.info(f"Successful login for employee: {login_data.employee_id}")
        
        return SuccessResponse(
            status=ResponseStatus.SUCCESS,
            message="Login successful",
            data=LoginResponse(
                access_token=token_data.access_token,
                token_type=token_data.token_type,
                user=UserResponse.from_orm(user)
            )
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Unexpected error during login for {login_data.employee_id}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed. Please try again later."
        )


@router.get("/me", response_model=SuccessResponse)
def get_current_user_info(
    current_user: User = Depends(get_current_active_user)
):
    """
    Get current authenticated user information.
    
    Returns:
    - 200: User information
    - 401: Not authenticated
    """
    try:
        logger.debug(f"Fetching user info for {current_user.employee_id}")
        
        return SuccessResponse(
            status=ResponseStatus.SUCCESS,
            message="User information retrieved",
            data=UserResponse.from_orm(current_user)
        )
    except Exception as e:
        logger.exception(f"Error fetching user info for {current_user.employee_id}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve user information"
        )


@router.post("/logout", response_model=MessageResponse)
def logout(current_user: User = Depends(get_current_active_user)):
    """
    Logout the current user.
    
    Note: Since we're using JWT tokens, logout is primarily for client-side cleanup.
    The server will still accept the token until it expires.
    
    Returns:
    - 200: Logout successful
    - 401: Not authenticated
    """
    try:
        logger.info(f"User logout: {current_user.employee_id}")
        
        return MessageResponse(
            status=ResponseStatus.SUCCESS,
            message="Logout successful. Please discard the token on the client side."
        )
    except Exception as e:
        logger.exception(f"Error during logout for {current_user.employee_id}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Logout failed"
        )


@router.post("/setup-pin", response_model=SuccessResponse, status_code=status.HTTP_200_OK)
def setup_device_pin(
    pin_data: DevicePinSetup,
    db: Session = Depends(get_db)
):
    """
    Setup or update device-specific PIN for biometric fallback
    
    Args:
        pin_data: Device PIN setup data including employee_id, device_id, and PIN
    
    Returns:
        - 200: PIN setup successful
        - 400: Invalid data
        - 404: User not found
        - 500: Server error
    """
    try:
        logger.info(f"Setting up device PIN for {pin_data.employee_id} on device {pin_data.device_id[:8]}...")
        
        # Validate PIN format (must be digits only)
        if not pin_data.pin.isdigit():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="PIN must contain only digits"
            )
        
        success = device_pin_service.setup_device_pin(
            db,
            pin_data.employee_id,
            pin_data.device_id,
            pin_data.pin
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found or PIN setup failed"
            )
        
        return SuccessResponse(
            status=ResponseStatus.SUCCESS,
            message="Device PIN setup successful",
            data={"device_id": pin_data.device_id}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error setting up device PIN for {pin_data.employee_id}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to setup device PIN"
        )


@router.post("/verify-pin", response_model=SuccessResponse, status_code=status.HTTP_200_OK)
def verify_device_pin(
    pin_data: DevicePinVerify,
    db: Session = Depends(get_db)
):
    """
    Verify device-specific PIN
    
    Args:
        pin_data: Device PIN verification data including employee_id, device_id, and PIN
    
    Returns:
        - 200: Verification result (verified true/false)
        - 400: Invalid data
        - 500: Server error
    """
    try:
        logger.info(f"Verifying device PIN for {pin_data.employee_id} on device {pin_data.device_id[:8]}...")
        
        is_valid = device_pin_service.verify_device_pin(
            db,
            pin_data.employee_id,
            pin_data.device_id,
            pin_data.pin
        )
        
        if is_valid:
            return SuccessResponse(
                status=ResponseStatus.SUCCESS,
                message="PIN verified successfully",
                data=DevicePinResponse(
                    verified=True,
                    device_id=pin_data.device_id
                )
            )
        else:
            return SuccessResponse(
                status=ResponseStatus.ERROR,
                message="Invalid PIN",
                data=DevicePinResponse(
                    verified=False,
                    device_id=pin_data.device_id
                )
            )
        
    except Exception as e:
        logger.exception(f"Error verifying device PIN for {pin_data.employee_id}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to verify device PIN"
        )


@router.get("/device-pin-status/{employee_id}/{device_id}", response_model=SuccessResponse)
def check_device_pin_status(
    employee_id: str,
    device_id: str,
    db: Session = Depends(get_db)
):
    """
    Check if a device has a PIN setup for the given employee
    
    Args:
        employee_id: Employee ID
        device_id: Device fingerprint/ID
    
    Returns:
        - 200: Status information
        - 500: Server error
    """
    try:
        has_pin = device_pin_service.get_device_pin_status(db, employee_id, device_id)
        
        return SuccessResponse(
            status=ResponseStatus.SUCCESS,
            message="Device PIN status retrieved",
            data={"has_pin": has_pin, "device_id": device_id}
        )
        
    except Exception as e:
        logger.exception(f"Error checking device PIN status for {employee_id}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to check device PIN status"
        )
