# Biometric Verification - Quick Setup Guide

## Quick Start

### 1. Database Migration

Run the migration to add the device_pins column to the users table:

**Option A: Using Alembic (Recommended)**
```bash
cd backend
alembic upgrade head
```

**Option B: Direct SQL**
```bash
cd backend
# For PostgreSQL
psql -U your_user -d your_database -f add_device_pins_column.sql

# Or run manually in your DB client
```

### 2. Backend Setup

No additional dependencies needed! The feature uses existing libraries.

**Restart the backend server:**
```bash
cd backend
# If using venv
.\venv\Scripts\Activate.ps1  # Windows
source venv/bin/activate      # Linux/Mac

# Start server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 3. Frontend Setup

No additional dependencies needed! The feature uses built-in browser APIs.

**Restart the frontend:**
```bash
cd frontend
npm run dev
```

### 4. Testing

#### Test on Mobile Device (with fingerprint sensor):
1. Open the app on your mobile device
2. Login with credentials (e.g., EMP002)
3. Click camera icon to capture face
4. You'll see "Thumb Verification" modal
5. Click "Setup Fingerprint" (first time only)
6. Follow device prompts to scan finger
7. Next time, click "Verify Fingerprint"

#### Test on Desktop (without fingerprint):
1. Open the app on desktop browser
2. Login with credentials
3. Click camera icon to capture face
4. You'll see "PIN Entry Required" modal
5. Click "Setup New PIN"
6. Enter 4-6 digit PIN twice
7. Next time, enter PIN to verify

## Features Overview

### ✅ What's Implemented

1. **Automatic Detection**: Detects if device has fingerprint sensor
2. **Biometric Enrollment**: Register fingerprint via WebAuthn
3. **Fingerprint Verification**: Verify identity with fingerprint
4. **PIN Fallback**: Use PIN on devices without biometric
5. **Device-Specific PINs**: Each device can have its own PIN
6. **Security**: Biometric data never leaves device, PINs are hashed
7. **Switch Methods**: Can switch between fingerprint and PIN

### 🔒 Security

- Biometric data **never transmitted** to server
- PINs are **hashed with bcrypt** before storage
- Device-specific PINs prevent cross-device misuse
- Face verification **still required** (biometric/PIN is additional)
- WebAuthn standard for hardware-level security

## API Endpoints

### Setup Device PIN
```
POST /api/v1/auth/setup-pin
Body: {
  "employee_id": "EMP001",
  "device_id": "abc123...",
  "pin": "123456"
}
```

### Verify Device PIN
```
POST /api/v1/auth/verify-pin
Body: {
  "employee_id": "EMP001",
  "device_id": "abc123...",
  "pin": "123456"
}
```

### Check PIN Status
```
GET /api/v1/auth/device-pin-status/{employee_id}/{device_id}
```

## User Flow

### Check-In/Check-Out Flow with Biometric

1. **Employee clicks camera** → Captures face image
2. **Face verification** → Compares with enrolled face
3. **Biometric modal appears**:
   - If fingerprint available: "Place finger on sensor"
   - If not available: "Enter device PIN"
4. **Verification succeeds** → Attendance recorded
5. **Process completes** → Success message shown

### First Time Setup

#### Fingerprint Setup:
1. Modal shows "Setup Fingerprint" button
2. Click button
3. Browser/OS prompts for fingerprint
4. Scan finger on device sensor
5. Fingerprint enrolled locally
6. Next time: "Verify Fingerprint" appears

#### PIN Setup:
1. Modal shows "Setup New PIN" button
2. Click button
3. Enter 4-6 digit PIN
4. Confirm PIN
5. PIN saved to server (hashed)
6. Next time: "Enter PIN" appears

## Browser Support

### WebAuthn (Fingerprint) Support:
- ✅ Chrome 67+
- ✅ Firefox 60+
- ✅ Edge 18+
- ✅ Safari 13+
- ✅ Mobile browsers on iOS 14+ and Android 7+

### Devices with Biometric Support:
- ✅ Modern smartphones with fingerprint sensor
- ✅ Laptops with fingerprint reader (Windows Hello, Touch ID)
- ✅ Tablets with fingerprint sensor
- ❌ Desktop PCs (usually no fingerprint sensor)

## Troubleshooting

### "Biometric hardware not detected"
**Cause**: Device doesn't have fingerprint sensor or browser doesn't support WebAuthn
**Solution**: Use PIN fallback instead

### "Failed to register fingerprint"
**Cause**: User cancelled prompt or biometric not set up in OS
**Solution**: Setup biometric in device settings, then try again

### "Invalid PIN"
**Cause**: Entered wrong PIN
**Solution**: Try again or setup new PIN

### "Device ID changed"
**Cause**: Browser data was cleared
**Solution**: Setup new PIN for the new device ID

## Testing Scenarios

### Scenario 1: Mobile with Fingerprint
```
1. Login as EMP002
2. Capture face → Modal appears
3. Click "Setup Fingerprint"
4. Scan finger → Enrolled
5. Capture face again → Modal appears
6. Click "Verify Fingerprint"
7. Scan finger → Verified ✅
8. Attendance recorded
```

### Scenario 2: Desktop without Fingerprint
```
1. Login as EMP002
2. Capture face → Modal appears (PIN mode)
3. Click "Setup New PIN"
4. Enter "123456" twice
5. Capture face again → Modal appears
6. Enter PIN "123456"
7. Verified ✅
8. Attendance recorded
```

### Scenario 3: Switch from Fingerprint to PIN
```
1. On device with fingerprint
2. Capture face → Modal appears
3. Click "Use PIN Instead"
4. Setup or enter PIN
5. Verified ✅
```

## Code Overview

### Frontend Files:
- `frontend/services/biometricService.ts` - Biometric detection and WebAuthn
- `frontend/components/VerificationModal.tsx` - Verification UI
- `frontend/App.tsx` - Integration
- `frontend/services/apiConfig.ts` - API endpoints

### Backend Files:
- `backend/app/models/user.py` - User model with device_pins
- `backend/app/schemas/device_pin.py` - PIN schemas
- `backend/app/services/device_pin_service.py` - PIN logic
- `backend/app/routers/auth.py` - PIN endpoints
- `backend/alembic/versions/add_device_pins.py` - Migration

## Next Steps

1. ✅ Run database migration
2. ✅ Restart backend and frontend
3. ✅ Test on mobile device with fingerprint
4. ✅ Test on desktop with PIN
5. ✅ Test switching between methods
6. ✅ Verify security (check hashed PINs in database)

## Support

For detailed implementation documentation, see:
- `BIOMETRIC_VERIFICATION_GUIDE.md` - Complete technical documentation
- API documentation at http://localhost:8000/docs

## Notes

- Biometric verification is **in addition to face verification**, not a replacement
- Each device can have its own PIN
- Biometric data is stored only on the device hardware
- PINs are hashed before storage in database
- Device ID is generated from device characteristics
