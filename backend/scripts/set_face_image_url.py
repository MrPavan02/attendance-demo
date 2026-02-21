"""One-off helper to set face_image_url for a user.

Usage:
    python scripts/set_face_image_url.py EMP002 https://example.com/photo.jpg
"""
import sys
from app.core.database import SessionLocal
from app.models.user import User


def main() -> None:
    if len(sys.argv) != 3:
        print("Usage: python scripts/set_face_image_url.py <employee_id> <image_url>")
        sys.exit(1)

    employee_id, image_url = sys.argv[1:]

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.employee_id == employee_id).first()
        if not user:
            print(f"User with employee_id {employee_id} not found")
            sys.exit(1)

        user.face_image_url = image_url
        db.commit()
        print(f"Updated {employee_id} face_image_url -> {image_url}")
    finally:
        db.close()


if __name__ == "__main__":
    main()