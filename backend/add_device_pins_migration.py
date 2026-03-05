"""
Add device_pins column to users table if it doesn't exist
"""
from app.core.database import engine
from sqlalchemy import text, inspect

def add_device_pins_column():
    """Add device_pins JSON column to users table"""
    inspector = inspect(engine)
    columns = [col['name'] for col in inspector.get_columns('users')]
    
    if 'device_pins' in columns:
        print("✓ device_pins column already exists")
        return
    
    print("Adding device_pins column to users table...")
    
    with engine.connect() as conn:
        # For PostgreSQL
        conn.execute(text("ALTER TABLE users ADD COLUMN device_pins JSON"))
        conn.commit()
        print("✓ device_pins column added successfully")

if __name__ == "__main__":
    add_device_pins_column()
