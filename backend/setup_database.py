"""
Quick Setup Script for PostgreSQL Database

This script automates the PostgreSQL database setup process.
Run this after PostgreSQL is installed.
"""

import subprocess
import sys
from pathlib import Path


def print_step(step_num, title):
    """Print formatted step header"""
    print(f"\n{'='*70}")
    print(f"STEP {step_num}: {title}")
    print('='*70)


def run_command(command, description):
    """Run a shell command and handle errors"""
    print(f"\n→ {description}")
    print(f"  Command: {command}")
    
    try:
        result = subprocess.run(
            command,
            shell=True,
            capture_output=True,
            text=True,
            check=True
        )
        if result.stdout:
            print(f"  ✓ Success: {result.stdout.strip()}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"  ✗ Error: {e.stderr}")
        return False


def main():
    print("""
    ╔══════════════════════════════════════════════════════════════╗
    ║   Vayu Puthra Attendance System - PostgreSQL Setup Wizard   ║
    ╚══════════════════════════════════════════════════════════════╝
    """)
    
    # Get PostgreSQL credentials
    print_step(1, "Database Configuration")
    
    print("\nPlease provide your PostgreSQL credentials:")
    pg_superuser = input("PostgreSQL superuser name [postgres]: ").strip() or "postgres"
    pg_password = input(f"Password for {pg_superuser}: ").strip()
    
    print("\nNew database configuration:")
    db_name = input("Database name [attendance_system]: ").strip() or "attendance_system"
    db_user = input("Database user [attendance_admin]: ").strip() or "attendance_admin"
    db_password = input("Database user password [attendance_secure_pass_123]: ").strip() or "attendance_secure_pass_123"
    
    # Confirm
    print("\n" + "="*70)
    print("Configuration Summary:")
    print(f"  PostgreSQL Superuser: {pg_superuser}")
    print(f"  Database Name: {db_name}")
    print(f"  Database User: {db_user}")
    print(f"  Database Password: {'*' * len(db_password)}")
    print("="*70)
    
    confirm = input("\nProceed with this configuration? (yes/no): ").strip().lower()
    if confirm not in ['yes', 'y']:
        print("\n✗ Setup cancelled.")
        sys.exit(0)
    
    # Step 2: Create database
    print_step(2, "Creating Database")
    
    psql_cmd = f'psql -U {pg_superuser} -c "CREATE DATABASE {db_name};"'
    run_command(psql_cmd, f"Creating database '{db_name}'")
    
    # Step 3: Create user
    print_step(3, "Creating Database User")
    
    create_user_cmd = f'psql -U {pg_superuser} -c "CREATE USER {db_user} WITH PASSWORD \'{db_password}\';"'
    run_command(create_user_cmd, f"Creating user '{db_user}'")
    
    # Step 4: Grant privileges
    print_step(4, "Granting Privileges")
    
    grant_cmd = f'psql -U {pg_superuser} -c "GRANT ALL PRIVILEGES ON DATABASE {db_name} TO {db_user};"'
    run_command(grant_cmd, "Granting database privileges")
    
    # Additional schema privileges
    schema_cmds = [
        f'psql -U {pg_superuser} -d {db_name} -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO {db_user};"',
        f'psql -U {pg_superuser} -d {db_name} -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO {db_user};"',
        f'psql -U {pg_superuser} -d {db_name} -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO {db_user};"',
        f'psql -U {pg_superuser} -d {db_name} -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO {db_user};"'
    ]
    
    for cmd in schema_cmds:
        run_command(cmd, "Setting schema privileges")
    
    # Step 5: Create .env file
    print_step(5, "Creating .env File")
    
    backend_dir = Path(__file__).parent
    env_file = backend_dir / ".env"
    
    env_content = f"""# Database Configuration
DATABASE_URL=postgresql://{db_user}:{db_password}@localhost:5432/{db_name}
DATABASE_URL_ASYNC=postgresql+asyncpg://{db_user}:{db_password}@localhost:5432/{db_name}

# Database Connection Pool
DB_POOL_SIZE=20
DB_MAX_OVERFLOW=10

# JWT Configuration
SECRET_KEY=your-super-secret-key-change-this-in-production-12345
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Application Settings
APP_NAME=Vayu Puthra Attendance System
DEBUG=True
API_VERSION=v1
API_PREFIX=/api/v1

# CORS Settings
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# Security & Geofencing
GEOFENCE_RADIUS_METERS=200
MIN_OFFICE_HOURS=8

# Office Coordinates (NYC - Main HQ)
OFFICE_MAIN_LATITUDE=19.244449
OFFICE_MAIN_LONGITUDE=83.422297

# Branch Coordinates (LA - Branch A)
OFFICE_BRANCH_LATITUDE=34.0522
OFFICE_BRANCH_LONGITUDE=-118.2437

# Server Configuration
HOST=0.0.0.0
PORT=8000
"""
    
    with open(env_file, 'w') as f:
        f.write(env_content)
    
    print(f"\n  ✓ Created .env file at: {env_file}")
    
    # Step 6: Install Python dependencies
    print_step(6, "Installing Python Dependencies")
    
    print("\nWould you like to install Python dependencies now?")
    install = input("This requires Python virtual environment to be activated. (yes/no): ").strip().lower()
    
    if install in ['yes', 'y']:
        run_command("pip install -r requirements.txt", "Installing dependencies")
    else:
        print("\n  ⚠  Skipped. Install later with: pip install -r requirements.txt")
    
    # Summary
    print("\n" + "="*70)
    print("✓ DATABASE SETUP COMPLETE!")
    print("="*70)
    print("\nNext Steps:")
    print("  1. Activate your Python virtual environment:")
    print("     .\\venv\\Scripts\\Activate.ps1")
    print("\n  2. Install dependencies (if not done):")
    print("     pip install -r requirements.txt")
    print("\n  3. Initialize database schema:")
    print("     alembic init alembic")
    print("     alembic revision --autogenerate -m \"Initial schema\"")
    print("     alembic upgrade head")
    print("\n  4. Seed initial data:")
    print("     python scripts/seed_data.py")
    print("\n  5. Start the backend sever:")
    print("     uvicorn app.main:app --reload --host 0.0.0.0 --port 8000")
    print("\n  6. Access API documentation:")
    print("     http://localhost:8000/docs")
    print("="*70)
    
    # Test connection
    print("\nWould you like to test the database connection? (yes/no): ", end='')
    test = input().strip().lower()
    
    if test in ['yes', 'y']:
        print("\n Testing database connection...")
        test_cmd = f'psql -U {db_user} -d {db_name} -c "SELECT version();"'
        if run_command(test_cmd, "Testing connection"):
            print("\n  ✓ Database connection successful!")
        else:
            print("\n  ✗ Connection failed. Please check your credentials.")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n✗ Setup interrupted by user.")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n✗ Error: {str(e)}")
        sys.exit(1)
