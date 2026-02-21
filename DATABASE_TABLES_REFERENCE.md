# 📊 Database Tables Reference

## Database Overview
**Database Name**: `attendance_system`  
**Total Tables**: 11 tables  
**Database Type**: PostgreSQL

---

## 📋 Tables Structure

### 1. 👥 **users** (User/Employee Management)
Stores employee and HR user information

| Column | Type | Description |
|--------|------|-------------|
| id | String (UUID) | Primary Key |
| employee_id | String | Unique employee identifier (EMP001, EMP002, etc.) |
| name | String | Full name of the employee |
| email | String | Email address (unique) |
| hashed_password | String | Encrypted password |
| department | String | Department name |
| role | Enum | EMPLOYEE or HR |
| is_active | Boolean | Account status |
| created_at | DateTime | Account creation timestamp |
| updated_at | DateTime | Last update timestamp |
| last_login | DateTime | Last login timestamp |

**Current Users (6 total)**:
- EMP001: HR Admin (HR) - admin@vayuputhra.com
- EMP002: Alice Johnson (EMPLOYEE) - alice@vayuputhra.com
- EMP003: Bob Smith (EMPLOYEE) - bob@vayuputhra.com
- EMP004: Charlie Davis (EMPLOYEE) - charlie@vayuputhra.com
- EMP005: Diana Prince (EMPLOYEE) - diana@vayuputhra.com
- EMP006: Ethan Hunt (EMPLOYEE) - ethan@vayuputhra.com

---

### 2. ⏰ **attendance_entries** (Attendance Records)
Stores all check-in and check-out records

| Column | Type | Description |
|--------|------|-------------|
| id | String (UUID) | Primary Key |
| employee_id | String | Foreign Key → users.employee_id |
| timestamp | DateTime | Check-in/out time |
| type | Enum | IN or OUT |
| mode | Enum | OFFICE, FIELD, BRANCH, or WFH |
| latitude | Float | GPS latitude |
| longitude | Float | GPS longitude |
| is_flagged | Boolean | Anomaly detection flag |
| flag_reason | String | Reason for flagging |
| field_work_reason | String | Reason for field work |
| device_id | String | Device identifier |
| verification_method | Enum | BIOMETRIC, PIN, or FACE_ONLY |
| duration | Float | Work duration in hours (for OUT entries) |
| image_data | Text | Base64 encoded image |
| created_at | DateTime | Record creation time |

---

### 3. 🔒 **attendance_locks** (Date Locking)
Locks attendance dates after finalization

| Column | Type | Description |
|--------|------|-------------|
| id | String (UUID) | Primary Key |
| date | String | Date in YYYY-MM-DD format (unique) |
| locked_by | String | Foreign Key → users.employee_id |
| locked_at | DateTime | Lock timestamp |

---

### 4. 🕐 **shifts** (Shift Definitions)
Defines available work shifts

| Column | Type | Description |
|--------|------|-------------|
| id | String | Primary Key (shift_1, shift_2, etc.) |
| name | String | Shift name (Shift1, Shift2, etc.) |
| start_time | String | Start time in HH:MM format |
| end_time | String | End time in HH:MM format |
| description | String | Shift description |
| created_at | DateTime | Creation timestamp |
| updated_at | DateTime | Update timestamp |

**Default Shifts**:
- Shift1: 09:00 - 18:00 (General Shift)
- Shift2: 12:00 - 21:00 (Afternoon Shift)
- Shift3: 21:00 - 06:00 (Night Shift)

---

### 5. 📅 **shift_assignments** (Employee Shift Assignments)
Assigns shifts to employees

| Column | Type | Description |
|--------|------|-------------|
| id | String (UUID) | Primary Key |
| employee_id | String | Foreign Key → users.employee_id |
| shift_id | String | Foreign Key → shifts.id |
| date | String | Date in YYYY-MM-DD format |
| effective_from | DateTime | Assignment start date |
| effective_to | DateTime | Assignment end date (nullable) |
| created_at | DateTime | Creation timestamp |
| assigned_by | String | Foreign Key → users.employee_id |

---

### 6. 📆 **employee_week_offs** (Week-off Configuration)
Configures weekly off days for employees

| Column | Type | Description |
|--------|------|-------------|
| id | String (UUID) | Primary Key |
| employee_id | String | Foreign Key → users.employee_id (unique) |
| week_offs | Array[Integer] | Array of day numbers (0=Sunday, 6=Saturday) |
| created_at | DateTime | Creation timestamp |
| updated_at | DateTime | Update timestamp |

**Default**: [0, 6] (Sunday and Saturday)

---

### 7. 🔄 **regularization_requests** (Attendance Correction)
Requests for attendance regularization

| Column | Type | Description |
|--------|------|-------------|
| id | String (UUID) | Primary Key |
| employee_id | String | Foreign Key → users.employee_id |
| date | String | Date in YYYY-MM-DD format |
| type | Enum | LOGIN, LOGOUT, BOTH, MISSED_CHECKIN, MISSED_CHECKOUT, FULL_DAY |
| actual_time | String | Actual time recorded |
| requested_login_time | String | Requested login time |
| requested_logout_time | String | Requested logout time |
| reason | Text | Reason for regularization |
| submitted_date | DateTime | Submitted date/time |
| remarks | Text | Additional remarks |
| status | Enum | PENDING, APPROVED, REJECTED, CANCELLED |
| manager_name | String | Manager who approved/rejected |
| decision_date | DateTime | Approval/Rejection timestamp |

---

### 8. 🔀 **shift_change_requests** (Shift Change Requests)
Requests for shift changes

| Column | Type | Description |
|--------|------|-------------|
| id | String (UUID) | Primary Key |
| employee_id | String | Foreign Key → users.employee_id |
| current_shift_id | String | Foreign Key → shifts.id |
| requested_shift_id | String | Foreign Key → shifts.id |
| date | String | Date in YYYY-MM-DD format |
| reason | Text | Reason for shift change |
| submitted_date | DateTime | Submitted date/time |
| status | Enum | PENDING, APPROVED, REJECTED, CANCELLED |
| manager_name | String | Manager who approved/rejected |
| decision_date | DateTime | Approval/Rejection timestamp |

---

### 9. ⏱️ **overtime_requests** (Overtime Applications)
Overtime work requests

| Column | Type | Description |
|--------|------|-------------|
| id | String (UUID) | Primary Key |
| employee_id | String | Foreign Key → users.employee_id |
| date | String | Date in YYYY-MM-DD format |
| hours | Float | Overtime hours requested |
| reason | Text | Reason for overtime |
| submitted_date | DateTime | Submitted date/time |
| status | Enum | PENDING, APPROVED, REJECTED, CANCELLED |
| manager_name | String | Manager who approved/rejected |
| decision_date | DateTime | Approval/Rejection timestamp |

---

### 10. 🚪 **permission_requests** (Permission Hours)
Short-duration permission requests

| Column | Type | Description |
|--------|------|-------------|
| id | String (UUID) | Primary Key |
| employee_id | String | Foreign Key → users.employee_id |
| date | String | Date in YYYY-MM-DD format |
| start_time | String | Permission start time |
| end_time | String | Permission end time |
| hours | Float | Duration in hours |
| reason | Text | Reason for permission |
| submitted_date | DateTime | Submitted date/time |
| status | Enum | PENDING, APPROVED, REJECTED, CANCELLED |
| manager_name | String | Manager who approved/rejected |
| decision_date | DateTime | Approval/Rejection timestamp |

---

### 11. 🎉 **holidays** (Holiday Calendar)
Public holidays configuration

| Column | Type | Description |
|--------|------|-------------|
| id | String (UUID) | Primary Key |
| date | String | Date in YYYY-MM-DD format |
| name | String | Holiday name |
| country | String | Country code |
| state | String | State name |
| created_at | DateTime | Creation timestamp |
| created_by | String | Creator employee ID |

---

## 🔗 Table Relationships

```
users (1) ←→ (∞) attendance_entries
users (1) ←→ (∞) shift_assignments
users (1) ←→ (1) employee_week_offs
users (1) ←→ (∞) regularization_requests
users (1) ←→ (∞) shift_change_requests
users (1) ←→ (∞) overtime_requests
users (1) ←→ (∞) permission_requests
users (1) ←→ (∞) attendance_locks

shifts (1) ←→ (∞) shift_assignments
shifts (1) ←→ (∞) shift_change_requests
```

---

## 📈 Data Flow

1. **User Authentication** → `users` table
2. **Check-in/Check-out** → `attendance_entries` table
3. **Shift Assignment** → `shift_assignments` table
4. **Request Submissions** → `regularization_requests`, `shift_change_requests`, `overtime_requests`, `permission_requests`
5. **Date Finalization** → `attendance_locks` table
6. **Holiday Management** → `holidays` table

---

## 🔧 Maintenance Notes

- All UUIDs are auto-generated for primary keys
- User authentication uses bcrypt hashing
- Timestamps use timezone-aware DateTime
- Foreign keys ensure referential integrity
- Indexes on frequently queried columns (employee_id, date fields)
