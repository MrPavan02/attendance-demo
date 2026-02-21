"""
Database seeding script
Creates initial data for the attendance system
"""
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from datetime import datetime, timedelta
import random
import uuid
from sqlalchemy.orm import Session

from app.core.database import SessionLocal, engine, Base
from app.core.security import get_password_hash
from app.models.user import User, UserRole
from app.models.shift import Shift, ShiftAssignment, EmployeeWeekOff
from app.models.holiday import Holiday
from app.models.attendance import AttendanceEntry, AttendanceLock, AttendanceType, WorkMode, VerificationMethod
from app.models.request import (
    RegularizationRequest,
    ShiftChangeRequest,
    OvertimeRequest,
    PermissionRequest,
    RequestStatus,
    RegularizationType,
)


def create_tables():
    """Create all database tables"""
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("✓ Tables created")


def seed_users(db: Session):
    """Seed initial users"""
    print("\nSeeding users...")
    
    users_data = [
        {
            "id": "550e8400-e29b-41d4-a716-446655440001",
            "employee_id": "EMP001",
            "name": "HR Admin",
            "email": "admin@vayuputhra.com",
            "password": "admin123",
            "department": "Human Resources",
            "role": UserRole.HR,
        },
        {
            "id": "550e8400-e29b-41d4-a716-446655440002",
            "employee_id": "EMP002",
            "name": "Alice Johnson",
            "email": "alice@vayuputhra.com",
            "password": "emp123",
            "department": "Engineering",
            "role": UserRole.EMPLOYEE,
        },
        {
            "id": "550e8400-e29b-41d4-a716-446655440003",
            "employee_id": "EMP003",
            "name": "Bob Smith",
            "email": "bob@vayuputhra.com",
            "password": "emp123",
            "department": "Engineering",
            "role": UserRole.EMPLOYEE,
        },
        {
            "id": "550e8400-e29b-41d4-a716-446655440004",
            "employee_id": "EMP004",
            "name": "Charlie Davis",
            "email": "charlie@vayuputhra.com",
            "password": "emp123",
            "department": "Sales",
            "role": UserRole.EMPLOYEE,
        },
        {
            "id": "550e8400-e29b-41d4-a716-446655440005",
            "employee_id": "EMP005",
            "name": "Diana Prince",
            "email": "diana@vayuputhra.com",
            "password": "emp123",
            "department": "Marketing",
            "role": UserRole.EMPLOYEE,
        },
        {
            "id": "550e8400-e29b-41d4-a716-446655440006",
            "employee_id": "EMP006",
            "name": "Ethan Hunt",
            "email": "ethan@vayuputhra.com",
            "password": "emp123",
            "department": "Engineering",
            "role": UserRole.EMPLOYEE,
        }
    ]
    
    for user_data in users_data:
        existing = db.query(User).filter(User.employee_id == user_data["employee_id"]).first()
        if not existing:
            password = user_data.pop("password")
            user = User(
                **user_data,
                hashed_password=get_password_hash(password)
            )
            db.add(user)
            print(f"  ✓ Created user: {user_data['employee_id']} - {user_data['name']}")
        else:
            print(f"  ⊙ User already exists: {user_data['employee_id']}")
    
    db.commit()
    print("✓ Users seeded")


def seed_shifts(db: Session):
    """Seed default shifts"""
    print("\nSeeding shifts...")
    
    shifts_data = [
        {"id": "shift_1", "name": "Shift1", "start_time": "06:00", "end_time": "15:00", "description": "Morning Shift"},
        {"id": "shift_2", "name": "Shift2", "start_time": "09:00", "end_time": "18:00", "description": "General Shift"},
        {"id": "shift_3", "name": "Shift3", "start_time": "12:00", "end_time": "21:00", "description": "Afternoon Shift"},
        {"id": "shift_4", "name": "Shift4", "start_time": "15:00", "end_time": "00:00", "description": "Evening Shift"},
        {"id": "shift_5", "name": "Shift5", "start_time": "21:00", "end_time": "06:00", "description": "Night Shift"},
    ]
    
    for shift_data in shifts_data:
        existing = db.query(Shift).filter(Shift.id == shift_data["id"]).first()
        if not existing:
            shift = Shift(**shift_data)
            db.add(shift)
            print(f"  ✓ Created shift: {shift_data['name']}")
        else:
            print(f"  ⊙ Shift already exists: {shift_data['name']}")
    
    db.commit()
    print("✓ Shifts seeded")


def seed_holidays(db: Session):
    """Seed sample holidays"""
    print("\nSeeding holidays...")
    
    # Current year holidays
    current_year = datetime.now().year
    
    holidays_data = [
        {"date": f"{current_year}-01-01", "name": "New Year's Day", "country": "USA", "state": "All States"},
        {"date": f"{current_year}-01-26", "name": "Republic Day", "country": "India", "state": "All States"},
        {"date": f"{current_year}-03-29", "name": "Good Friday", "country": "USA", "state": "All States"},
        {"date": f"{current_year}-04-09", "name": "Ugadi", "country": "India", "state": "Karnataka"},
        {"date": f"{current_year}-05-01", "name": "May Day", "country": "India", "state": "Karnataka"},
        {"date": f"{current_year}-07-04", "name": "Independence Day", "country": "USA", "state": "All States"},
        {"date": f"{current_year}-08-15", "name": "Independence Day", "country": "India", "state": "All States"},
        {"date": f"{current_year}-10-02", "name": "Gandhi Jayanti", "country": "India", "state": "All States"},
        {"date": f"{current_year}-11-01", "name": "Rajyotsava", "country": "India", "state": "Karnataka"},
        {"date": f"{current_year}-12-25", "name": "Christmas", "country": "USA", "state": "All States"},
    ]
    
    for holiday_data in holidays_data:
        existing = db.query(Holiday).filter(
            Holiday.date == holiday_data["date"],
            Holiday.country == holiday_data["country"],
            Holiday.state == holiday_data["state"]
        ).first()
        
        if not existing:
            holiday = Holiday(id=str(uuid.uuid4()), **holiday_data)
            db.add(holiday)
            print(f"  ✓ Created holiday: {holiday_data['name']} ({holiday_data['date']})")
        else:
            print(f"  ⊙ Holiday already exists: {holiday_data['name']}")
    
    db.commit()
    print("✓ Holidays seeded")


def seed_week_offs_and_shifts(db: Session):
    """Seed week-offs and shift assignments"""
    print("\nSeeding week-offs and shift assignments...")

    shifts = db.query(Shift).all()
    users = db.query(User).all()
    today = datetime.now().date().isoformat()
    effective_from = datetime.now() - timedelta(days=30)

    for user in users:
        # Week offs
        existing_week_off = db.query(EmployeeWeekOff).filter(
            EmployeeWeekOff.employee_id == user.employee_id
        ).first()
        if not existing_week_off:
            week_off = EmployeeWeekOff(
                id=str(uuid.uuid4()),
                employee_id=user.employee_id,
                week_offs=[0, 6],
            )
            db.add(week_off)

        # Shift assignments for employees only
        if user.role == UserRole.EMPLOYEE and shifts:
            assigned_shift = random.choice(shifts)
            existing_assignment = db.query(ShiftAssignment).filter(
                ShiftAssignment.employee_id == user.employee_id,
                ShiftAssignment.date == today,
            ).first()
            if not existing_assignment:
                assignment = ShiftAssignment(
                    id=str(uuid.uuid4()),
                    employee_id=user.employee_id,
                    shift_id=assigned_shift.id,
                    date=today,
                    effective_from=effective_from,
                    assigned_by="EMP001",
                )
                db.add(assignment)

    db.commit()
    print("✓ Week-offs and shift assignments seeded")


def seed_attendance_entries(db: Session, days_back: int = 14):
    """Seed attendance entries for employees"""
    print("\nSeeding attendance entries...")

    users = db.query(User).filter(User.role == UserRole.EMPLOYEE).all()
    shifts = db.query(Shift).all()
    if not users or not shifts:
        print("  ⊙ Skipping attendance entries (missing users or shifts)")
        return

    for user in users:
        shift = random.choice(shifts)
        start_hour, start_minute = map(int, shift.start_time.split(":"))

        for day_offset in range(days_back):
            current_date = datetime.now().date() - timedelta(days=day_offset)

            if current_date.weekday() in [5, 6] and random.random() < 0.6:
                continue

            if random.random() > 0.9:
                continue

            check_in_time = datetime.combine(
                current_date,
                datetime.strptime(f"{start_hour}:{start_minute}", "%H:%M").time(),
            ) + timedelta(minutes=random.randint(-10, 45))

            check_out_time = check_in_time + timedelta(hours=random.randint(8, 10))

            check_in = AttendanceEntry(
                id=str(uuid.uuid4()),
                employee_id=user.employee_id,
                timestamp=check_in_time,
                type=AttendanceType.IN,
                mode=random.choice([WorkMode.OFFICE, WorkMode.WFH, WorkMode.BRANCH]),
                latitude=12.9716 + random.uniform(-0.02, 0.02),
                longitude=77.5946 + random.uniform(-0.02, 0.02),
                is_flagged=False,
                device_id=f"DEVICE-{user.employee_id}",
                verification_method=VerificationMethod.BIOMETRIC,
                image_data=f"base64_image_data_{user.employee_id}_{current_date.isoformat()}_in",
            )
            db.add(check_in)

            check_out = AttendanceEntry(
                id=str(uuid.uuid4()),
                employee_id=user.employee_id,
                timestamp=check_out_time,
                type=AttendanceType.OUT,
                mode=check_in.mode,
                latitude=check_in.latitude,
                longitude=check_in.longitude,
                is_flagged=False,
                device_id=check_in.device_id,
                verification_method=VerificationMethod.BIOMETRIC,
                duration=round((check_out_time - check_in_time).total_seconds() / 3600, 2),
                image_data=f"base64_image_data_{user.employee_id}_{current_date.isoformat()}_out",
            )
            db.add(check_out)

    db.commit()
    print("✓ Attendance entries seeded")


def seed_requests(db: Session):
    """Seed regularization, shift change, overtime, and permission requests"""
    print("\nSeeding requests...")

    employees = db.query(User).filter(User.role == UserRole.EMPLOYEE).all()
    shifts = db.query(Shift).all()
    if not employees or not shifts:
        print("  ⊙ Skipping requests (missing employees or shifts)")
        return

    for _ in range(8):
        employee = random.choice(employees)
        req_date = (datetime.now().date() - timedelta(days=random.randint(1, 20))).isoformat()
        status = random.choice([RequestStatus.PENDING, RequestStatus.APPROVED, RequestStatus.REJECTED])

        request = RegularizationRequest(
            id=str(uuid.uuid4()),
            employee_id=employee.employee_id,
            date=req_date,
            type=random.choice([
                RegularizationType.MISSED_CHECKIN,
                RegularizationType.MISSED_CHECKOUT,
                RegularizationType.FULL_DAY,
            ]),
            reason="Missed attendance due to system issues",
            requested_login_time="09:30",
            requested_logout_time="18:30",
            status=status,
            manager_name="HR Admin" if status in [RequestStatus.APPROVED, RequestStatus.REJECTED] else None,
            decision_date=datetime.now() if status in [RequestStatus.APPROVED, RequestStatus.REJECTED] else None,
        )
        db.add(request)

    for _ in range(6):
        employee = random.choice(employees)
        current_shift = random.choice(shifts)
        requested_shift = random.choice([s for s in shifts if s.id != current_shift.id])
        status = random.choice([RequestStatus.PENDING, RequestStatus.APPROVED, RequestStatus.REJECTED])
        request = ShiftChangeRequest(
            id=str(uuid.uuid4()),
            employee_id=employee.employee_id,
            current_shift_id=current_shift.id,
            requested_shift_id=requested_shift.id,
            date=(datetime.now().date() + timedelta(days=random.randint(1, 15))).isoformat(),
            reason="Personal schedule adjustment",
            status=status,
            manager_name="HR Admin" if status in [RequestStatus.APPROVED, RequestStatus.REJECTED] else None,
            decision_date=datetime.now() if status in [RequestStatus.APPROVED, RequestStatus.REJECTED] else None,
        )
        db.add(request)

    for _ in range(6):
        employee = random.choice(employees)
        status = random.choice([RequestStatus.PENDING, RequestStatus.APPROVED, RequestStatus.REJECTED])
        request = OvertimeRequest(
            id=str(uuid.uuid4()),
            employee_id=employee.employee_id,
            date=(datetime.now().date() - timedelta(days=random.randint(1, 15))).isoformat(),
            hours=random.choice([1.5, 2.0, 2.5, 3.0]),
            reason="Project delivery support",
            status=status,
            manager_name="HR Admin" if status in [RequestStatus.APPROVED, RequestStatus.REJECTED] else None,
            decision_date=datetime.now() if status in [RequestStatus.APPROVED, RequestStatus.REJECTED] else None,
        )
        db.add(request)

    for _ in range(8):
        employee = random.choice(employees)
        status = random.choice([RequestStatus.PENDING, RequestStatus.APPROVED, RequestStatus.REJECTED])
        start_hour = random.randint(10, 15)
        end_hour = start_hour + random.choice([1, 2, 3])
        request = PermissionRequest(
            id=str(uuid.uuid4()),
            employee_id=employee.employee_id,
            date=(datetime.now().date() + timedelta(days=random.randint(-5, 10))).isoformat(),
            start_time=f"{start_hour:02d}:00",
            end_time=f"{end_hour:02d}:00",
            reason="Personal errand",
            status=status,
            manager_name="HR Admin" if status in [RequestStatus.APPROVED, RequestStatus.REJECTED] else None,
            decision_date=datetime.now() if status in [RequestStatus.APPROVED, RequestStatus.REJECTED] else None,
        )
        db.add(request)

    db.commit()
    print("✓ Requests seeded")


def seed_attendance_locks(db: Session):
    """Seed attendance locks"""
    print("\nSeeding attendance locks...")

    lock_date = (datetime.now().date() - timedelta(days=5)).isoformat()
    existing_lock = db.query(AttendanceLock).filter(AttendanceLock.date == lock_date).first()
    if not existing_lock:
        lock = AttendanceLock(
            id=str(uuid.uuid4()),
            date=lock_date,
            locked_by="EMP001",
        )
        db.add(lock)
        db.commit()
        print("✓ Attendance locks seeded")
    else:
        print("  ⊙ Attendance lock already exists")


def main():
    """Main seeding function"""
    print("=" * 70)
    print("  Vayu Puthra Attendance System - Database Seeding")
    print("=" * 70)
    
    # Create tables
    create_tables()
    
    # Create database session
    db = SessionLocal()
    
    try:
        # Seed data
        seed_users(db)
        seed_shifts(db)
        seed_week_offs_and_shifts(db)
        seed_attendance_entries(db)
        seed_requests(db)
        seed_holidays(db)
        seed_attendance_locks(db)
        
        print("\n" + "=" * 70)
        print("✓ DATABASE SEEDING COMPLETE!")
        print("=" * 70)
        print("\nDefault Credentials:")
        print("  HR Admin:")
        print("    Employee ID: EMP001")
        print("    Password: admin123")
        print("\n  Employees:")
        print("    Employee IDs: EMP002 to EMP006")
        print("    Password: emp123")
        print("=" * 70)
        
    except Exception as e:
        print(f"\n✗ Error during seeding: {str(e)}")
        db.rollback()
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()
