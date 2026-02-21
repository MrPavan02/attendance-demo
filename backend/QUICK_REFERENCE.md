# Quick Reference Guide

## For Developers

### Starting the Backend
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Testing the Refactored Backend
```bash
# Run comprehensive tests
python test_json_responses.py

# Quick health check
curl http://localhost:8000/api/v1/health | jq .

# Test invalid input
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"invalid": "data"}' | jq .
```

### Checking Logs
```bash
# View all logs (JSON format)
tail -50 logs/app.log | jq .

# View errors only
tail -100 logs/error.log | jq .

# View security events
tail -50 logs/security.log | jq .

# Search by request ID
grep "550e8400-e29b-41d4-a716" logs/app.log | jq .

# View latest error details
curl http://localhost:8000/api/v1/invalid 2>/dev/null | jq .
# Check logs/error.log for details
```

## Exception Handling Examples

### Creating a New Exception Handler

```python
# 1. Define the exception in app/core/exceptions.py
class MyCustomError(Exception):
    def __init__(self, message: str, code: str = None):
        self.message = message
        self.code = code

# 2. Add handler in app/main.py
@app.exception_handler(MyCustomError)
async def my_custom_error_handler(request: Request, exc: MyCustomError):
    request_id = getattr(request.state, 'request_id', 'unknown')
    logger.error(f"Custom error: {exc.message}", extra={'request_id': request_id})
    
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "status": "error",
            "message": exc.message,
            "code": exc.code,
            "request_id": request_id
        }
    )

# 3. Use in your code
from app.core.exceptions import MyCustomError

def some_endpoint():
    if error_condition:
        raise MyCustomError("Something went wrong", code="CUSTOM_001")
```

### Adding New Logging

```python
from app.core.logging_config import get_logger, log_security_event

logger = get_logger(__name__)

# Info level
logger.info("User logged in", extra={'extra_data': {'user_id': 'EMP001'}})

# Warning level
logger.warning("Geofence violation", extra={'extra_data': {'lat': 0, 'lon': 0}})

# Error level
logger.error("Database connection failed", extra={'extra_data': {'db_host': 'localhost'}})

# Security events (logged to logs/security.log)
log_security_event(
    event_type="GEOFENCE_VIOLATION",
    employee_id="EMP001",
    details={"latitude": 0, "longitude": 0, "expected_location": "Office"}
)
```

### Validating Image Data

```python
from app.services.security_service import SecurityService
from app.core.exceptions import ImageProcessingError, ValidationError

try:
    # In your endpoint
    image_bytes = SecurityService.validate_image_data(image_data_from_request)
    # image_bytes is now validated and decoded
    
except ValidationError as e:
    # Missing image data
    raise e  # Will be caught by global handler, returns 422
    
except ImageProcessingError as e:
    # Invalid or too small image
    raise e  # Will be caught by global handler, returns 400
```

## Response Patterns

### Success Pattern
```python
# All success responses follow this pattern
from app.core.schemas import SuccessResponse

return {
    "status": "success",
    "message": "Operation completed successfully",
    "data": {...},  # Endpoint-specific data
    "request_id": request.state.request_id  # From middleware
}
```

### Error Pattern
```python
# All error responses caught by handlers
# The handler automatically creates this structure:
{
    "status": "error",  # or validation_error, unauthorized, forbidden
    "message": "Human-readable error message",
    "details": {...},  # Optional, error-specific details
    "request_id": "uuid"  # From middleware
}
```

## Common Errors & Solutions

### Error: "No enrolled face image found"
**Cause:** Employee has no face enrollment  
**Solution:** Enroll the face via `/api/v1/auth/me` endpoint

### Error: "Image is too small"
**Cause:** Image < 15KB (configurable in .env MIN_IMAGE_SIZE_BYTES)  
**Solution:** Send better quality image (higher resolution)

### Error: "Invalid base64 image data"
**Cause:** Image data not properly base64 encoded  
**Solution:** Client should encode image with `toDataURL()` or `btoa()`

### Error: "Geofence violation"
**Cause:** Location is outside allowed area for work mode  
**Solution:** Check location settings in config

### Error: "Rapid succession"
**Cause:** Already checked in/out within last 60 seconds  
**Solution:** Wait 1 minute before next attempt

## Frontend Integration

### Updated API Call Pattern
```typescript
// In frontend/services/apiConfig.ts
// Already has proper error handling!

try {
    const response = await apiCall(ENDPOINTS.ATTENDANCE.CHECK_IN, {
        method: 'POST',
        body: JSON.stringify(payload)
    });
    
    const data = await response.json();
    
    // data will have:
    // - status: "success" | "error"
    // - message: "User-friendly message"
    // - details: {...} // if error
    // - request_id: "uuid" // for debugging
    
    if (!response.ok) {
        throw new Error(`${data.status}: ${data.message}`);
    }
    
} catch (error) {
    // Now always gets proper error
    console.error('API Error:', error.message);
}
```

## Monitoring & Analytics

### Using Request IDs for Tracing
```bash
# Follow a user's requests
grep "EMP001" logs/app.log | jq 'select(.request_id == "550e8400-e29b-41d4-a716")'

# Find slow requests (> 500ms)
tail -1000 logs/app.log | jq 'select(.duration_ms > 500)'

# Find errors for a user
grep "EMP001" logs/error.log | jq .

# Get all security events
cat logs/security.log | jq 'select(.event_type)'
```

### Logging to Aggregation Tool (ELK, Datadog, etc.)
```python
# Logs are already in JSON format!
# Just stream logs/app.log to your aggregation tool
# The JSONFormatter outputs proper structured logs

# Example parsing with jq:
cat logs/app.log | jq 'select(.level == "WARNING")'
```

## Performance Tips

1. **Log rotation is automatic** - Max 10MB per file, keeps 10 backups
2. **Image validation is fast** - Only checks size and format
3. **Request logging overhead** - ~1-2ms per request
4. **Database queries still logged** - Check SQLAlchemy logs in console

## Deployment Checklist

- [ ] Run tests: `python test_json_responses.py`
- [ ] Check logs folder created: `ls logs/`
- [ ] Verify health endpoint: `curl http://localhost:8000/api/v1/health`
- [ ] Check error handler works: `curl http://localhost:8000/api/v1/invalid`
- [ ] Verify Swagger docs: `http://localhost:8000/api/v1/docs`
- [ ] Test with valid credentials
- [ ] Check logs directory has files
- [ ] Verify request IDs in logs: `grep "request_id" logs/app.log | head -5`

## Files to Know

| File | Purpose |
|------|---------|
| `app/main.py` | Entry point, exception handlers, middleware |
| `app/core/exceptions.py` | Exception classes |
| `app/core/schemas.py` | Response models |
| `app/core/logging_config.py` | Logging setup |
| `app/services/security_service.py` | Image validation, face lookup |
| `app/routers/attendance.py` | Check-in/out endpoints |
| `logs/app.log` | All application logs (JSON) |
| `logs/error.log` | Errors only (JSON) |
| `logs/security.log` | Security events (JSON) |
| `test_json_responses.py` | Test suite |

## Support

### If something fails:
1. Check `logs/error.log` for detailed error
2. Grep request ID in logs: `grep "request-id" logs/*.log | jq .`
3. Check status code in response
4. Verify .env file has correct settings
5. Ensure database connection works

### Common Problems:
```bash
# "ImportError: No module named app"
# Solution: Run from backend/ directory

# "Connection refused" on database
# Solution: Check PostgreSQL is running

# "ModuleNotFoundError"
# Solution: pip install -r requirements.txt

# "Permission denied" on logs/
# Solution: chmod 755 logs/ (or create manually)
```

## Testing Checklist

```bash
# 1. Health check
curl http://localhost:8000/api/v1/health | jq .

# 2. Authentication required
curl -X POST http://localhost:8000/api/v1/attendance/check-in | jq .

# 3. Invalid input
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{}' | jq .

# 4. Check logs reached
tail logs/app.log | jq .

# 5. Run full test suite
python test_json_responses.py
```

Good luck! 🚀
