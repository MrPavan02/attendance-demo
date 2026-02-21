"""
Requests Router
Endpoints for managing employee requests (regularization, shift change, overtime, permission)
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, datetime
import uuid

from app.core.database import get_db
from app.models.request import (
    RegularizationRequest, ShiftChangeRequest, 
    OvertimeRequest, PermissionRequest, RequestStatus, RegularizationType
)
from app.models.user import User
from app.dependencies import get_current_active_user, require_hr_role

router = APIRouter(prefix="/requests", tags=["Requests"])


# Regularization Requests
@router.get("/regularization", response_model=List[dict])
def get_regularization_requests(
    employee_id: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get regularization requests"""
    query = db.query(RegularizationRequest)
    
    if employee_id:
        query = query.filter(RegularizationRequest.employee_id == employee_id)
    if status_filter:
        query = query.filter(RegularizationRequest.status == status_filter)
    
    requests = query.order_by(RegularizationRequest.submitted_date.desc()).all()
    
    return [
        {
            "id": str(r.id),
            "employeeId": r.employee_id,
            "date": r.date,
            "type": r.type.value if hasattr(r.type, "value") else r.type,
            "reason": r.reason,
            "submittedDate": r.submitted_date.isoformat() if r.submitted_date else None,
            "requestedLoginTime": r.requested_login_time,
            "requestedLogoutTime": r.requested_logout_time,
            "status": r.status.value,
            "managerName": r.manager_name,
            "decisionDate": r.decision_date.isoformat() if r.decision_date else None,
        }
        for r in requests
    ]


@router.post("/regularization")
def create_regularization_request(
    request_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Submit a new regularization request"""
    request = RegularizationRequest(
        id=str(uuid.uuid4()),
        employee_id=request_data["employeeId"],
        date=request_data["date"],
        type=RegularizationType[request_data["type"]],
        reason=request_data["reason"],
        requested_login_time=request_data.get("requestedLoginTime"),
        requested_logout_time=request_data.get("requestedLogoutTime"),
        status=RequestStatus.PENDING
    )
    
    db.add(request)
    db.commit()
    db.refresh(request)
    
    return {"id": str(request.id), "status": "success"}


@router.patch("/regularization/{request_id}")
def update_regularization_request(
    request_id: str,
    action: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_role)
):
    """Update regularization request status (HR only)"""
    request = db.query(RegularizationRequest).filter(RegularizationRequest.id == request_id).first()
    
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    new_status = action.get("status")
    if new_status:
        request.status = RequestStatus[new_status]
        request.manager_name = current_user.name
        request.decision_date = datetime.utcnow()
            
    db.commit()
    return {"status": "success"}


# Shift Change Requests
@router.get("/shift-change", response_model=List[dict])
def get_shift_change_requests(
    employee_id: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get shift change requests"""
    query = db.query(ShiftChangeRequest)
    
    if employee_id:
        query = query.filter(ShiftChangeRequest.employee_id == employee_id)
    if status_filter:
        query = query.filter(ShiftChangeRequest.status == status_filter)
    
    requests = query.order_by(ShiftChangeRequest.submitted_date.desc()).all()
    
    return [
        {
            "id": str(r.id),
            "employeeId": r.employee_id,
            "date": r.date,
            "currentShiftId": r.current_shift_id,
            "requestedShiftId": r.requested_shift_id,
            "reason": r.reason,
            "submittedDate": r.submitted_date.isoformat() if r.submitted_date else None,
            "status": r.status.value,
            "managerName": r.manager_name,
            "decisionDate": r.decision_date.isoformat() if r.decision_date else None,
        }
        for r in requests
    ]


@router.post("/shift-change")
def create_shift_change_request(
    request_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Submit a new shift change request"""
    request = ShiftChangeRequest(
        id=str(uuid.uuid4()),
        employee_id=request_data["employeeId"],
        date=request_data["date"],
        current_shift_id=request_data["currentShiftId"],
        requested_shift_id=request_data["requestedShiftId"],
        reason=request_data["reason"],
        status=RequestStatus.PENDING
    )
    
    db.add(request)
    db.commit()
    db.refresh(request)
    
    return {"id": str(request.id), "status": "success"}


@router.patch("/shift-change/{request_id}")
def update_shift_change_request(
    request_id: str,
    action: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_role)
):
    """Update shift change request status (HR only)"""
    request = db.query(ShiftChangeRequest).filter(ShiftChangeRequest.id == request_id).first()
    
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    new_status = action.get("status")
    if new_status:
        request.status = RequestStatus[new_status]
        request.manager_name = current_user.name
        request.decision_date = datetime.utcnow()
            
    db.commit()
    return {"status": "success"}


# Overtime Requests
@router.get("/overtime", response_model=List[dict])
def get_overtime_requests(
    employee_id: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get overtime requests"""
    query = db.query(OvertimeRequest)
    
    if employee_id:
        query = query.filter(OvertimeRequest.employee_id == employee_id)
    if status_filter:
        query = query.filter(OvertimeRequest.status == status_filter)
    
    requests = query.order_by(OvertimeRequest.submitted_date.desc()).all()
    
    return [
        {
            "id": str(r.id),
            "employeeId": r.employee_id,
            "date": r.date,
            "hours": r.hours,
            "reason": r.reason,
            "submittedDate": r.submitted_date.isoformat() if r.submitted_date else None,
            "status": r.status.value,
            "managerName": r.manager_name,
            "decisionDate": r.decision_date.isoformat() if r.decision_date else None,
        }
        for r in requests
    ]


@router.post("/overtime")
def create_overtime_request(
    request_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Submit a new overtime request"""
    request = OvertimeRequest(
        id=str(uuid.uuid4()),
        employee_id=request_data["employeeId"],
        date=request_data["date"],
        hours=request_data["hours"],
        reason=request_data["reason"],
        status=RequestStatus.PENDING
    )
    
    db.add(request)
    db.commit()
    db.refresh(request)
    
    return {"id": str(request.id), "status": "success"}


@router.patch("/overtime/{request_id}")
def update_overtime_request(
    request_id: str,
    action: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_role)
):
    """Update overtime request status (HR only)"""
    request = db.query(OvertimeRequest).filter(OvertimeRequest.id == request_id).first()
    
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    new_status = action.get("status")
    if new_status:
        request.status = RequestStatus[new_status]
        request.manager_name = current_user.name
        request.decision_date = datetime.utcnow()
            
    db.commit()
    return {"status": "success"}


# Permission Requests
@router.get("/permission", response_model=List[dict])
def get_permission_requests(
    employee_id: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get permission requests"""
    query = db.query(PermissionRequest)
    
    if employee_id:
        query = query.filter(PermissionRequest.employee_id == employee_id)
    if status_filter:
        query = query.filter(PermissionRequest.status == status_filter)
    
    requests = query.order_by(PermissionRequest.submitted_date.desc()).all()
    
    return [
        {
            "id": str(r.id),
            "employeeId": r.employee_id,
            "date": r.date,
            "fromTime": getattr(r, "start_time", None),
            "toTime": getattr(r, "end_time", None),
            "reason": r.reason,
            "submittedDate": r.submitted_date.isoformat() if r.submitted_date else None,
            "status": r.status.value,
            "managerName": r.manager_name,
            "decisionDate": r.decision_date.isoformat() if r.decision_date else None,
        }
        for r in requests
    ]


@router.post("/permission")
def create_permission_request(
    request_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Submit a new permission request"""
    start_time = request_data.get("fromTime") or request_data.get("startTime")
    end_time = request_data.get("toTime") or request_data.get("endTime")
    request = PermissionRequest(
        id=str(uuid.uuid4()),
        employee_id=request_data["employeeId"],
        date=request_data["date"],
        start_time=start_time,
        end_time=end_time,
        reason=request_data["reason"],
        status=RequestStatus.PENDING
    )
    
    db.add(request)
    db.commit()
    db.refresh(request)
    
    return {"id": str(request.id), "status": "success"}


@router.patch("/permission/{request_id}")
def update_permission_request(
    request_id: str,
    action: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_role)
):
    """Update permission request status (HR only)"""
    request = db.query(PermissionRequest).filter(PermissionRequest.id == request_id).first()
    
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    new_status = action.get("status")
    if new_status:
        request.status = RequestStatus[new_status]
        request.manager_name = current_user.name
        request.decision_date = datetime.utcnow()
            
    db.commit()
    return {"status": "success"}
