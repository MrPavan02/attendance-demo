"""
Shifts Router
Endpoints for shift management
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List
import uuid

from app.core.database import get_db
from app.schemas.shift import (
    ShiftCreate, ShiftResponse,
    ShiftAssignmentCreate, ShiftAssignmentResponse, BulkShiftAssignment,
    EmployeeWeekOffCreate, EmployeeWeekOffResponse
)
from app.models.shift import Shift, ShiftAssignment, EmployeeWeekOff
from app.dependencies import get_current_active_user, require_hr_role
from app.models.user import User

router = APIRouter(prefix="/shifts", tags=["Shifts"])


# Shift CRUD
@router.post("", response_model=ShiftResponse, status_code=status.HTTP_201_CREATED)
def create_shift(
    shift_data: ShiftCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_role)
):
    """
    Create new shift (HR only)
    """
    # Check if shift ID already exists
    existing = db.query(Shift).filter(Shift.id == shift_data.id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Shift ID already exists"
        )
    
    shift = Shift(**shift_data.dict())
    db.add(shift)
    db.commit()
    db.refresh(shift)
    return shift


@router.get("", response_model=List[ShiftResponse])
def get_all_shifts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get all shifts
    """
    return db.query(Shift).all()


@router.get("/{shift_id}", response_model=ShiftResponse)
def get_shift_by_id(
    shift_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get shift by ID
    """
    shift = db.query(Shift).filter(Shift.id == shift_id).first()
    if not shift:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shift not found"
        )
    return shift


# Shift Assignment
@router.post("/assignments", response_model=ShiftAssignmentResponse, status_code=status.HTTP_201_CREATED)
def create_shift_assignment(
    assignment_data: ShiftAssignmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_role)
):
    """
    Create shift assignment for employee (HR only)
    """
    from datetime import datetime
    
    # Verify shift exists
    shift = db.query(Shift).filter(Shift.id == assignment_data.shift_id).first()
    if not shift:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shift not found"
        )
    
    assignment = ShiftAssignment(
        id=str(uuid.uuid4()),
        employee_id=assignment_data.employee_id,
        shift_id=assignment_data.shift_id,
        date=assignment_data.date,
        effective_from=assignment_data.effective_from or datetime.utcnow(),
        effective_to=assignment_data.effective_to,
        assigned_by=current_user.employee_id
    )
    
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    return assignment


@router.post("/assignments/bulk", status_code=status.HTTP_201_CREATED)
def create_bulk_shift_assignments(
    bulk_data: BulkShiftAssignment,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_role)
):
    """
    Create multiple shift assignments at once (HR only)
    """
    from datetime import datetime
    
    created_assignments = []
    
    for assignment_data in bulk_data.assignments:
        # Verify shift exists
        shift = db.query(Shift).filter(Shift.id == assignment_data.shift_id).first()
        if not shift:
            continue  # Skip invalid shifts
        
        # Remove existing assignment for same employee and date
        db.query(ShiftAssignment).filter(
            ShiftAssignment.employee_id == assignment_data.employee_id,
            ShiftAssignment.date == assignment_data.date
        ).delete()
        
        assignment = ShiftAssignment(
            id=str(uuid.uuid4()),
            employee_id=assignment_data.employee_id,
            shift_id=assignment_data.shift_id,
            date=assignment_data.date,
            effective_from=assignment_data.effective_from or datetime.utcnow(),
            effective_to=assignment_data.effective_to,
            assigned_by=current_user.employee_id
        )
        
        db.add(assignment)
        created_assignments.append(assignment)
    
    db.commit()
    
    return {
        "message": f"Created {len(created_assignments)} shift assignments",
        "count": len(created_assignments)
    }


@router.get("/assignments/{employee_id}", response_model=List[ShiftAssignmentResponse])
def get_employee_shift_assignments(
    employee_id: str,
    start_date: str = Query(None, pattern=r"^\d{4}-\d{2}-\d{2}$"),
    end_date: str = Query(None, pattern=r"^\d{4}-\d{2}-\d{2}$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get shift assignments for employee
    """
    # Employees can only view their own assignments (unless HR)
    if current_user.role.value != "HR" and employee_id != current_user.employee_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Can only view your own shift assignments"
        )
    
    query = db.query(ShiftAssignment).filter(
        ShiftAssignment.employee_id == employee_id
    )
    
    if start_date:
        query = query.filter(ShiftAssignment.date >= start_date)
    if end_date:
        query = query.filter(ShiftAssignment.date <= end_date)
    
    return query.order_by(ShiftAssignment.date).all()


@router.get("/assignments/{employee_id}/date/{date}", response_model=ShiftAssignmentResponse)
def get_employee_shift_for_date(
    employee_id: str,
    date: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get shift assignment for employee on specific date
    """
    # Employees can only view their own assignments (unless HR)
    if current_user.role.value != "HR" and employee_id != current_user.employee_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Can only view your own shift assignments"
        )
    
    assignment = db.query(ShiftAssignment).filter(
        ShiftAssignment.employee_id == employee_id,
        ShiftAssignment.date == date
    ).first()
    
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No shift assignment found for this date"
        )
    
    return assignment


# Week-off Management
@router.post("/week-offs", response_model=EmployeeWeekOffResponse, status_code=status.HTTP_201_CREATED)
def create_or_update_week_off(
    week_off_data: EmployeeWeekOffCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_role)
):
    """
    Create or update employee week-off configuration (HR only)
    """
    # Check if exists
    existing = db.query(EmployeeWeekOff).filter(
        EmployeeWeekOff.employee_id == week_off_data.employee_id
    ).first()
    
    if existing:
        # Update
        existing.week_offs = week_off_data.week_offs
        db.commit()
        db.refresh(existing)
        return existing
    
    # Create new
    week_off = EmployeeWeekOff(
        id=str(uuid.uuid4()),
        employee_id=week_off_data.employee_id,
        week_offs=week_off_data.week_offs
    )
    
    db.add(week_off)
    db.commit()
    db.refresh(week_off)
    return week_off


@router.get("/week-offs/{employee_id}", response_model=EmployeeWeekOffResponse)
def get_employee_week_offs(
    employee_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get week-off configuration for employee
    """
    # Employees can only view their own week-offs (unless HR)
    if current_user.role.value != "HR" and employee_id != current_user.employee_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Can only view your own week-off configuration"
        )
    
    week_off = db.query(EmployeeWeekOff).filter(
        EmployeeWeekOff.employee_id == employee_id
    ).first()
    
    if not week_off:
        # Return default week-offs (Saturday and Sunday)
        return EmployeeWeekOffResponse(
            id="default",
            employee_id=employee_id,
            week_offs=[0, 6],
            created_at=None,
            updated_at=None
        )
    
    return week_off
