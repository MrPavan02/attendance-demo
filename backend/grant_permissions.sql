-- Grant all necessary permissions to attendance_admin user
-- Run this as postgres superuser

-- Connect to the attendance_system database first
\c attendance_system

-- Grant schema usage and creation
GRANT USAGE, CREATE ON SCHEMA public TO attendance_admin;

-- Grant all privileges on all existing tables
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO attendance_admin;

-- Grant all privileges on all existing sequences
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO attendance_admin;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO attendance_admin;

-- Set default privileges for future sequences
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO attendance_admin;

-- Grant privileges on database 
GRANT ALL PRIVILEGES ON DATABASE attendance_system TO attendance_admin;

-- Verify permissions
\dp