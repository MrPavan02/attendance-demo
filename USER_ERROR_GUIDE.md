# User Guide: Specific Error Messages Explained

## Fixed Error Messages

You will now see **specific, helpful** error messages instead of "Server returned invalid response."

## Common Check-in Errors & Solutions

### Error 1: "Enrolled face image not found: EMP001"

**What it means:** Your face biometric is not enrolled in the system

**Why it happens:**
- You're a new employee
- Face enrollment was skipped during onboarding
- Face image was deleted or corrupted

**Solution:**
1. Contact your HR admin
2. Ask them to enroll your face image
3. Try check-in again

---

### Error 2: "Failed to process image data: Image is too small (minimum 15000 bytes required)"

**What it means:** The photo you captured is too small/pixelated

**Why it happens:**
- Low resolution camera
- Camera is too far away
- Photo is blurry or cropped too much
- Poor lighting

**Solution:**
1. Get closer to the camera
2. Ensure good lighting
3. Capture a clear, front-facing photo
4. Make sure at least your face fills most of the frame
5. Try again

---

### Error 3: "Face verification failed: confidence too low"

**What it means:** Your captured face doesn't match your enrolled photo well enough

**Why it happens:**
- Different lighting conditions
- Different angle or expression
- Beard/facial hair changes
- Glasses on/off
- Face too covered (mask, hat, etc.)

**Solution:**
1. Ensure lighting is similar to enrollment photo
2. Look directly at camera (frontal view)
3. Remove obstacles if possible
4. Try again with better positioning

---

### Error 4: "Location access denied. Biometric check requires GPS"

**What it means:** Browser geolocation permission was blocked

**Why it happens:**
- You selected "Block" when browser asked for location
- Location is disabled in browser settings
- Using VPN or private browsing mode

**Solution:**
1. Allow location access in browser:
   - Click lock icon in address bar
   - Find "Location" permission
   - Set to "Allow"
2. Refresh page
3. Try check-in again

---

### Error 5: "Cannot reach the backend server..."

**What it means:** The system frontend cannot connect to backend

**Why it happens:**
- Backend server is not running
- Server crashed
- Network connection issue
- Port 8000 is blocked

**Solution:**
1. Check if backend is running:
   - Should see: "Uvicorn running on http://127.0.0.1:8000"
2. If not running, start it:
   ```bash
   cd backend
   uvicorn app.main:app --reload
   ```
3. Wait 10 seconds for startup
4. Refresh page and try again

---

## Check-in Success Indicators

### ✓ Successful Flow
1. Click "Check In" button
2. Allow camera access
3. Capture face photo
4. System processes image
5. Face verification succeeds
6. See: **"Identity Check-in Verified"**
7. Attendance recorded!

### ✗ Common Issues During Capture

| Issue | Fix |
|-------|-----|
| Camera won't open | Allow camera in browser settings |
| Very dark image | Improve lighting (move to brighter area) |
| Image is pixelated | Get closer to camera |
| Face is turned away | Look directly at camera |
| Face is too small | Move closer to camera |
| Multiple faces detected | Only you should be in frame |

---

## Quick Troubleshooting

**If you see ANY error message:**

1. **Read the error carefully** - it tells you what to fix
2. **Follow the solution** - most errors have specific fixes
3. **Try again** - after fixing the issue
4. **Contact IT if stuck** - if you've tried everything

**Example scenarios:**

**Scenario A:**
- See: "Enrolled face image not found"
- Fix: Contact HR to enroll your face
- Result: Will work after enrollment

**Scenario B:**
- See: "Image is too small"
- Fix: Capture with better lighting/angle
- Result: Should work with next attempt

**Scenario C:**
- See: "Face verification failed"
- Fix: Try different lighting/angle
- Result: Should work with next attempt

---

## Key Differences From Before

### ❌ BEFORE (Confusing)
```
Error: Verification Interrupted
Details: Server returned invalid response. 
         Please ensure the backend API is running 
         and properly configured.
```
→ Doesn't tell you what's actually wrong!

### ✅ AFTER (Helpful)
```
Error: Verification Interrupted
Details: Failed to process image data: 
         Image is too small (minimum 15000 bytes required)
```
→ Tells you exactly what to fix!

---

## When To Contact Support

Contact your IT/HR team if:
- ✓ Face enrollment fails despite multiple attempts
- ✓ Error message doesn't match any scenarios listed
- ✓ Backend won't start
- ✓ Browser won't allow camera access
- ✓ Same error persists after following solutions

**Provide them:**
1. Your employee ID
2. Exact error message you see
3. What you were trying to do
4. Steps you already tried

---

## Need Help?

**For Face Enrollment Issues:**
```
Contact: HR Admin (@hr-admin)
Message: "Please enroll my face for check-in. 
          Error: Enrolled face image not found: [YOUR_EMP_ID]"
```

**For Technical Issues:**
```
Contact: IT Support (@it-support)
Message: "[Your issue] 
          Error: [Exact error message]
          Employee ID: [YOUR_EMP_ID]"
```

---

## Summary

✅ Error messages are now **specific and helpful**  
✅ You know exactly what went wrong  
✅ You know how to fix it  
✅ Support can help you faster  

**Most common fixes:**
- Let browser access camera
- Enroll face from HR admin
- Capture with better lighting
- Get closer to camera

Good luck with your check-ins!
