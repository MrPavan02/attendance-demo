# Quick Reference: Fixed Error Messages

## What Was Fixed?

The system was showing technical error messages like:
```
"Unexpected token '<', " <!DOCTYPE "... is not valid JSON"
```

**This has been fixed.** You now see clear, helpful messages instead.

## Common Error Messages and Solutions

### 1. "Server returned invalid response"
**What it means**: The backend API is not responding correctly
**Solution**:
- [ ] Check if backend server is running (`uvicorn app.main:app --reload`)
- [ ] Verify backend is on `http://localhost:8000`
- [ ] Check backend logs for errors
- [ ] Restart the backend server

### 2. "Backend server is not responding correctly"
**What it means**: Backend crashed or returned unexpected data
**Solution**:
- [ ] Check backend logs for crash messages
- [ ] Verify database connection is working
- [ ] Restart both backend and frontend
- [ ] Check network connectivity

### 3. "Cannot reach the backend server"
**What it means**: Frontend cannot connect to backend at all
**Solution**:
- [ ] Start backend: `cd backend && uvicorn app.main:app --reload`
- [ ] Verify it says "Uvicorn running on http://127.0.0.1:8000"
- [ ] Check firewall settings
- [ ] Ensure port 8000 is not in use by another app

### 4. During Login: "Incorrect employee ID or password"
**What it means**: Your credentials don't match
**Solution**:
- [ ] Double-check employee ID (case-sensitive)
- [ ] Verify password (case-sensitive)
- [ ] Default credentials:
  - Admin: `EMP001` / `admin123`
  - Employee: `EMP002` / `emp123`

### 5. During Check-in: "Enrolled face image not found"
**What it means**: Face biometric not enrolled for this user
**Solution**:
- [ ] Admin needs to enroll face image for user
- [ ] Contact HR administrator to complete face enrollment
- [ ] Try again after face is enrolled

### 6. During Check-in: "Not authenticated"
**What it means**: Your login session expired
**Solution**:
- [ ] Log out and log back in
- [ ] Check that backend is running
- [ ] Close browser and try again

## Troubleshooting Checklist

### Before anything else:
```bash
# 1. Check backend is running
ps aux | grep uvicorn

# 2. Check frontend is running
ps aux | grep npm

# 3. Check port 8000 is listening
netstat -an | grep 8000
```

### If you see any "<!DOCTYPE" or raw JSON errors:
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for messages starting with `[API Error]`
4. These will show the actual problem
5. Share these console messages when reporting issues

### Backend not responding:
```bash
# When in doubt, restart everything:

# Terminal 1: Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload

# Terminal 2: Frontend (in new terminal)
cd frontend
npm install  # if needed
npm run dev
```

### Database issues:
```bash
# If database seems corrupted:
cd backend
python setup_database.py
# This recreates the database with sample data
```

## For Developers

If you encounter an error that still includes raw JSON parsing errors:

1. **Check browser console (F12)**
   - Look for `[API Error]` messages
   - These show what the backend actually returned

2. **Check backend logs**
   - Look in `backend/logs/error.log`
   - Check for stack traces

3. **Test API directly**
   ```bash
   # Test login
   curl -X POST http://localhost:8000/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"employee_id":"EMP001","password":"admin123"}'
   
   # Should return JSON, not HTML
   ```

4. **If you see HTML in response**
   - Backend may have crashed
   - Check `backend/logs/error.log`
   - Check database connection

## Version Information

- **Fix Date**: February 21, 2026
- **Status**: ✅ Deployed and tested
- **Error Handling**: Enhanced for all API endpoints
- **Coverage**: Login, Logout, Check-in, Check-out, and all other API operations

## Still Having Issues?

1. Check all the troubleshooting steps above
2. Verify both backend and frontend are running
3. Check backend logs in `backend/logs/`
4. Check browser console (F12) for `[API Error]` messages
5. Ensure database is running and accessible
6. Restart both applications
7. Clear browser cache and localStorage if needed

---

**Remember**: All error messages are now clear and actionable. If you see a technical error, it means something specific went wrong - check the troubleshooting section above for that message.
