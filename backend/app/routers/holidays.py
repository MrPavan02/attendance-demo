"""
Holidays Router
Endpoints for managing holidays
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
import uuid
from typing import List, Optional
from datetime import date

from app.core.database import get_db
from app.models.holiday import Holiday
from app.models.user import User
from app.dependencies import get_current_active_user, require_hr_role

router = APIRouter(prefix="/holidays", tags=["Holidays"])


@router.get("/", response_model=List[dict])
def get_holidays(
    country: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    year: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all holidays with optional filtering"""
    query = db.query(Holiday)
    
    if country:
        query = query.filter(Holiday.country == country)
    if state:
        query = query.filter(Holiday.state == state)
    if year:
        query = query.filter(func.extract('year', Holiday.date) == year)
    
    holidays = query.order_by(Holiday.date).all()
    
    return [
        {
            "id": str(h.id),
            "name": h.name,
            "date": h.date.isoformat(),
            "country": h.country,
            "state": h.state
        }
        for h in holidays
    ]


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_holiday(
    holiday_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_role)
):
    """Create a new holiday (HR only)"""
    holiday = Holiday(
        id=str(uuid.uuid4()),
        name=holiday_data["name"],
        date=holiday_data["date"],
        country=holiday_data.get("country", "India"),
        state=holiday_data.get("state", "Karnataka")
    )
    
    db.add(holiday)
    db.commit()
    db.refresh(holiday)
    
    return {"id": str(holiday.id), "status": "success"}


@router.delete("/{holiday_id}")
def delete_holiday(
    holiday_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_role)
):
    """Delete a holiday (HR only)"""
    holiday = db.query(Holiday).filter(Holiday.id == holiday_id).first()
    
    if not holiday:
        raise HTTPException(status_code=404, detail="Holiday not found")
    
    db.delete(holiday)
    db.commit()
    
    return {"status": "success"}
