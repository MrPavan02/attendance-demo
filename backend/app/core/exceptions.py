"""
Custom Exception Classes
Standardized exceptions for the application
"""

from typing import Optional, Any, Dict


class ValidationError(Exception):
    """Validation error - invalid input data"""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        self.message = message
        self.details = details or {}
        super().__init__(self.message)


class ImageProcessingError(Exception):
    """Image processing error - invalid image data"""
    def __init__(self, message: str, reason: Optional[str] = None):
        self.message = message
        self.reason = reason
        super().__init__(self.message)


class FaceVerificationError(Exception):
    """Face verification error - face matching failed"""
    def __init__(self, message: str, confidence: Optional[float] = None):
        self.message = message
        self.confidence = confidence
        super().__init__(self.message)


class AuthenticationError(Exception):
    """Authentication error - user not authenticated"""
    def __init__(self, message: str = "Authentication failed"):
        self.message = message
        super().__init__(self.message)


class AuthorizationError(Exception):
    """Authorization error - insufficient permissions"""
    def __init__(self, message: str = "Insufficient permissions"):
        self.message = message
        super().__init__(self.message)


class DatabaseError(Exception):
    """Database error - database operation failed"""
    def __init__(self, message: str, operation: Optional[str] = None):
        self.message = message
        self.operation = operation
        super().__init__(self.message)


class SecurityValidationError(Exception):
    """Security validation error"""
    def __init__(self, message: str, anomalies: Optional[list] = None):
        self.message = message
        self.anomalies = anomalies or []
        super().__init__(self.message)


class NotFoundError(Exception):
    """Resource not found error"""
    def __init__(self, resource: str, identifier: Optional[str] = None):
        self.resource = resource
        self.identifier = identifier
        self.message = f"{resource} not found"
        if identifier:
            self.message += f": {identifier}"
        super().__init__(self.message)
