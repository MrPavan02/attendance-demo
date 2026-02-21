# 👥 User Credentials & Login Information

## 🔐 Login System Overview

The attendance system uses **Employee ID** and **Password** for authentication. All users are stored in the **PostgreSQL database** in the `users` table with encrypted passwords.

---

## 📋 Complete User Table

| # | Employee ID | Password | Name | Department | Role | Email |
|---|-------------|----------|------|------------|------|-------|
| 1 | **EMP001** | `admin123` | HR Admin | Human Resources | **HR** (Admin) | admin@vayuputhra.com |
| 2 | **EMP002** | `emp123` | Alice Johnson | Engineering | EMPLOYEE | alice@vayuputhra.com |
| 3 | **EMP003** | `emp123` | Bob Smith | Engineering | EMPLOYEE | bob@vayuputhra.com |
| 4 | **EMP004** | `emp123` | Charlie Davis | Sales | EMPLOYEE | charlie@vayuputhra.com |
| 5 | **EMP005** | `emp123` | Diana Prince | Marketing | EMPLOYEE | diana@vayuputhra.com |
| 6 | **EMP006** | `emp123` | Ethan Hunt | Engineering | EMPLOYEE | ethan@vayuputhra.com |

---

## 🎯 Quick Login Reference

### For HR/Administrator Access:
```
Employee ID: EMP001
Password: admin123
Role: HR (Select "Administrator" on login page)
```

### For Employee Access:
```
Option 1 - Alice Johnson (Engineering)
Employee ID: EMP002
Password: emp123

Option 2 - Bob Smith (Engineering)
Employee ID: EMP003
Password: emp123

Option 3 - Charlie Davis (Sales)
Employee ID: EMP004
Password: emp123

Option 4 - Diana Prince (Marketing)
Employee ID: EMP005
Password: emp123

Option 5 - Ethan Hunt (Engineering)
Employee ID: EMP006
Password: emp123
```

---

## 🔑 Password Information

- **HR Admin Password**: `admin123`
- **All Employee Passwords**: `emp123`
- **Encryption**: Passwords are hashed using bcrypt in the database
- **Frontend Validation**: Plain text comparison (for development)
- **Backend Validation**: Secure hash comparison (production-ready)

---

## 🚀 How to Login

### Step 1: Choose Your Role
- Select **"Administrator"** for HR/Admin access (EMP001)
- Select **"Employee"** for regular employee access (EMP002-EMP006)

### Step 2: Enter Credentials
- Enter the Employee ID (e.g., `EMP001` for admin, `EMP002` for Alice)
- Enter the corresponding password

### Step 3: Verify Account
- Click "Verify Account" button
- System will validate credentials against the database

---

## ⚠️ Common Login Issues & Solutions

### ❌ "Invalid Employee ID"
**Problem**: The Employee ID doesn't exist in the database.  
**Solution**: Use one of the IDs from the table above (EMP001 to EMP006).

### ❌ "Incorrect Password"
**Problem**: Password doesn't match the user's stored password.  
**Solution**:
- For EMP001: Use `admin123`
- For EMP002-EMP006: Use `emp123`

### ❌ "Please enter both Employee ID and Password"
**Problem**: One of the fields is empty.  
**Solution**: Fill in both fields before clicking "Verify Account".

---

## 🔄 User Roles & Permissions

### HR Role (EMP001 only)
✅ **Full Access**
- View all employee attendance
- View dashboard with statistics
- Access to reports (MIS Punch, Overtime, Permission Hours, Team Reports)
- Approve/Reject requests (Regularization, Overtime, Permission, Shift Change)
- Manage holidays
- View all department data

### Employee Role (EMP002-EMP006)
✅ **Standard Access**
- Mark own attendance (Check-in/Check-out)
- View own attendance calendar
- Submit regularization requests
- Submit shift change requests
- Submit overtime requests
- Submit permission hours requests
- View own attendance history

---

## 🛠️ Testing Different User Scenarios

### Scenario 1: Admin Dashboard
```
Login as: EMP001 (admin123)
Role: Administrator
Expected: Access to HR Dashboard with full analytics
```

### Scenario 2: Engineering Department Employee
```
Login as: EMP002 (emp123) - Alice Johnson
        OR EMP003 (emp123) - Bob Smith
        OR EMP006 (emp123) - Ethan Hunt
Role: Employee
Expected: Employee dashboard with attendance marking
```

### Scenario 3: Sales Department Employee
```
Login as: EMP004 (emp123) - Charlie Davis
Role: Employee
Expected: Employee dashboard with attendance marking
```

### Scenario 4: Marketing Department Employee
```
Login as: EMP005 (emp123) - Diana Prince
Role: Employee
Expected: Employee dashboard with attendance marking
```

---

## 📊 Database Sync Status

✅ **Frontend** (React App): Using EMP001-EMP006  
✅ **Backend** (FastAPI): Using EMP001-EMP006  
✅ **Database** (PostgreSQL): Contains EMP001-EMP006  
✅ **Credentials Match**: All systems synchronized

---

## 🔐 Security Notes

1. **Development Mode**: Plain password comparison in frontend
2. **Production Mode**: Backend uses bcrypt hashing
3. **Session Management**: JWT tokens for API authentication
4. **Local Storage**: Session data stored in browser
5. **Logout**: Clears session and requires re-authentication

---

## 📝 Notes for Developers

- User IDs follow the format: `EMP` + 3-digit number (e.g., EMP001)
- All user records have unique `employee_id` as primary identifier
- Email addresses are unique and can be used for password recovery
- The `role` field determines access level (HR vs EMPLOYEE)
- `is_active` flag can be used to disable accounts without deletion

---

## 🆕 Adding New Users

To add new users to the system, update the seed script:

**File**: `backend/scripts/seed_data.py`

```python
{
    "id": "550e8400-e29b-41d4-a716-446655440007",
    "employee_id": "EMP007",
    "name": "New Employee Name",
    "email": "newemp@vayuputhra.com",
    "password": "emp123",
    "department": "Department Name",
    "role": UserRole.EMPLOYEE,
}
```

Then run: `python scripts/seed_data.py`

---

## 📞 Support

For login issues or credential problems:
1. Check this document for correct Employee IDs
2. Verify you're using the correct password
3. Ensure the role selection matches your user type
4. Clear browser cache and try again

**Last Updated**: February 9, 2026
