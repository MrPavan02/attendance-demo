"""
Comprehensive Database Seeding Script
Creates realistic dummy data for all entities in the attendance system
"""
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from datetime import datetime, timedelta, date as date_type
import random
import uuid
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.core.security import get_password_hash
from app.models.user import User, UserRole
from app.models.shift import Shift, ShiftAssignment, EmployeeWeekOff
from app.models.attendance import AttendanceEntry, AttendanceLock, AttendanceType, WorkMode, VerificationMethod
from app.models.request import (
    RegularizationRequest, ShiftChangeRequest, 
    OvertimeRequest, PermissionRequest, 
    RequestStatus, RegularizationType
)
from app.models.holiday import Holiday


def generate_attendance_entries(db: Session, employees: list, days_back=30):
    """Generate attendance entries for past 30 days"""
    print(f"\nGenerating attendance entries for last {days_back} days...")
    
    shifts = db.query(Shift).all()
    shift_map = {s.id: s for s in shifts}
    
    for emp in employees:
        if emp.role == UserRole.HR:
            continue  # HR might not have regular attendance
            
        # Assign a shift to the employee
        assigned_shift = random.choice(shifts)
        
        for day_offset in range(days_back):
            current_date = datetime.now().date() - timedelta(days=day_offset)
            
            # Skip weekends (randomly)
            if current_date.weekday() in [5, 6] and random.random() < 0.7:
                continue
            
            # 90% attendance rate
            if random.random() > 0.9:
                continue
            
            # Generate check-in time (with some variation)
            check_in_hour = int(assigned_shift.start_time.split(':')[0])
            check_in_minute = int(assigned_shift.start_time.split(':')[1])
            
            # Add randomness: -30 to +60 minutes
            time_variation = random.randint(-30, 60)
            check_in_time = datetime.combine(
                current_date,
                datetime.strptime(f"{check_in_hour}:{check_in_minute}", "%H:%M").time()
            ) + timedelta(minutes=time_variation)
            
            # Check-in entry
            import uuid
            check_in = AttendanceEntry(
                id=str(uuid.uuid4()),
                employee_id=emp.employee_id,
                timestamp=check_in_time,
                type=AttendanceType.IN,
                mode=random.choice([WorkMode.OFFICE, WorkMode.WFH, WorkMode.BRANCH]),
                latitude=13.0827 + random.uniform(-0.01, 0.01),  # Bangalore office
                longitude=77.5877 + random.uniform(-0.01, 0.01),
                is_flagged=time_variation > 30,  # Flag if late
                device_id=f"DEVICE-{emp.employee_id}",
                verification_method=VerificationMethod.BIOMETRIC,
                image_data=f"base64_image_data_{emp.employee_id}_{current_date.isoformat()}"
            )
            db.add(check_in)
            
            # Generate check-out time
            check_out_hour = int(assigned_shift.end_time.split(':')[0])
            check_out_minute = int(assigned_shift.end_time.split(':')[1])
            
            # Work duration: 8-10 hours usually
            work_duration = random.randint(480, 600)  # minutes
            check_out_time = check_in_time + timedelta(minutes=work_duration)
            
            # 95% chance of checking out
            if random.random() < 0.95:
                check_out = AttendanceEntry(
                    id=str(uuid.uuid4()),
                    employee_id=emp.employee_id,
                    timestamp=check_out_time,
                    type=AttendanceType.OUT,
                    mode=check_in.mode,
                    latitude=check_in.latitude,
                    longitude=check_in.longitude,
                    is_flagged=False,
                    device_id=check_in.device_id,
                    verification_method=VerificationMethod.BIOMETRIC,
                    image_data=f"base64_image_data_{emp.employee_id}_{current_date.isoformat()}_out",
                    duration=work_duration / 60  # hours
                )
                db.add(check_out)
        
        # Create shift assignment
        shift_assignment = ShiftAssignment(
            id=str(uuid.uuid4()),
            employee_id=emp.employee_id,
            shift_id=assigned_shift.id,
            date=datetime.now().date(),
            effective_from=datetime.now() - timedelta(days=days_back)
        )
        db.add(shift_assignment)
        
        # Set week offs
        week_off = EmployeeWeekOff(
            id=str(uuid.uuid4()),
            employee_id=emp.employee_id,
            week_offs=[0, 6]  # Sunday and Saturday
        )
        db.add(week_off)
    
    db.commit()
    print(f"âœ“ Generated attendance entries for {len(employees)} employees")


def generate_requests(db: Session, employees: list):
    """Generate various types of requests"""
    print("\nGenerating employee requests...")
    
    emp_employees = [e for e in employees if e.role == UserRole.EMPLOYEE]
    shifts = db.query(Shift).all()
    
    # Regularization Requests
    for i in range(15):
        emp = random.choice(emp_employees)
        past_date = datetime.now().date() - timedelta(days=random.randint(1, 30))
        
        reg_request = RegularizationRequest(
            id=str(uuid.uuid4()),
            employee_id=emp.employee_id,
            date=past_date,
            type=random.choice([
                RegularizationType.MISSED_CHECKIN,
                RegularizationType.MISSED_CHECKOUT,
                RegularizationType.FULL_DAY
            ]),
            reason=random.choice([
                "Forgot to check in from mobile",
                "Internet connectivity issues",
                "System was not accessible",
                "Was in meeting, forgot to mark attendance",
                "Device battery died"
            ]),
            requested_login_time="09:00" if random.random() < 0.5 else "09:30",
            requested_logout_time="18:00" if random.random() < 0.5 else "18:30",
            status=random.choice([
                RequestStatus.PENDING,
                RequestStatus.APPROVED,
                RequestStatus.REJECTED
            ])
        )
        
        if reg_request.status in [RequestStatus.APPROVED, RequestStatus.REJECTED]:
            reg_request.decision_date = datetime.now() - timedelta(days=random.randint(0, 5))
            reg_request.manager_name = "HR Admin"
            
        db.add(reg_request)
    
    # Shift Change Requests
    for i in range(10):
        emp = random.choice(emp_employees)
        future_date = datetime.now().date() + timedelta(days=random.randint(1, 15))
        current_shift = random.choice(shifts)
        new_shift = random.choice([s for s in shifts if s.id != current_shift.id])
        
        shift_request = ShiftChangeRequest(
            id=str(uuid.uuid4()),
            employee_id=emp.employee_id,
            date=future_date,
            current_shift_id=current_shift.id,
            requested_shift_id=new_shift.id,
            reason=random.choice([
                "Personal commitment in the evening",
                "Health reasons - need morning shift",
                "Transportation issues with current shift",
                "Family emergency requires schedule change"
            ]),
            status=random.choice([
                RequestStatus.PENDING,
                RequestStatus.APPROVED,
                RequestStatus.REJECTED
            ])
        )
        
        if shift_request.status in [RequestStatus.APPROVED, RequestStatus.REJECTED]:
            shift_request.decision_date = datetime.now() - timedelta(days=random.randint(0, 3))
            shift_request.manager_name = "HR Admin"
            
        db.add(shift_request)
    
    # Overtime Requests
    for i in range(12):
        emp = random.choice(emp_employees)
        past_date = datetime.now().date() - timedelta(days=random.randint(1, 20))
        
        ot_request = OvertimeRequest(
            id=str(uuid.uuid4()),
            employee_id=emp.employee_id,
            date=past_date,
            hours=random.choice([1.5, 2.0, 2.5, 3.0, 4.0]),
            reason=random.choice([
                "Critical project deadline",
                "Production deployment",
                "Emergency bug fixes",
                "Client meeting extended beyond work hours",
                "System maintenance activity"
            ]),
            status=random.choice([
                RequestStatus.PENDING,
                RequestStatus.APPROVED,
                RequestStatus.REJECTED
            ])
        )
        
        if ot_request.status in [RequestStatus.APPROVED, RequestStatus.REJECTED]:
            ot_request.decision_date = datetime.now() - timedelta(days=random.randint(0, 5))
            ot_request.manager_name = "HR Admin"
            
        db.add(ot_request)
    
    # Permission Requests
    for i in range(20):
        emp = random.choice(emp_employees)
        req_date = datetime.now().date() + timedelta(days=random.randint(-10, 10))
        
        # Random time range
        start_hour = random.randint(10, 14)
        duration = random.choice([1, 1.5, 2, 2.5, 3])
        end_hour = start_hour + int(duration)
        
        perm_request = PermissionRequest(
            id=str(uuid.uuid4()),
            employee_id=emp.employee_id,
            date=req_date,
            from_time=f"{start_hour}:00",
            to_time=f"{end_hour}:00",
            hours=duration,
            reason=random.choice([
                "Doctor's appointment",
                "Bank visit for urgent work",
                "Personal emergency",
                "Vehicle service",
                "Government office visit",
                "Family function"
            ]),
            status=random.choice([
                RequestStatus.PENDING,
                RequestStatus.APPROVED,
                RequestStatus.REJECTED
            ])
        )
        
        if perm_request.status in [RequestStatus.APPROVED, RequestStatus.REJECTED]:
            perm_request.decision_date = datetime.now() - timedelta(days=random.randint(0, 3))
            perm_request.manager_name = "HR Admin"
            
        db.add(perm_request)
    
    db.commit()
    print("âœ“ Generated regularization, shift change, overtime, and permission requests")


def generate_holidays(db: Session):
    """Generate holiday calendar"""
    print("\nGenerating holidays...")
    
    holidays_data = [
        # Indian Holidays 2024
        {"name": "Republic Day", "date": "2024-01-26", "country": "India", "state": "All"},
        {"name": "Holi", "date": "2024-03-25", "country": "India", "state": "All"},
        {"name": "Ugadi", "date": "2024-04-09", "country": "India", "state": "Karnataka"},
        {"name": "Good Friday", "date": "2024-03-29", "country": "India", "state": "All"},
        {"name": "May Day", "date": "2024-05-01", "country": "India", "state": "Karnataka"},
        {"name": "Independence Day", "date": "2024-08-15", "country": "India", "state": "All"},
        {"name": "Gandhi Jayanti", "date": "2024-10-02", "country": "India", "state": "All"},
        {"name": "Diwali", "date": "2024-11-01", "country": "India", "state": "All"},
        {"name": "Kannada Rajyotsava", "date": "2024-11-01", "country": "India", "state": "Karnataka"},
        {"name": "Christmas", "date": "2024-12-25", "country": "India", "state": "All"},
        
        # 2026 Holidays (current year)
        {"name": "Republic Day", "date": "2026-01-26", "country": "India", "state": "All"},
        {"name": "Holi", "date": "2026-03-16", "country": "India", "state": "All"},
        {"name": "Good Friday", "date": "2026-04-03", "country": "India", "state": "All"},
        {"name": "Ugadi", "date": "2026-03-22", "country": "India", "state": "Karnataka"},
        {"name": "May Day", "date": "2026-05-01", "country": "India", "state": "Karnataka"},
        {"name": "Independence Day", "date": "2026-08-15", "country": "India", "state": "All"},
        {"name": "Gandhi Jayanti", "date": "2026-10-02", "country": "India", "state": "All"},
        {"name": "Diwali", "date": "2026-10-19", "country": "India", "state": "All"},
        {"name": "Kannada Rajyotsava", "date": "2026-11-01", "country": "India", "state": "Karnataka"},
        {"name": "Christmas", "date": "2026-12-25", "country": "India", "state": "All"},
    ]
    
    for hol_data in holidays_data:
        existing = db.query(Holiday).filter(
            Holiday.date == hol_data["date"],
            Holiday.name == hol_data["name"]
        ).first()
        
        if not existing:
            holiday = Holiday(id=str(uuid.uuid4()), **hol_data)
            db.add(holiday)
            print(f"  âœ“ Added holiday: {hol_data['name']} on {hol_data['date']}")
    
    db.commit()
    print("âœ“ Holidays seeded")


def lock_past_dates(db: Session, days_to_lock=7):
    """Lock attendance for dates older than specified days"""
    print(f"\nLocking attendance for dates older than {days_to_lock} days...")
    
    cutoff_date = datetime.now().date() - timedelta(days=days_to_lock)
    
    attendance_lock = AttendanceLock(
        id=str(uuid.uuid4()),
        date=cutoff_date,
        locked_by="EMP001",
        locked_at=datetime.now()
    )
    db.add(attendance_lock)
    db.commit()
    
    print(f"âœ“ Locked attendance up to {cutoff_date}")


def main():
    """Main seeding function"""
    print("=" * 70)
    print("  Comprehensive Data Seeding for Attendance System")
    print("=" * 70)
    
    db = SessionLocal()
    
    try:
        # Get existing users
        users = db.query(User).all()
        
        if not users:
            print("âŒ No users found. Please run seed_data.py first to create users.")
            return
        
        print(f"\nâœ“ Found {len(users)} existing users")
        
        # Generate data
        generate_attendance_entries(db, users, days_back=30)
        generate_requests(db, users)
        generate_holidays(db)
        lock_past_dates(db, days_to_lock=7)
        
        print("\n" + "=" * 70)
        print("  âœ“ Comprehensive data seeding completed successfully!")
        print("=" * 70)
        print("\nDatabase now contains:")
        print(f"  - {db.query(User).count()} Users")
        print(f"  - {db.query(AttendanceEntry).count()} Attendance Entries")
        print(f"  - {db.query(ShiftAssignment).count()} Shift Assignments")
        print(f"  - {db.query(RegularizationRequest).count()} Regularization Requests")
        print(f"  - {db.query(ShiftChangeRequest).count()} Shift Change Requests")
        print(f"  - {db.query(OvertimeRequest).count()} Overtime Requests")
        print(f"  - {db.query(PermissionRequest).count()} Permission Requests")
        print(f"  - {db.query(Holiday).count()} Holidays")
        print(f"  - {db.query(AttendanceLock).count()} Date Locks")
        print("\n")
        
    except Exception as e:
        print(f"\nâœ— Error during seeding: {str(e)}")
        import traceback
        traceback.print_exc()
        db.rollback()
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()

