"""
FastAPI application entry point
"""
from fastapi import FastAPI, Request, status, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from contextlib import asynccontextmanager
import logging
import uuid
import time
import traceback

from app.core.config import settings
from app.core.database import engine, Base
from app.core.logging_config import setup_logging, get_logger
from app.core.exceptions import (
    ValidationError, ImageProcessingError, FaceVerificationError,
    AuthenticationError, AuthorizationError, DatabaseError,
    SecurityValidationError, NotFoundError
)
from app.core.schemas import ErrorResponse, ResponseStatus
from app.routers import auth, attendance, employees, shifts, requests, holidays, google_drive_proxy

# Setup logging
logger = setup_logging().getChild(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler"""
    # Startup
    logger.info("[*] Starting Vayu Puthra Attendance System...")
    logger.info(f"[DB] Database tables will be managed by Alembic migrations")
    logger.info(f"[OK] Application initialized")
    
    yield
    
    # Shutdown
    logger.info("[!] Shutting down...")


# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    description="Enterprise Attendance Management System with Biometric Authentication",
    version="1.0.0",
    docs_url=f"{settings.API_PREFIX}/docs",
    redoc_url=f"{settings.API_PREFIX}/redoc",
   lifespan=lifespan
)

# Configure CORS
cors_origins = settings.get_cors_origins_list() if hasattr(settings, 'get_cors_origins_list') else settings.CORS_ORIGINS.split(',')
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=600,
)

# Include routers
app.include_router(auth.router, prefix=settings.API_PREFIX, tags=["Authentication"])
app.include_router(attendance.router, prefix=settings.API_PREFIX, tags=["Attendance"])
app.include_router(employees.router, prefix=settings.API_PREFIX, tags=["Employees"])
app.include_router(shifts.router, prefix=settings.API_PREFIX, tags=["Shifts"])
app.include_router(requests.router, prefix=settings.API_PREFIX, tags=["Requests"])
app.include_router(holidays.router, prefix=settings.API_PREFIX, tags=["Holidays"])
app.include_router(google_drive_proxy.router, tags=["Google Drive Models"])

# Serve static assets (e.g., enrolled face images)
app.mount("/static", StaticFiles(directory="static"), name="static")


# ============================================================================
# GLOBAL EXCEPTION HANDLERS - Always return JSON responses
# ============================================================================

@app.exception_handler(ValidationError)
async def validation_error_handler(request: Request, exc: ValidationError):
    """Handle validation errors"""
    request_id = getattr(request.state, 'request_id', 'unknown')
    logger.warning(f"Validation error: {exc.message}", extra={'request_id': request_id})
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "status": ResponseStatus.VALIDATION_ERROR,
            "message": exc.message,
            "details": exc.details,
            "request_id": request_id
        }
    )


@app.exception_handler(ImageProcessingError)
async def image_processing_error_handler(request: Request, exc: ImageProcessingError):
    """Handle image processing errors"""
    request_id = getattr(request.state, 'request_id', 'unknown')
    logger.warning(f"Image processing error: {exc.message}", extra={'request_id': request_id})
    
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "status": ResponseStatus.ERROR,
            "message": exc.message,
            "details": {"reason": exc.reason} if exc.reason else None,
            "request_id": request_id
        }
    )


@app.exception_handler(FaceVerificationError)
async def face_verification_error_handler(request: Request, exc: FaceVerificationError):
    """Handle face verification errors"""
    request_id = getattr(request.state, 'request_id', 'unknown')
    logger.warning(f"Face verification error: {exc.message}", extra={'request_id': request_id})
    
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "status": ResponseStatus.ERROR,
            "message": exc.message,
            "match": False,
            "confidence": exc.confidence or 0.0,
            "request_id": request_id
        }
    )


@app.exception_handler(AuthenticationError)
async def authentication_error_handler(request: Request, exc: AuthenticationError):
    """Handle authentication errors"""
    request_id = getattr(request.state, 'request_id', 'unknown')
    logger.warning(f"Authentication error: {exc.message}", extra={'request_id': request_id})
    
    return JSONResponse(
        status_code=status.HTTP_401_UNAUTHORIZED,
        content={
            "status": ResponseStatus.UNAUTHORIZED,
            "message": exc.message,
            "request_id": request_id
        }
    )


@app.exception_handler(AuthorizationError)
async def authorization_error_handler(request: Request, exc: AuthorizationError):
    """Handle authorization errors"""
    request_id = getattr(request.state, 'request_id', 'unknown')
    logger.warning(f"Authorization error: {exc.message}", extra={'request_id': request_id})
    
    return JSONResponse(
        status_code=status.HTTP_403_FORBIDDEN,
        content={
            "status": ResponseStatus.FORBIDDEN,
            "message": exc.message,
            "request_id": request_id
        }
    )


@app.exception_handler(SecurityValidationError)
async def security_validation_error_handler(request: Request, exc: SecurityValidationError):
    """Handle security validation errors"""
    request_id = getattr(request.state, 'request_id', 'unknown')
    logger.warning(f"Security validation error: {exc.message}", extra={'request_id': request_id})
    
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "status": ResponseStatus.ERROR,
            "message": exc.message,
            "anomalies": exc.anomalies,
            "request_id": request_id
        }
    )


@app.exception_handler(NotFoundError)
async def not_found_error_handler(request: Request, exc: NotFoundError):
    """Handle not found errors"""
    request_id = getattr(request.state, 'request_id', 'unknown')
    logger.warning(f"Resource not found: {exc.message}", extra={'request_id': request_id})
    
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={
            "status": ResponseStatus.ERROR,
            "message": exc.message,
            "request_id": request_id
        }
    )


@app.exception_handler(DatabaseError)
async def database_error_handler(request: Request, exc: DatabaseError):
    """Handle database errors"""
    request_id = getattr(request.state, 'request_id', 'unknown')
    logger.error(f"Database error: {exc.message}", extra={'request_id': request_id})
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "status": ResponseStatus.ERROR,
            "message": "Database operation failed. Please try again later.",
            "request_id": request_id
        }
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle FastAPI HTTP exceptions"""
    request_id = getattr(request.state, 'request_id', 'unknown')
    
    # Map HTTP status codes to response status
    status_map = {
        401: ResponseStatus.UNAUTHORIZED,
        403: ResponseStatus.FORBIDDEN,
        404: ResponseStatus.ERROR,
        422: ResponseStatus.VALIDATION_ERROR,
    }
    
    response_status = status_map.get(exc.status_code, ResponseStatus.ERROR)
    
    logger.warning(
        f"HTTP exception: {exc.status_code} - {exc.detail}",
        extra={'request_id': request_id, 'status_code': exc.status_code}
    )
    
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "status": response_status,
            "message": str(exc.detail),
            "request_id": request_id
        }
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle Pydantic validation errors"""
    request_id = getattr(request.state, 'request_id', 'unknown')
    
    # Format validation errors
    errors = []
    for error in exc.errors():
        errors.append({
            "field": ".".join(str(loc) for loc in error["loc"][1:]),
            "message": error["msg"],
            "type": error["type"]
        })
    
    logger.warning(
        f"Validation error: {len(errors)} validation(s) failed",
        extra={'request_id': request_id, 'errors': errors}
    )
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "status": ResponseStatus.VALIDATION_ERROR,
            "message": "Request validation failed",
            "errors": errors,
            "request_id": request_id
        }
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler - catch all unhandled exceptions"""
    request_id = getattr(request.state, 'request_id', 'unknown')
    
    # Get exception details for logging
    exc_type = type(exc).__name__
    exc_message = str(exc)
    exc_traceback = traceback.format_exc()
    
    logger.exception(
        f"Unhandled exception: {exc_type}: {exc_message}",
        extra={
            'request_id': request_id,
            'path': request.url.path,
            'method': request.method,
            'exception_type': exc_type,
            'traceback': exc_traceback
        }
    )
    
    # Return generic error message to client (don't expose internal details)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "status": ResponseStatus.ERROR,
            "message": "Internal server error. Please contact support.",
            "request_id": request_id
        }
    )



# ============================================================================
# REQUEST/RESPONSE LOGGING MIDDLEWARE
# ============================================================================

@app.middleware("http")
async def add_request_id_middleware(request: Request, call_next):
    """Add request ID to each request for tracking"""
    request_id = str(uuid.uuid4())
    request.state.request_id = request_id
    
    # Skip logging for static files
    if request.url.path.startswith("/static"):
        return await call_next(request)
    
    start_time = time.time()
    
    try:
        response = await call_next(request)
    except Exception as exc:
        duration = time.time() - start_time
        logger.error(
            f"Request failed: {request.method} {request.url.path}",
            extra={
                'request_id': request_id,
                'duration_ms': duration * 1000,
                'exception': str(exc)
            }
        )
        raise
    
    duration = time.time() - start_time
    
    # Log response
    log_level = logging.INFO if response.status_code < 400 else logging.WARNING
    logger.log(
        log_level,
        f"Response: {request.method} {request.url.path} - {response.status_code}",
        extra={
            'request_id': request_id,
            'status_code': response.status_code,
            'duration_ms': duration * 1000
        }
    )
    
    response.headers["X-Request-ID"] = request_id
    return response


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "status": "success",
        "message": "Vayu Puthra Attendance System API",
        "version": "1.0.0",
        "docs": f"{settings.API_PREFIX}/docs",
        "health": f"{settings.API_PREFIX}/health"
    }


@app.get(f"{settings.API_PREFIX}/health")
async def health_check():
    """Health check endpoint"""
    from datetime import datetime
    return {
        "status": "healthy",
        "app_name": settings.APP_NAME,
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat(),
        "api_prefix": settings.API_PREFIX
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )
