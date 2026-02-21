"""
Logging Configuration
Setup centralized logging for the application
"""

import logging
import logging.handlers
import json
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional
from app.core.config import settings


class JSONFormatter(logging.Formatter):
    """JSON formatter for structured logging"""
    
    def format(self, record: logging.LogRecord) -> str:
        log_data = {
            'timestamp': datetime.utcnow().isoformat(),
            'level': record.levelname,
            'logger': record.name,
            'message': record.getMessage(),
            'module': record.module,
            'function': record.funcName,
            'line': record.lineno,
        }
        
        # Add exception info if present
        if record.exc_info:
            log_data['exception'] = self.formatException(record.exc_info)
        
        # Add extra fields if present
        if hasattr(record, 'request_id'):
            log_data['request_id'] = record.request_id
        if hasattr(record, 'extra_data'):
            log_data['extra'] = record.extra_data
            
        return json.dumps(log_data)


def setup_logging():
    """Configure application logging"""
    
    # Create logs directory
    log_dir = Path("logs")
    log_dir.mkdir(exist_ok=True)
    
    # Root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.DEBUG if settings.DEBUG else logging.INFO)
    
    # Cancel existing handlers
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)
    
    # Console handler (formatted)
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    console_formatter = logging.Formatter(
        '[%(levelname)s] %(asctime)s - %(name)s - %(funcName)s:%(lineno)d - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    console_handler.setFormatter(console_formatter)
    root_logger.addHandler(console_handler)
    
    # File handler (JSON format)
    file_handler = logging.handlers.RotatingFileHandler(
        log_dir / 'app.log',
        maxBytes=10 * 1024 * 1024,  # 10 MB
        backupCount=10
    )
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(JSONFormatter())
    root_logger.addHandler(file_handler)
    
    # Error file handler
    error_handler = logging.handlers.RotatingFileHandler(
        log_dir / 'error.log',
        maxBytes=10 * 1024 * 1024,  # 10 MB
        backupCount=10
    )
    error_handler.setLevel(logging.ERROR)
    error_handler.setFormatter(JSONFormatter())
    root_logger.addHandler(error_handler)
    
    # Security file handler
    security_handler = logging.handlers.RotatingFileHandler(
        log_dir / 'security.log',
        maxBytes=10 * 1024 * 1024,  # 10 MB
        backupCount=20
    )
    security_handler.setLevel(logging.WARNING)
    security_handler.setFormatter(JSONFormatter())
    security_logger = logging.getLogger('security')
    security_logger.addHandler(security_handler)
    
    return root_logger


def get_logger(name: str) -> logging.Logger:
    """Get logger instance"""
    return logging.getLogger(name)


def log_request(logger: logging.Logger, method: str, path: str, user_id: Optional[str] = None):
    """Log incoming request"""
    logger.info(f"Request: {method} {path}", extra={'extra_data': {'user_id': user_id}})


def log_response(logger: logging.Logger, method: str, path: str, status_code: int, duration: float):
    """Log outgoing response"""
    logger.info(f"Response: {method} {path} - {status_code}", extra={'extra_data': {'duration_ms': duration}})


def log_security_event(event_type: str, employee_id: str, details: Dict[str, Any]):
    """Log security-related events"""
    security_logger = get_logger('security')
    security_logger.warning(
        f"Security Event: {event_type} - Employee: {employee_id}",
        extra={'extra_data': details}
    )
