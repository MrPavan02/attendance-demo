"""
Employees Router
Endpoints for employee management
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import logging

from app.core.database import get_db
from app.schemas.user import UserResponse
from app.core.schemas import SuccessResponse, ResponseStatus
from app.services.auth_service import auth_service
from app.dependencies import get_current_active_user, require_hr_role
from app.models.user import User

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/employees", tags=["Employees"])


@router.get("", response_model=SuccessResponse)
def get_all_employees(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    department: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get all employees with pagination.
    HR can see all employees, employees can see department colleagues.
    
    Query Parameters:
    - skip: Number of records to skip (default: 0)
    - limit: Number of records to return (default: 100, max: 1000)
    - department: Filter by department (HR only)
    
    Returns:
    - 200: List of employees
    - 401: Unauthorized
    - 500: Internal server error
    """
    try:
        logger.info(f"Fetching employees - skip={skip}, limit={limit}, department={department}")
        
        if current_user.role.value == "HR":
            if department:
                employees = auth_service.get_users_by_department(db, department)
            else:
                employees = auth_service.get_all_users(db, skip, limit)
        else:
            # Employees can only see their department
            employees = auth_service.get_users_by_department(db, current_user.department)
        
        return SuccessResponse(
            status=ResponseStatus.SUCCESS,
            message=f"Retrieved {len(employees)} employee(s)",
            data=[UserResponse.from_orm(emp) for emp in employees]
        )
    except Exception as e:
        logger.exception(f"Error fetching employees")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve employees"
        )


@router.get("/{employee_id}", response_model=SuccessResponse)
def get_employee_by_id(
    employee_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get employee by ID.
    Employees can view their own profile or department colleagues; HR can view anyone.
    
    Parameters:
    - employee_id: Employee ID
    
    Returns:
    - 200: Employee information
    - 401: Unauthorized
    - 403: Insufficient permissions
    - 404: Employee not found
    - 500: Internal server error
    """
    try:
        logger.info(f"Fetching employee {employee_id}")
        
        user = auth_service.get_user_by_employee_id(db, employee_id)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Employee not found"
            )
        
        # Employees can only view their own profile or department colleagues (unless HR)
        if current_user.role.value != "HR":
            if employee_id != current_user.employee_id and user.department != current_user.department:
                logger.warning(f"Unauthorized access to employee {employee_id} by {current_user.employee_id}")
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Can only view employees in your department"
                )
        
        return SuccessResponse(
            status=ResponseStatus.SUCCESS,
            message=f"Employee information for {employee_id}",
            data=UserResponse.from_orm(user)
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error fetching employee {employee_id}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve employee information"
        )


@router.get("/department/{department}", response_model=SuccessResponse)
def get_employees_by_department(
    department: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get all employees in a specific department.
    Employees can only view their own department; HR can view any.
    
    Parameters:
    - department: Department name
    
    Returns:
    - 200: List of employees in department
    - 401: Unauthorized
    - 403: Insufficient permissions
    - 500: Internal server error
    """
    try:
        logger.info(f"Fetching employees for department: {department}")
        
        # Employees can only view their own department (unless HR)
        if current_user.role.value != "HR" and department != current_user.department:
            logger.warning(f"Unauthorized department access: {current_user.employee_id} for {department}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Can only view employees in your department"
            )
        
        employees = auth_service.get_users_by_department(db, department)
        
        return SuccessResponse(
            status=ResponseStatus.SUCCESS,
            message=f"Retrieved {len(employees)} employee(s) from {department}",
            data=[UserResponse.from_orm(emp) for emp in employees]
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error fetching employees for department {department}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve department employees"
        )
