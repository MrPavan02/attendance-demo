# Vayu Puthra Attendance System - Backend

Enterprise-grade attendance management system backend built with FastAPI and PostgreSQL.

## 🚀 Features

- **Authentication & Authorization**: JWT-based auth with role-based access control
- **Attendance Management**: Biometric check-in/out with geofencing
- **Security**: Advanced fraud detection, liveness verification, device fingerprinting
- **Request Management**: Regularization, overtime, permission, shift change workflows
- **Shift Management**: Flexible shift assignment and scheduling
- **Reporting**: Comprehensive attendance reports and analytics
- **Holiday Management**: Multi-country/state holiday configuration
- **PostgreSQL Database**: Robust data persistence with Alembic migrations

## 📋 Prerequisites

- Python 3.9+
- PostgreSQL 12+
- pip

## 🔧 Installation

1. **Clone the repository**
   ```bash
   cd backend
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

5. **Setup Database**
   ```bash
   # Create PostgreSQL database
   createdb attendance_db
   
   # Run migrations
   alembic upgrade head
   ```

6. **Seed initial data (optional)**
   ```bash
   python scripts/seed_data.py
   ```

## 🏃 Running the Server

### Development
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Production
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

## 📚 API Documentation

Once the server is running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 🗂️ Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI application entry point
│   ├── config.py               # Configuration settings
│   ├── database.py             # Database connection
│   ├── dependencies.py         # Dependency injection
│   │
│   ├── models/                 # SQLAlchemy models
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── attendance.py
│   │   ├── request.py
│   │   └── ...
│   │
│   ├── schemas/                # Pydantic schemas
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── attendance.py
│   │   └── ...
│   │
│   ├── routers/                # API endpoints
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── attendance.py
│   │   ├── employees.py
│   │   └── ...
│   │
│   ├── services/               # Business logic
│   │   ├── __init__.py
│   │   ├── auth_service.py
│   │   ├── attendance_service.py
│   │   ├── security_service.py
│   │   └── ...
│   │
│   └── utils/                  # Utility functions
│       ├── __init__.py
│       ├── security.py
│       └── geofencing.py
│
├── alembic/                    # Database migrations
│   ├── versions/
│   └── env.py
├── scripts/                    # Utility scripts
│   └── seed_data.py
├── tests/                      # Test files
├── requirements.txt
├── .env.example
└── README.md
```

## 🔐 Authentication

The API uses JWT tokens for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your_token>
```

## 👥 Default Users

After seeding data:
- **Employee**: EMP-101 / password123
- **HR Admin**: HR-001 / admin123

## 🧪 Testing

```bash
pytest
```

## 📝 License

Proprietary - All rights reserved
