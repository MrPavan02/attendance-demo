"""Quick script to check if users were seeded"""
from app.core.database import SessionLocal
from app.models.user import User

db = SessionLocal()
users = db.query(User).all()
print(f"\n✓ Total users in database: {len(users)}\n")
for u in users:
    face_status = f"✓ Face: {u.face_image_url[:50]}..." if u.face_image_url else "✗ No face"
    print(f"  - {u.employee_id}: {u.name} ({u.role.value}) - {face_status}")
db.close()
