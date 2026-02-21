# 🚀 Vayu Puthra Attendance System - Quick Start Guide

## Prerequisites Checklist

✅ PostgreSQL 16.x installed  
✅ Python 3.10+ installed  
✅ Git (optional)  

## 📦 Step 1: Install PostgreSQL (if not already installed)

### Windows:
1. Download from: https://www.postgresql.org/download/windows/
2. Run installer and remember the password you set for `postgres` user
3. Default port: 5432

### Verify installation:
```powershell
psql --version
```

## 🗄️ Step 2: Create Database (Automated)

### Option A: Using the automated script (Recommended)

```powershell
# Navigate to backend directory
cd "c:\-  Btech  -\VETAN\Modules\Attendance Module\Project with Mock data\backend"

# Run setup script
python setup_database.py
```

The script will:
- Create the database (`attendance_system`)
- Create database user (`attendance_admin`)
- Grant necessary permissions
- Create `.env` file with configuration

### Option B: Manual setup via pgAdmin

See [DATABASE_SETUP.md](DATABASE_SETUP.md) for detailed manual instructions.

### Option C: Using command line

```powershell
# Connect to PostgreSQL
psql -U postgres

# Run these commands:
CREATE DATABASE attendance_system;
CREATE USER attendance_admin WITH PASSWORD 'attendance_secure_pass_123';
GRANT ALL PRIVILEGES ON DATABASE attendance_system TO attendance_admin;

# Connect to the database
\c attendance_system

# Grant schema privileges
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO attendance_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO attendance_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO attendance_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO attendance_admin;

# Exit
\q
```

## 🐍 Step 3: Setup Python Environment

```powershell
# Navigate to backend directory
cd "c:\-  Btech  -\VETAN\Modules\Attendance Module\Project with Mock data\backend"

# Create virtual environment
python -m venv venv

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# If you get execution policy error:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Install dependencies
pip install -r requirements.txt
```

## ⚙️ Step 4: Configure Environment

If you didn't use the automated script, create `.env` file:

```powershell
# Copy example file
copy .env.example .env

# Edit .env and update DATABASE_URL if needed
notepad .env
```

Ensure this line in `.env`:
```env
DATABASE_URL=postgresql://attendance_admin:attendance_secure_pass_123@localhost:5432/attendance_system
```

## 🗂️ Step 5: Initialize Database Schema

```powershell
# Initialize Alembic (first time only)
alembic init alembic

# Create initial migration
alembic revision --autogenerate -m "Initial schema"

# Apply migrations to database
alembic upgrade head
```

## 🌱 Step 6: Seed Initial Data

```powershell
# Run seed script
python scripts/seed_data.py
```

This creates:
- Admin user (username: `admin`, password: `admin123`)
- HR Manager (username: `hr_manager`, password: `hr123`)
- 5 Employees (username: `emp101-emp105`, password: `emp123`)
- 5 Default shifts (Shift1 to Shift5)
- Sample holidays for current year

## 🚀 Step 7: Start the Backend Server

```powershell
# Make sure virtual environment is activated
.\venv\Scripts\Activate.ps1

# Start server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete.
```

## 📝 Step 8: Test API

### Access API Documentation:
- Swagger UI: http://localhost:8000/api/v1/docs
- ReDoc: http://localhost:8000/api/v1/redoc

### Test endpoints:

```powershell
# Health check
curl http://localhost:8000/api/v1/health

# Login (get token)
curl -X POST http://localhost:8000/api/v1/auth/login
     -H "Content-Type: application/x-www-form-urlencoded"
     -d "username=admin&password=admin123"
```

## 🌐 Step 9: Connect Frontend

Update frontend `axios.js`:

```javascript
// frontend/utils/axios.js
const api = axios.create({
  baseURL: 'http://localhost:8000',
});
```

Start frontend:
```powershell
cd "c:\-  Btech  -\VETAN\Modules\Attendance Module\Project with Mock data\frontend"
npm install
npm run dev
```

Access: http://localhost:3000

## 🔑 Default Login Credentials

### Admin Account
- **Username:** `admin`
- **Password:** `admin123`
- **Role:** Administrator
- **Employee ID:** `ADM-001`

### HR Account
- **Username:** `hr_manager`
- **Password:** `hr123`
- **Role:** HR
- **Employee ID:** `HR-001`

### Employee Accounts
- **Usernames:** `emp101`, `emp102`, `emp103`, `emp104`, `emp105`
- **Password:** `emp123`
- **Role:** Employee
- **Employee IDs:** `EMP-101` to `EMP-105`

## 📋 Available API Endpoints

### Authentication
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/register` - Register new user
- `GET /api/v1/auth/me` - Get current user

### Attendance
- `POST /api/v1/attendance/check-in` - Check in
- `POST /api/v1/attendance/check-out` - Check out
- `GET /api/v1/attendance/entries` - Get attendance entries
- `GET /api/v1/attendance/status/{employee_id}` - Get employee status

### Employees
- `GET /api/v1/employees` - List all employees
- `GET /api/v1/employees/{employee_id}` - Get employee details
- `POST /api/v1/employees` - Create employee
- `PUT /api/v1/employees/{employee_id}` - Update employee

### Shifts
- `GET /api/v1/shifts` - List all shifts
- `POST /api/v1/shifts/assign` - Assign shift to employee
- `GET /api/v1/shifts/assignments/{employee_id}` - Get employee shifts

### Requests
- `POST /api/v1/requests/regularization` - Submit regularization
- `POST /api/v1/requests/overtime` - Submit overtime request
- `POST /api/v1/requests/permission` - Submit permission request
- `POST /api/v1/requests/shift-change` - Submit shift change request
- `GET /api/v1/requests/pending` - Get pending requests (HR)
- `PUT /api/v1/requests/{request_id}/approve` - Approve request
- `PUT /api/v1/requests/{request_id}/reject` - Reject request

### Holidays
- `GET /api/v1/holidays` - List holidays
- `POST /api/v1/holidays` - Create holiday
- `DELETE /api/v1/holidays/{holiday_id}` - Delete holiday

### Reports
- `GET /api/v1/reports/attendance` - Attendance report
- `GET /api/v1/reports/mispunch` - Mispunch report
- `GET /api/v1/reports/overtime` - Overtime report
- `GET /api/v1/reports/permission` - Permission hours report

## 🛠️ Common Issues & Solutions

### 1. "psql: command not found"
Add PostgreSQL to PATH:
```powershell
$env:PATH += ";C:\Program Files\PostgreSQL\16\bin"
```

### 2. "Port 8000 already in use"
Kill the process:
```powershell
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

### 3. Database connection failed
- Verify PostgreSQL service is running
- Check credentials in `.env` file
- Test connection: `psql -U attendance_admin -d attendance_system`

### 4. Alembic migration errors
Reset and recreate:
```powershell
alembic downgrade base
alembic revision --autogenerate -m "Fresh start"
alembic upgrade head
```

### 5. Import errors in Python
Ensure virtual environment is activated:
```powershell
.\venv\Scripts\Activate.ps1
```

## 📊 Database Management

### View tables:
```powershell
psql -U attendance_admin -d attendance_system

# List tables
\dt

# Describe table
\d users

# View data
SELECT * FROM users;

# Exit
\q
```

### Backup database:
```powershell
pg_dump -U attendance_admin -d attendance_system -f backup.sql
```

### Restore database:
```powershell
psql -U attendance_admin -d attendance_system -f backup.sql
```

## 🔄 Development Workflow

### Making database changes:

1. Update models in `app/models/`
2. Create migration:
   ```powershell
   alembic revision --autogenerate -m "Description of change"
   ```
3. Review migration in `alembic/versions/`
4. Apply migration:
   ```powershell
   alembic upgrade head
   ```

### Code changes with auto-reload:
The server automatically reloads when you save changes (with `--reload` flag)

## 🧪 Testing

### Test API with curl:
```powershell
# Login
$token = (curl -X POST http://localhost:8000/api/v1/auth/login `
  -H "Content-Type: application/x-www-form-urlencoded" `
  -d "username=admin&password=admin123" | ConvertFrom-Json).access_token

# Use token for authenticated requests
curl http://localhost:8000/api/v1/auth/me `
  -H "Authorization: Bearer $token"
```

### Test with Postman:
1. Import API endpoints from http://localhost:8000/api/v1/docs
2. Use "Authorization" tab with Bearer Token

## 📚 Project Structure

```
backend/
├── app/
│   ├── core/           # Core configurations
│   │   ├── config.py   # Settings
│   │   ├── database.py # Database connection
│   │   └── security.py # Auth utils
│   ├── models/         # SQLAlchemy models
│   ├── schemas/        # Pydantic schemas
│   ├── routers/        # API endpoints
│   ├── services/       # Business logic
│   ├── utils/          # Utility functions
│   └── main.py         # FastAPI app
├── scripts/
│   └── seed_data.py    # Database seeding
├── alembic/            # Database migrations
├── .env                # Environment variables
├── requirements.txt    # Python dependencies
└── setup_database.py   # Automated setup
```

## 🎯 Next Steps

1. ✅ Backend API running
2. ✅ Frontend connected
3. 🎯 Test end-to-end flow
4. 🎯 Customize business logic
5. 🎯 Add additional features
6. 🎯 Deploy to production

## 📞 Support

For issues:
1. Check logs: terminal output
2. Review [DATABASE_SETUP.md](DATABASE_SETUP.md)
3. Check PostgreSQL logs
4. Verify all services are running

## 🚀 Production Deployment

Before deploying:
1. Change default passwords
2. Update SECRET_KEY in `.env`
3. Set `DEBUG=False`
4. Configure proper CORS origins
5. Enable SSL for PostgreSQL
6. Set up proper backup strategy
7. Configure logging
8. Set up monitoring

---

**Congratulations! Your Vayu Puthra Attendance System backend is ready! 🎉**
