# 🎯 QUICK REFERENCE - Database & Users

## ✅ System Status
- **Database**: PostgreSQL (attendance_system)
- **Tables**: 11 tables
- **Users**: 6 users (1 HR + 5 Employees)
- **Frontend**: Updated and synced
- **Backend**: Running on http://localhost:8000

---

## 👥 LOGIN CREDENTIALS

### 🔴 HR ADMIN
```
ID: EMP001
Password: admin123
Role: Select "Administrator"
```

### 🔵 EMPLOYEES (All use same password: emp123)
```
EMP002 - Alice Johnson (Engineering)
EMP003 - Bob Smith (Engineering)
EMP004 - Charlie Davis (Sales)
EMP005 - Diana Prince (Marketing)
EMP006 - Ethan Hunt (Engineering)
```

---

## 📊 DATABASE TABLES

| # | Table Name | Purpose |
|---|------------|---------|
| 1 | **users** | Employee accounts & authentication |
| 2 | **attendance_entries** | Check-in/out records |
| 3 | **attendance_locks** | Finalized date locks |
| 4 | **shifts** | Shift definitions (Shift1, Shift2, Shift3) |
| 5 | **shift_assignments** | Employee shift assignments |
| 6 | **employee_week_offs** | Week-off configuration |
| 7 | **regularization_requests** | Attendance corrections |
| 8 | **shift_change_requests** | Shift swap requests |
| 9 | **overtime_requests** | Overtime applications |
| 10 | **permission_requests** | Permission hours requests |
| 11 | **holidays** | Holiday calendar |

---

## 📁 REFERENCE FILES

1. **USER_CREDENTIALS.md** - Complete login guide with troubleshooting
2. **DATABASE_TABLES_REFERENCE.md** - Full database schema documentation
3. **CREDENTIALS.md** (backend) - Backend API credentials
4. **DATABASE_SETUP.md** (backend) - Database setup instructions

---

## 🚀 QUICK START

### Login as Admin:
1. Open frontend
2. Click "Administrator" tab
3. Enter: `EMP001` / `admin123`
4. Click "Verify Account"
5. Access HR Dashboard

### Login as Employee:
1. Open frontend
2. Keep "Employee" tab selected
3. Enter: `EMP002` / `emp123` (or any EMP002-EMP006)
4. Click "Verify Account"
5. Mark attendance

---

## 🔗 USEFUL LINKS

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Database**: PostgreSQL on localhost:5432

---

**Last Sync**: February 9, 2026
