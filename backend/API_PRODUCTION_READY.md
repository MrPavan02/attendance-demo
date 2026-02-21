# FastAPI Backend - Production Ready Configuration

## Overview

This document outlines the production-ready improvements made to the FastAPI backend for the Vayu Puthra Attendance System with face verification.

## Key Improvements

### 1. **Standardized JSON Responses**

All API endpoints now return responses in a standardized JSON format:

```json
{
  "status": "success" | "error" | "validation_error" | "unauthorized" | "forbidden",
  "message": "Human-readable message",
  "data": {} or null,
  "request_id": "unique-request-id-for-tracking"
}
```

### 2. **HTTP Status Codes**

Properly implemented status codes:

- **200 OK**: Successful GET/PATCH request
- **201 CREATED**: Successful POST request creating a resource
- **400 BAD REQUEST**: Client error (invalid image, face not detected, validation failed)
- **401 UNAUTHORIZED**: Missing or invalid authentication token
- **403 FORBIDDEN**: Authenticated but insufficient permissions
- **404 NOT FOUND**: Resource not found
- **422 UNPROCESSABLE ENTITY**: Request validation error
- **500 INTERNAL SERVER ERROR**: Server error

### 3. **Global Exception Handlers**

Comprehensive exception handling in `main.py`:

#### Handled Exception Types:

1. **ValidationError** (422)
   - Invalid input data
   - Example: Missing required fields, invalid types

2. **ImageProcessingError** (400)
   - Image is too small
   - Invalid base64 encoding
   - Corrupted image data
   - Example: `"Image is too small (minimum 15000 bytes required)"`

3. **FaceVerificationError** (400)
   - Face not detected in image
   - Face matching failed
   - Confidence below threshold
   - Example: `"No face detected in the provided image"`

4. **SecurityValidationError** (400)
   - Location outside geofence
   - Time-based anomalies detected
   - Suspicious attendance patterns
   - Example: `"Location is outside office geofence (245m away)"`

5. **NotFoundError** (404)
   - Employee not found
   - Enrolled face not found
   - Resource doesn't exist
   - Example: `"Enrolled face image not found: EMP002"`

6. **AuthenticationError** (401)
   - Invalid credentials
   - Missing token
   - Token expired
   - Example: `"Invalid employee ID or password"`

7. **AuthorizationError** (403)
   - Insufficient permissions
   - Cannot perform action
   - Example: `"Can only check in for yourself"`

8. **DatabaseError** (500)
   - Database connection issues
   - Transaction failures
   - Query errors

9. **RequestValidationError** (422)
   - Pydantic validation errors
   - Invalid request schema
   - Returns detailed error list with field names

10. **Generic Exception Handler** (500)
    - Catches all unhandled exceptions
    - Logs full traceback
    - Returns generic message (doesn't expose internal details)

### 4. **Response Schemas**

Defined in `app/core/schemas.py`:

#### BaseResponse
```python
{
  "status": "success|error|...",
  "message": "string"
}
```

#### SuccessResponse
```python
{
  "status": "success",
  "message": "string",
  "data": any,
  "request_id": "uuid"
}
```

#### MessageResponse
```python
{
  "status": "success",
  "message": "string",
  "request_id": "uuid"
}
```

#### ErrorResponse
```python
{
  "status": "error",
  "message": "string",
  "details": {
    "field": "value"
  },
  "request_id": "uuid"
}
```

#### FaceVerificationResponse
```python
{
  "status": "success",
  "message": "string",
  "match": boolean,
  "confidence": float (0.0-1.0)
}
```

### 5. **Request Tracking**

Every request gets a unique ID:

```python
# Middleware in main.py
@app.middleware("http") 
async def add_request_id_middleware(request: Request, call_next):
    request_id = str(uuid.uuid4())
    request.state.request_id = request_id
    # ... process request ...
    response.headers["X-Request-ID"] = request_id
    return response
```

**Benefits:**
- Track requests across logs
- Debugging and auditing
- Correlate frontend and backend logs
- Performance monitoring

### 6. **Logging Configuration**

Enhanced logging in `app/core/logging_config.py`:

#### Structured Logging (JSON Format)

Logs are recorded in JSON format for easy parsing:

```json
{
  "timestamp": "2024-02-21T10:30:45.123456",
  "level": "INFO",
  "logger": "app.routers.attendance",
  "message": "Check-in successful for EMP002",
  "module": "attendance",
  "function": "check_in",
  "line": 45,
  "request_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

#### Log Files:

1. **logs/app.log** (10MB, up to 10 backups)
   - All application logs
   - Rotating file handler

2. **logs/error.log** (10MB, up to 10 backups)
   - ERROR and above
   - Easy filtering of problems

3. **logs/security.log** (10MB, up to 20 backups)
   - WARNING and above
   - Audit trail
   - Suspicious activity

### 7. **CORS Configuration**

Properly configured CORS middleware:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "..."],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*", "X-Request-ID"],
    max_age=600,
)
```

**Exposes:**
- `X-Request-ID`: Request tracking header
- Custom headers for debugging

## API Endpoint Examples

### Login Endpoint

**Request:**
```bash
POST /api/v1/auth/login
Content-Type: application/json

{
  "employee_id": "EMP001",
  "password": "admin123"
}
```

**Success Response (200):**
```json
{
  "status": "success",
  "message": "Login successful",
  "data": {
    "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "token_type": "bearer",
    "user": {
      "id": "...",
      "employee_id": "EMP001",
      "name": "Admin User",
      "email": "admin@example.com",
      "department": "IT",
      "role": "HR",
      "is_active": true,
      "created_at": "2024-02-20T10:00:00",
      "last_login": "2024-02-21T09:30:00"
    }
  },
  "request_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Error Response (401):**
```json
{
  "status": "unauthorized",
  "message": "Invalid employee ID or password",
  "request_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Check-In Endpoint

**Request:**
```bash
POST /api/v1/attendance/check-in
Authorization: Bearer {token}
Content-Type: application/json

{
  "employee_id": "EMP002",
  "entry_type": "IN",
  "latitude": 19.244449,
  "longitude": 83.422297,
  "work_mode": "OFFICE",
  "image_data": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
}
```

**Success Response (201):**
```json
{
  "status": "success",
  "message": "Check-in successful",
  "data": {
    "entry_id": "ATT-20240221-EMP002-001",
    "employee_id": "EMP002",
    "entry_type": "IN",
    "timestamp": "2024-02-21T09:15:30",
    "latitude": 19.244449,
    "longitude": 83.422297,
    "work_mode": "OFFICE",
    "is_flagged": false,
    "flag_reason": null
  },
  "request_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Error: Face Not Detected (400):**
```json
{
  "status": "error",
  "message": "No face detected in the provided image",
  "request_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Error: Enrolled Face Not Found (404):**
```json
{
  "status": "error",
  "message": "Enrolled face image not found: EMP002",
  "request_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Error: Image Too Small (400):**
```json
{
  "status": "error",
  "message": "Image is too small (minimum 15000 bytes required)",
  "request_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Error: Location Outside Geofence (400):**
```json
{
  "status": "error",
  "message": "Location is outside office geofence (245m away)",
  "request_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Error: Validation Error (422):**
```json
{
  "status": "validation_error",
  "message": "Request validation failed",
  "errors": [
    {
      "field": "employee_id",
      "message": "field required",
      "type": "value_error.missing"
    }
  ],
  "request_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

## Frontend Integration

### Error Handling in Frontend

**Example error response parsing:**

```typescript
const response = await fetch('/api/v1/auth/login', {
  method: 'POST',
  body: JSON.stringify({ employee_id, password })
});

if (!response.ok) {
  const error = await response.json();
  
  switch (response.status) {
    case 401:
      // Handle authentication error
      console.error(error.message); // "Invalid employee ID or password"
      break;
    case 422:
      // Handle validation error
      console.error(error.errors); // Array of field errors
      break;
    case 500:
      // Handle server error
      console.error('Internal server error');
      break;
  }
} else {
  const data = await response.json();
  const token = data.data.access_token;
}
```

### Response Validation

Always validate response structure:

```typescript
function isValidResponse(response: any): response is SuccessResponse {
  return (
    response &&
    typeof response.status === 'string' &&
    typeof response.message === 'string' &&
    'data' in response
  );
}
```

## Production Checklist

- [x] Global exception handlers for all error types
- [x] Standardized JSON response format
- [x] Proper HTTP status codes
- [x] CORS configuration
- [x] Request ID tracking
- [x] Structured logging (JSON format)
- [x] Rotating log files
- [x] Security logging
- [x] Error logging
- [x] Request/response logging with duration
- [x] Input validation with detailed errors
- [x] Database error handling
- [x] Authentication/Authorization
- [x] Rate limiting ready (can be added with middleware)
- [x] API documentation (Swagger available at `/api/v1/docs`)
- [x] Health check endpoint (`/api/v1/health`)

## Monitoring & Debugging

### Check Health
```bash
curl http://localhost:8000/api/v1/health
```

### View Logs
```bash
# All logs
tail -f logs/app.log

# Errors only
tail -f logs/error.log

# Security events
tail -f logs/security.log
```

### Track Request by ID
```bash
grep "550e8400-e29b-41d4-a716-446655440000" logs/app.log
```

### API Documentation
Open: `http://localhost:8000/api/v1/docs`

## Face Verification Error Handling

### Image Processing Errors

1. **No Image Provided**
   - Status: 422
   - Message: "Missing image data"
   - Details: Field and reason

2. **Invalid Base64 Encoding**
   - Status: 400
   - Message: "Invalid base64 image data"
   - Reason: Original error details

3. **Image Too Small**
   - Status: 400
   - Message: "Image is too small (minimum 15000 bytes required)"
   - File size information included

4. **Corrupted Image Data**
   - Status: 400
   - Message: "Failed to process image data"
   - Reason: Underlying error

### Face Detection Errors

1. **No Face Detected**
   - Status: 400
   - Message: "No face detected in the provided image"
   - Reason: "Image does not contain a human face"

2. **Multiple Faces Detected**
   - Status: 400
   - Message: "Multiple faces found"
   - Reason: "Expected exactly one face"

3. **Face Verification Failed**
   - Status: 400
   - Message: "Face verification failed"
   - Confidence: 0.45 (distance exceeded threshold)

### Enrollment Errors

1. **Enrolled Face Not Found**
   - Status: 404
   - Message: "Enrolled face image not found: EMP002"
   - Possible causes:
     - Employee not yet enrolled
     - Face image URL is broken
     - Face file missing from disk

### Security Validation Errors

1. **Location Outside Geofence**
   - Status: 400
   - Message: "Location is outside office geofence (245m away)"
   - Details: Distance in meters, allowed radius

2. **Suspicious Time Pattern**
   - Status: 400
   - Message: "Suspicious attendance pattern detected"
   - Anomalies: List of detected issues

## Best Practices

### For Frontend

1. **Always check response status code**
   ```typescript
   if (response.status === 200) {
     // Parse data
   } else {
     // Handle error with response.status
   }
   ```

2. **Validate response structure**
   ```typescript
   if (data?.status && data?.message) {
     // Valid response
   } else {
     // Invalid response - log error
   }
   ```

3. **Use request ID for debugging**
   ```typescript
   const requestId = response.headers.get('X-Request-ID');
   console.log(`Request ID: ${requestId}`);
   ```

4. **Handle specific error messages**
   ```typescript
   const message = data.message;
   if (message.includes('Image')) {
     // Image-related error
   } else if (message.includes('geofence')) {
     // Location error
   }
   ```

### For Backend

1. **Always raise appropriate exceptions**
   ```python
   # Good
   raise FaceVerificationError("No face detected", confidence=0.0)
   
   # Bad
   raise Exception("Error")
   ```

2. **Log with request_id**
   ```python
   logger.info(
     "Check-in successful",
     extra={'request_id': request.state.request_id}
   )
   ```

3. **Return response objects**
   ```python
   # Good
   return SuccessResponse(
     status=ResponseStatus.SUCCESS,
     message="Check-in successful",
     data=entry
   )
   
   # Bad
   return {"status": "ok", "data": entry}
   ```

## Summary

This production-ready configuration ensures:

✅ **Consistent** JSON responses across all endpoints  
✅ **Proper** HTTP status codes for error conditions  
✅ **Comprehensive** exception handling  
✅ **Detailed** error messages for debugging  
✅ **Request tracking** for auditing and monitoring  
✅ **Structured logging** for easy parsing  
✅ **Security** event logging  
✅ **Frontend-friendly** error responses  
✅ **API documentation** via Swagger UI  
✅ **Health monitoring** ready  

The frontend can now reliably parse API responses and handle all error conditions appropriately.
