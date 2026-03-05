-- Add device_pins column to users table for biometric verification fallback
-- This column stores device-specific PINs as JSON: {device_id: hashed_pin}
-- Run this if you're not using Alembic migrations

-- For PostgreSQL
ALTER TABLE users ADD COLUMN IF NOT EXISTS device_pins JSON;

-- For MySQL
-- ALTER TABLE users ADD COLUMN device_pins JSON;

-- For SQLite
-- ALTER TABLE users ADD COLUMN device_pins TEXT;

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'device_pins';
