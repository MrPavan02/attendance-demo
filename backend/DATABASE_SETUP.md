# PostgreSQL Database Setup Guide

## Step 1: Install PostgreSQL

### Option A: Windows Installation (Recommended)

1. **Download PostgreSQL:**
   - Visit: https://www.postgresql.org/download/windows/
   - Download PostgreSQL 16.x installer (latest stable version)
   - Or download from: https://www.enterprisedb.com/downloads/postgres-postgresql-downloads

2. **Run the Installer:**
   - Double-click the downloaded .exe file
   - Click "Next" through the setup wizard
   - Choose installation directory (default: `C:\Program Files\PostgreSQL\16`)
   - Select components:
     ✅ PostgreSQL Server
     ✅ pgAdmin 4 (GUI tool)
     ✅ Command Line Tools
   - Choose data directory (default: `C:\Program Files\PostgreSQL\16\data`)
   - **Set a password for 'postgres' superuser** (Remember this!)
   - Port: 5432 (default)
   - Locale: Default
   - Click "Next" and "Finish"

3. **Verify Installation:**
   ```powershell
   # Open PowerShell and run:
   psql --version
   ```
   You should see: `psql (PostgreSQL) 16.x`

### Option B: Using Chocolatey (if you have it)
```powershell
choco install postgresql
```

## Step 2: Access PostgreSQL

### Method 1: Using pgAdmin 4 (GUI - Easiest)

1. **Open pgAdmin 4:**
   - Search "pgAdmin 4" in Windows Start Menu
   - Launch the application
   - It will open in your web browser

2. **Connect to Server:**
   - Expand "Servers" in the left panel
   - Right-click "PostgreSQL 16" (or your version)
   - Click "Connect Server"
   - Enter the password you set during installation

### Method 2: Using Command Line (psql)

1. **Open PowerShell as Administrator**

2. **Connect to PostgreSQL:**
   ```powershell
   # Set the path (if not in PATH)
   $env:PATH += ";C:\Program Files\PostgreSQL\16\bin"
   
   # Connect as postgres superuser
   psql -U postgres
   ```

3. **When prompted, enter the password you set during installation**

## Step 3: Create Database and User

### Using pgAdmin 4:

1. **Create Database:**
   - Right-click "Databases" in the left panel
   - Select "Create" → "Database..."
   - Database name: `attendance_system`
   - Owner: postgres
   - Click "Save"

2. **Create User/Role:**
   - Right-click "Login/Group Roles"
   - Select "Create" → "Login/Group Role..."
   - Name: `attendance_admin`
   - Go to "Definition" tab
   - Password: `attendance_secure_pass_123`
   - Go to "Privileges" tab
   - Enable: "Can login?"
   - Enable: "Create databases?"
   - Click "Save"

3. **Grant Permissions:**
   - Right-click on "attendance_system" database
   - Select "Query Tool"
   - Run this SQL:
   ```sql
   GRANT ALL PRIVILEGES ON DATABASE attendance_system TO attendance_admin;
   GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO attendance_admin;
   GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO attendance_admin;
   ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO attendance_admin;
   ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO attendance_admin;
   ```

### Using Command Line (psql):

```sql
-- Connect to PostgreSQL
psql -U postgres

-- Create database
CREATE DATABASE attendance_system;

-- Create user
CREATE USER attendance_admin WITH PASSWORD 'attendance_secure_pass_123';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE attendance_system TO attendance_admin;

-- Connect to the new database
\c attendance_system

-- Grant schema privileges
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO attendance_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO attendance_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO attendance_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO attendance_admin;

-- Verify
\l           -- List all databases
\du          -- List all users

-- Exit
\q
```

## Step 4: Configure Backend Connection

1. **Create .env file in backend folder:**

```powershell
# Navigate to backend folder
cd "c:\-  Btech  -\VETAN\Modules\Attendance Module\Project with Mock data\backend"

# Create .env file
New-Item -Path ".env" -ItemType File -Force
```

2. **Add these configurations to .env:**

```env
# Database Configuration
DATABASE_URL=postgresql://attendance_admin:attendance_secure_pass_123@localhost:5432/attendance_system

# Alternative format (if using async)
DATABASE_URL_ASYNC=postgresql+asyncpg://attendance_admin:attendance_secure_pass_123@localhost:5432/attendance_system

# Database Connection Pool Settings
DB_POOL_SIZE=20
DB_MAX_OVERFLOW=10

# JWT Secret (generate a secure random string)
SECRET_KEY=your-super-secret-key-change-this-in-production-12345
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Application Settings
APP_NAME=Vayu Puthra Attendance System
DEBUG=True
API_VERSION=v1

# CORS Settings (your frontend URL)
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# Security
GEOFENCE_RADIUS_METERS=200
MIN_OFFICE_HOURS=8
```

## Step 5: Install Python Dependencies

```powershell
# Navigate to backend folder
cd "c:\-  Btech  -\VETAN\Modules\Attendance Module\Project with Mock data\backend"

# Create virtual environment
python -m venv venv

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# If you get execution policy error, run:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Install dependencies
pip install fastapi==0.109.0
pip install uvicorn[standard]==0.27.0
pip install sqlalchemy==2.0.25
pip install psycopg2-binary==2.9.9
pip install alembic==1.13.1
pip install pydantic==2.5.3
pip install pydantic-settings==2.1.0
pip install python-jose[cryptography]==3.3.0
pip install passlib[bcrypt]==1.7.4
pip install python-multipart==0.0.6
pip install python-dotenv==1.0.0
pip install bcrypt==4.1.2

# For async PostgreSQL (optional but recommended)
pip install asyncpg==0.29.0
pip install databases[postgresql]==0.8.0
```

## Step 6: Initialize Database Schema with Alembic

1. **Initialize Alembic:**

```powershell
# From backend directory
alembic init alembic
```

2. **Configure alembic.ini:**

Edit `alembic.ini` and change:
```ini
# Change this line:
sqlalchemy.url = driver://user:pass@localhost/dbname

# To (comment it out, we'll use env file):
# sqlalchemy.url = 
```

3. **Configure alembic/env.py:**

The configuration will read from your .env file automatically.

4. **Create Initial Migration:**

```powershell
# Generate migration from models
alembic revision --autogenerate -m "Initial schema"

# Apply migration to database
alembic upgrade head
```

## Step 7: Verify Database Setup

### Using pgAdmin 4:

1. Refresh the "attendance_system" database in pgAdmin
2. Expand "Schemas" → "public" → "Tables"
3. You should see tables like:
   - users
   - employees
   - attendance_entries
   - shifts
   - shift_assignments
   - regularization_requests
   - overtime_requests
   - permission_requests
   - holidays
   - employee_week_offs
   - attendance_locks

### Using Command Line:

```powershell
# Connect to database
psql -U attendance_admin -d attendance_system

# List all tables
\dt

# Describe a specific table
\d users

# Check table count
SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';

# Exit
\q
```

## Step 8: Seed Initial Data (Optional)

Create a seed script to populate initial data:

```powershell
# From backend directory
python scripts/seed_data.py
```

This will create:
- Default admin user
- Sample employees
- Default shifts
- Sample holidays

## Step 9: Start the Backend Server

```powershell
# Make sure virtual environment is activated
.\venv\Scripts\Activate.ps1

# Start the server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

## Step 10: Test API Endpoints

1. **Open browser and go to:**
   - API Docs: http://localhost:8000/docs
   - Alternative Docs: http://localhost:8000/redoc

2. **Test database connection:**
   ```powershell
   curl http://localhost:8000/api/v1/health
   ```

3. **Test login:**
   From the /docs interface, use the `/api/v1/auth/login` endpoint

## Troubleshooting

### Issue: "psql: command not found"

**Solution:** Add PostgreSQL to PATH
```powershell
$env:PATH += ";C:\Program Files\PostgreSQL\16\bin"

# To make it permanent:
[Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\Program Files\PostgreSQL\16\bin", [EnvironmentVariableTarget]::User)
```

### Issue: "password authentication failed"

**Solution:**
1. Check if password is correct
2. Check `pg_hba.conf` file location:
   ```powershell
   # Find config file
   psql -U postgres -c "SHOW hba_file;"
   ```
3. Edit the file and ensure it has:
   ```
   # IPv4 local connections:
   host    all             all             127.0.0.1/32            md5
   ```
4. Restart PostgreSQL service:
   ```powershell
   # Open Services (services.msc)
   # Find "postgresql-x64-16"
   # Right-click → Restart
   ```

### Issue: Port 5432 already in use

**Solution:** 
```powershell
# Check what's using the port
netstat -ano | findstr :5432

# Kill the process (replace PID)
taskkill /PID <PID> /F
```

### Issue: Cannot connect from Python

**Solution:**
1. Check DATABASE_URL format in .env
2. Verify PostgreSQL service is running:
   ```powershell
   Get-Service -Name postgresql*
   ```
3. Test connection:
   ```python
   from sqlalchemy import create_engine
   engine = create_engine("postgresql://attendance_admin:attendance_secure_pass_123@localhost:5432/attendance_system")
   connection = engine.connect()
   print("Connected successfully!")
   connection.close()
   ```

### Issue: Alembic migration errors

**Solution:**
```powershell
# Reset migrations
alembic downgrade base

# Delete migration files (except __init__.py)
# Recreate migration
alembic revision --autogenerate -m "Fresh start"
alembic upgrade head
```

## Production Considerations

### 1. Security
- Change default passwords
- Use environment variables for sensitive data
- Enable SSL/TLS for PostgreSQL connections
- Implement proper firewall rules

### 2. Performance
- Configure connection pooling
- Add database indexes
- Regular VACUUM and ANALYZE operations

### 3. Backup Strategy
```powershell
# Backup database
pg_dump -U attendance_admin -d attendance_system -f backup.sql

# Restore database
psql -U attendance_admin -d attendance_system -f backup.sql
```

### 4. Monitoring
- Enable PostgreSQL logging
- Monitor query performance
- Set up alerts for connection limits

## Quick Reference Commands

```powershell
# Start PostgreSQL service
Start-Service postgresql-x64-16

# Stop PostgreSQL service
Stop-Service postgresql-x64-16

# Check service status
Get-Service postgresql-x64-16

# Connect to database
psql -U attendance_admin -d attendance_system

# List databases
\l

# List tables
\dt

# Describe table
\d table_name

# Execute SQL file
\i path/to/file.sql

# Quit psql
\q
```

## Next Steps

1. ✅ PostgreSQL installed and running
2. ✅ Database created
3. ✅ User configured with permissions
4. ✅ Backend connected to database
5. ✅ Tables created via Alembic
6. ✅ Initial data seeded
7. ✅ API server running
8. 🎯 Connect frontend to backend (update axios baseURL)
9. 🎯 Test end-to-end flow
10. 🎯 Deploy to production

---

**Need Help?** Open an issue or contact your database administrator.
