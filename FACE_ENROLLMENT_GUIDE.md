# Face Image Enrollment Guide

## Issue: "Enrolled face image not found"

When you see this error during check-in/check-out:
```
Verification Interrupted
Enrolled face image not found: EMP001
```

**This is a legitimate security requirement**, not a system bug.

## What It Means

The Vayu Puthra Attendance System requires biometric face verification. Before any employee can check in/out, their face image must be enrolled in the system:

- ✓ Face enrollment stores a reference image
- ✓ During check-in, the system compares captured face with enrolled image
- ✓ This prevents spoofing and unauthorized attendance

## How to Enroll Face Images

### Method 1: Admin Upload (Recommended for Setup)

1. Navigate to system admin panel
2. Select "Employee Management"
3. Find the employee (e.g., EMP001)
4. Click "Upload Face Image" or "Enroll Biometric"
5. Upload a clear face photo
6. Confirm enrollment is successful

### Method 2: Direct Database Setup (For Development)

```bash
cd backend

# This script enrolls face images for test users
python scripts/set_face_image_url.py

# It will:
# - Find all users without face images
# - Set default face images for testing
# - Create sample face data
```

### Method 3: API Call (Advanced)

```bash
# First, login to get a token
TOKEN=$(curl -s http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"employee_id":"EMP001","password":"admin123"}' | jq -r '.access_token')

# Then upload face image for user
curl -X POST http://localhost:8000/api/v1/employees/EMP001/face \
  -H "Authorization: Bearer $TOKEN" \
  -F "image=@path/to/face.jpg"
```

## For Testing The System

### Quick Setup
```bash
# 1. Start backend
cd backend
python scripts/seed_comprehensive_data.py  # This includes face image enrollment

# 2. Or enroll faces manually
python scripts/set_face_image_url.py

# 3. Start frontend
cd frontend
npm run dev

# 4. Login and try check-in (face images now enrolled)
```

### Test Credentials (After Face Enrollment)
- **Admin**: EMP001 / admin123 (face enrolled)
- **Employee**: EMP002 / emp123 (face enrolled)
- **Employee**: EMP003 / emp123 (face enrolled)

## Error Message Breakdown

| Error | Meaning | Solution |
|---|---|---|
| "Enrolled face image not found: EMPXXX" | No face image for user | Enroll face image using admin panel or script |
| "Face mismatch" | Captured face doesn't match enrolled | Check lighting, angle, and clarity |
| "No enrolled face available" | System can't find enrolled image | Verify enrollment was successful |
| "Geolocation access denied" | Browser geolocation blocked | Allow location access in browser settings |
| "Verification timeout" | Network too slow | Check connection and try again |

## Security Notes

- ✅ Face images are stored securely
- ✅ Only face data processed (no video saved)
- ✅ Verification happens locally for privacy
- ✅ Enrolled faces cannot be accessed directly
- ✅ Each check-in requires fresh face capture

## Troubleshooting

### Face still not enrolling?
1. Check file format (JPG, PNG recommended)
2. Ensure image is clear and frontal
3. Check database permissions
4. Verify backend logs for errors

### Enrolled face still gives "not found" error?
1. Check if enrollment actually saved
2. Verify database connection
3. Restart backend to refresh cache
4. Check `backend/static/faces/` directory

### Can't capture face from camera?
1. Allow camera access in browser
2. Check browser console (F12) for camera errors
3. Verify webcam works in other applications
4. Try different browser if issue persists

## Development vs Production

### Development (Testing)
- Use sample face images from `backend/static/faces/`
- Run `set_face_image_url.py` to auto-enroll
- Test with multiple face angles

### Production
- Collect face images during HR onboarding
- Store with proper security/privacy controls
- Implement quality checks before enrollment
- Maintain audit log of enrollments

## Next Steps

1. ✅ Enroll face images for test users
2. ✅ Verify enrollment successful
3. ✅ Try check-in/check-out again
4. ✅ Monitor for any new errors

---

**Status**: Face enrollment is working as designed  
**Support**: Contact HR admin for face image enrollment assistance
