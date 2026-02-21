# Architecture & Data Flow

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          FRONTEND (React/TypeScript)                     │
│                                                                           │
│  - Camera Capture Component                                              │
│  - API Calls with proper error handling                                  │
│  - JSON response parsing                                                 │
└─────────────────────────┬───────────────────────────────────────────────┘
                          │ HTTP/HTTPS
                          │ JSON Request
                          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         FASTAPI BACKEND                                  │
│                                                                           │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ MIDDLEWARE LAYER                                                 │  │
│  │  • Request ID Generator (UUID)                                   │  │
│  │  • CORS Handler                                                  │  │
│  │  • Request/Response Logger                                       │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                          ▼                                               │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ ROUTER LAYER                                                     │  │
│  │  • /auth/login                                                   │  │
│  │  • /attendance/check-in                                          │  │
│  │  • /attendance/check-out                                         │  │
│  │ (All endpoints protected by dependency injection)                │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                          ▼                                               │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ SERVICE LAYER                                                    │  │
│  │  • AttendanceService                                             │  │
│  │  • SecurityService                                               │  │
│  │  • AuthService                                                   │  │
│  │ (Business logic, validation, error handling)                     │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                          ▼                                               │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ EXCEPTION HANDLING LAYER ✨ NEW                                  │  │
│  │  • ValidationError → 422                                         │  │
│  │  • ImageProcessingError → 400                                    │  │
│  │  • SecurityValidationError → 400                                 │  │
│  │  • AuthenticationError → 401                                     │  │
│  │  • AuthorizationError → 403                                      │  │
│  │  • NotFoundError → 404                                           │  │
│  │  • DatabaseError → 500                                           │  │
│  │  • Global Exception Handler → 500                                │  │
│  │ (All return JSON with request ID)                                │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                          ▼                                               │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ RESPONSE LAYER                                                   │  │
│  │  • JSON Response with status, message, request_id                │  │
│  │  • Proper HTTP status codes                                      │  │
│  │  • Additional data based on endpoint                             │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└─────────────────────────┬───────────────────────────────────────────────┘
                          │ HTTP/HTTPS
                          │ JSON Response
                          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Response Handler)                      │
│                                                                           │
│  - Parse JSON response                                                   │
│  - Check status code                                                     │
│  - Show appropriate error/success message                                │
│  - Log request_id for debugging                                          │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                         BACKEND SUPPORTING SERVICES                      │
│                                                                           │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌────────────────┐ │
│  │  PostgreSQL Database │  │  Image Store         │  │  Static Files  │ │
│  │                      │  │  (local disk/cloud)  │  │  (enrolled      │ │
│  │  - Users             │  │                      │  │   faces)        │ │
│  │  - Attendance Entries│  │  - Enrolled faces    │  │                 │ │
│  │  - Shifts            │  │  - Captured images   │  │                 │ │
│  │  - Requests          │  │                      │  │                 │ │
│  └──────────────────────┘  └──────────────────────┘  └────────────────┘ │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌────────────────┐ │
│  │  JSON Logging        │  │  Error Logging       │  │  Security Logs │ │
│  │  (logs/app.log)      │  │  (logs/error.log)    │  │  (logs/        │ │
│  │                      │  │                      │  │   security.log)│ │
│  │  - All requests      │  │  - Errors only       │  │  - Anomalies   │ │
│  │  - All responses     │  │  - Exceptions        │  │  - Violations  │ │
│  │  - All operations    │  │  - Stack traces      │  │  - Warnings    │ │
│  └──────────────────────┘  └──────────────────────┘  └────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

## Request/Response Flow

### Successful Check-in Flow ✅

```
┌────────────────────────────────────────────────────────────────────────┐
│ FRONTEND                                                                │
│  const payload = {                                                      │
│    employee_id: "EMP001",                                              │
│    timestamp: "2026-02-21T09:00:00Z",                                  │
│    image_data: "iVBORw0KGgo...",                                       │
│    ... other fields ...                                                │
│  }                                                                      │
└─────────────────────┬─────────────────────────────────────────────────┘
                      │
                      │ POST /api/v1/attendance/check-in
                      │ {payload}
                      ▼
┌────────────────────────────────────────────────────────────────────────┐
│ BACKEND - REQUEST ID MIDDLEWARE                                        │
│  request.state.request_id = "550e8400-e29b-41d4-a716-446655440000"   │
│  logger.info("Request: POST /api/v1/attendance/check-in")              │
└─────────────────────┬─────────────────────────────────────────────────┘
                      │
                      ▼
┌────────────────────────────────────────────────────────────────────────┐
│ BACKEND - ROUTER                                                       │
│  @router.post("/check-in")                                             │
│  def check_in(entry_data, db_session, current_user):                   │
│    logger.info(f"Processing check-in for {entry_data.employee_id}")    │
└─────────────────────┬─────────────────────────────────────────────────┘
                      │
                      ▼
┌────────────────────────────────────────────────────────────────────────┐
│ BACKEND - SERVICE                                                      │
│  attendance_service.create_attendance_entry(...)                       │
│    └─> security_service.validate_attendance(...)                       │
│         ├─ Geofence check ✓                                            │
│         ├─ Fetch enrolled face ✓                                       │
│         ├─ validate_image_data(image) ✓                                │
│         ├─ Timestamp anomaly check ✓                                   │
│         └─ Returns (True, "Validation passed", [])                     │
│                                                                        │
│    └─> Create attendance entry in database ✓                           │
│    └─> Return AttendanceEntry object ✓                                 │
└─────────────────────┬─────────────────────────────────────────────────┘
                      │
                      ▼
┌────────────────────────────────────────────────────────────────────────┐
│ BACKEND - RESPONSE                                                     │
│  HTTP/1.1 201 Created                                                   │
│  Content-Type: application/json                                         │
│  X-Request-ID: 550e8400-e29b-41d4-a716-446655440000                   │
│                                                                        │
│  {                                                                      │
│    "id": "ca4d3c28-5f25-4d3d-a2f3-7c8e9a0b1c2d",                    │
│    "employee_id": "EMP001",                                            │
│    "timestamp": "2026-02-21T09:00:00",                                 │
│    "type": "IN",                                                       │
│    "mode": "OFFICE",                                                   │
│    "latitude": 28.6139,                                                │
│    "longitude": 77.2090,                                               │
│    "device_id": "device_001",                                          │
│    "verification_method": "BIOMETRIC",                                 │
│    "is_flagged": false,                                                │
│    "flag_reason": null,                                                │
│    "duration": null                                                    │
│  }                                                                      │
└─────────────────────┬─────────────────────────────────────────────────┘
                      │
                      │ Response written
                      │ logger.info("Response: 201")
                      ▼
┌────────────────────────────────────────────────────────────────────────┐
│ FRONTEND                                                               │
│  const data = await response.json()                                    │
│  // ✓ Successfully parsed JSON                                        │
│  console.log("Check-in successful!", data.id)                         │
│  // ✓ Show success message to user                                    │
└────────────────────────────────────────────────────────────────────────┘
```

### Error Flow - Missing Image ❌

```
┌────────────────────────────────────────────────────────────────────────┐
│ FRONTEND                                                                │
│  const payload = {                                                      │
│    employee_id: "EMP001",                                              │
│    timestamp: "2026-02-21T09:00:00Z",                                  │
│    image_data: null,  ← MISSING!                                       │
│    ...                                                                 │
│  }                                                                      │
└─────────────────────┬─────────────────────────────────────────────────┘
                      │
                      │ POST /api/v1/attendance/check-in
                      │ {payload}
                      ▼
┌────────────────────────────────────────────────────────────────────────┐
│ BACKEND - REQUEST ID MIDDLEWARE                                        │
│  request.state.request_id = "550e8400-e29b-41d4-a716-deadbeef"        │
│  logger.info("Request: POST /api/v1/attendance/check-in")              │
└─────────────────────┬─────────────────────────────────────────────────┘
                      │
                      ▼
┌────────────────────────────────────────────────────────────────────────┐
│ BACKEND - ROUTER                                                       │
│  @router.post("/check-in")                                             │
│  def check_in(entry_data, db_session, current_user):                   │
│    logger.info(f"Processing check-in for {entry_data.employee_id}")    │
│    entry = attendance_service.create_attendance_entry(...)             │
│      └─> raise ValidationError("Missing image data", ...)              │
│          ↓                                                             │
│          logger.error("Validation error during check-in")              │
│          raise  ← Exception propagates                                 │
└─────────────────────┬─────────────────────────────────────────────────┘
                      │
                      │ Exception caught by global handler
                      ▼
┌────────────────────────────────────────────────────────────────────────┐
│ BACKEND - GLOBAL EXCEPTION HANDLER                                     │
│  @app.exception_handler(ValidationError)                               │
│  async def validation_error_handler(request, exc):                     │
│    request_id = request.state.request_id                               │
│    logger.warning(f"Validation error: {exc.message}")                  │
│    return JSONResponse(                                                │
│      status_code=422,                                                  │
│      content={                                                         │
│        "status": "validation_error",                                   │
│        "message": "Missing image data",                                │
│        "details": {                                                    │
│          "field": "image_data",                                        │
│          "reason": "Image data is required"                            │
│        },                                                              │
│        "request_id": "550e8400-e29b-41d4-a716-deadbeef"               │
│      }                                                                 │
│    )                                                                   │
└─────────────────────┬─────────────────────────────────────────────────┘
                      │
                      │ Response written
                      │ logger.info("Response: 422")
                      ▼
┌────────────────────────────────────────────────────────────────────────┐
│ FRONTEND                                                               │
│  const data = await response.json()                                    │
│  // ✓ Successfully parsed JSON (NOT HTML!)                           │
│                                                                        │
│  if (!response.ok) {                                                   │
│    console.error(`Error: ${data.status}`);                            │
│    console.error(`Message: ${data.message}`);                         │
│    console.log(`Request ID: ${data.request_id}`);                     │
│    // ✓ Show clear error to user                                      │
│    // ✓ Can report issue with request_id                              │
│  }                                                                      │
└────────────────────────────────────────────────────────────────────────┘

LOGS:
  logs/app.log:
    {"timestamp":"...", "request_id":"550e8400...", "message":"Request: POST", ...}
    {"timestamp":"...", "request_id":"550e8400...", "message":"Response: 422", ...}

  logs/error.log:
    {"timestamp":"...", "request_id":"550e8400...", "message":"Validation error", ...}
```

## Exception Handler Tree

```
Exception Raised
    ▼
┌─────────────────────────────────────────────────────────────────────┐
│ ValidationError                                                     │
├─ Status: 422 Unprocessable Entity                                  │
├─ Body: {status, message, details, request_id}                      │
└─ Example: Missing required field, invalid data type               │
    ▼
┌─────────────────────────────────────────────────────────────────────┐
│ ImageProcessingError                                                │
├─ Status: 400 Bad Request                                           │
├─ Body: {status, message, details, request_id}                      │
└─ Example: Image too small, invalid base64, decode error            │
    ▼
┌─────────────────────────────────────────────────────────────────────┐
│ FaceVerificationError                                               │
├─ Status: 400 Bad Request                                           │
├─ Body: {status, message, match, confidence, request_id}            │
└─ Example: Face not found, low confidence match                     │
    ▼
┌─────────────────────────────────────────────────────────────────────┐
│ AuthenticationError                                                 │
├─ Status: 401 Unauthorized                                          │
├─ Body: {status, message, request_id}                               │
└─ Example: Invalid credentials, expired token                       │
    ▼
┌─────────────────────────────────────────────────────────────────────┐
│ AuthorizationError                                                  │
├─ Status: 403 Forbidden                                             │
├─ Body: {status, message, request_id}                               │
└─ Example: User doesn't have permission for operation               │
    ▼
┌─────────────────────────────────────────────────────────────────────┐
│ NotFoundError                                                       │
├─ Status: 404 Not Found                                             │
├─ Body: {status, message, request_id}                               │
└─ Example: Employee not found, enrolled face not found              │
    ▼
┌─────────────────────────────────────────────────────────────────────┐
│ SecurityValidationError                                             │
├─ Status: 400 Bad Request                                           │
├─ Body: {status, message, anomalies, request_id}                    │
└─ Example: Geofence violation, rapid succession, device mismatch    │
    ▼
┌─────────────────────────────────────────────────────────────────────┐
│ DatabaseError                                                       │
├─ Status: 500 Internal Server Error                                 │
├─ Body: {status, message, request_id}                               │
└─ Example: Connection failure, constraint violation                 │
    ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Generic Exception (Global Handler)                                  │
├─ Status: 500 Internal Server Error                                 │
├─ Body: {status, message, request_id}                               │
└─ Example: Unexpected errors, logs full traceback                   │
```

## Logging Flow

```
Request comes in
    ▼
[REQUEST ID MIDDLEWARE]
    ├─ Generate unique UUID
    ├─ Store in request.state.request_id
    ├─ Log to logs/app.log (JSON format)
    └─ Pass through to router
    ▼
[ROUTER ENDPOINT]
    ├─ Log: "Processing check-in for EMP001"
    └─ Call service
    ▼
[SERVICE LAYER]
    ├─ Log: "Attempting validation"
    ├─ If error: Log to console + logs/app.log + logs/error.log
    └─ Return result or raise exception
    ▼
[EXCEPTION HANDLER OR SUCCESS]
    ├─ Log: "Response: 201" or "Response: 400"
    └─ Return JSON response
    ▼
[RESPONSE MIDDLEWARE]
    ├─ Add X-Request-ID header
    ├─ Log final response
    └─ Send to client
    ▼
[CLIENT RECEIVES]
    ├─ X-Request-ID header for tracing
    └─ Consistent JSON response

[FILES CREATED]
    logs/app.log        ← All requests/responses
    logs/error.log      ← Errors only
    logs/security.log   ← Security events
```

## Benefits of This Architecture

```
✅ Separation of Concerns
   - Exception handling isolated from business logic
   - Logging centralized and configurable
   - Middleware handles cross-cutting concerns

✅ Consistency
   - All endpoints follow same response format
   - All errors return JSON with same structure
   - All requests get unique ID for tracking

✅ Debuggability
   - Every request has unique ID
   - All logs in JSON (machine-parseable)
   - Can search/filter with tools like jq

✅ Maintainability
   - New exception types easy to add
   - Exception handlers centralized
   - Logging configuration in one place

✅ Production Ready
   - Graceful error handling
   - No internal details leaked
   - Structured logging for aggregation tools
   - Automatic log rotation

✅ Backward Compatible
   - All endpoints work the same
   - Only difference is error format (JSON vs HTML)
   - No database migrations needed
```

---

This architecture ensures your backend is **scalable**, **maintainable**, and **production-ready**! 🚀
