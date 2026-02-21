"""Application configuration"""
from typing import List, Tuple
from pydantic_settings import BaseSettings
from pydantic import validator


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # Application
    APP_NAME: str = "Vayu Puthra Attendance System"
    DEBUG: bool = True
    API_VERSION: str = "v1"
    API_PREFIX: str = "/api/v1"
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # Database
    DATABASE_URL: str
    DATABASE_URL_ASYNC: str = ""
    DB_POOL_SIZE: int = 20
    DB_MAX_OVERFLOW: int = 10
    
    # JWT
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours
    
    # CORS
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:3001,http://127.0.0.1:3002,http://127.0.0.1:5173"
    
    @validator("CORS_ORIGINS", pre=True)
    def assemble_cors_origins(cls, v):
        if isinstance(v, str):
            return v
        elif isinstance(v, list):
            return ",".join(v)
        return v
    
    def get_cors_origins_list(self) -> List[str]:
        """Get CORS origins as list"""
        if isinstance(self.CORS_ORIGINS, str):
            return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]
        return self.CORS_ORIGINS
    
    @property
    def office_coordinates(self) -> Tuple[float, float]:
        """Get office coordinates as tuple"""
        return (self.OFFICE_MAIN_LATITUDE, self.OFFICE_MAIN_LONGITUDE)
    
    @property
    def branch_coordinates(self) -> Tuple[float, float]:
        """Get branch coordinates as tuple"""
        return (self.OFFICE_BRANCH_LATITUDE, self.OFFICE_BRANCH_LONGITUDE)
    
    # Security & Geofencing
    GEOFENCE_RADIUS_METERS: int = 200
    MIN_OFFICE_HOURS: int = 8
    MIN_IMAGE_SIZE_BYTES: int = 15000
    
    # Office Coordinates
    OFFICE_MAIN_LATITUDE: float = 19.244449
    OFFICE_MAIN_LONGITUDE: float = 83.422297
    OFFICE_BRANCH_LATITUDE: float = 34.0522
    OFFICE_BRANCH_LONGITUDE: float = -118.2437
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"  # Ignore extra fields in .env


settings = Settings()
