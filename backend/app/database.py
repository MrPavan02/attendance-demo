"""
Database Configuration and Session Management
SQLAlchemy setup with async support
"""

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator
from app.core.config import settings

# Create SQLAlchemy engine
engine = create_engine(
    settings.database_url_sync,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    echo=settings.DEBUG
)

# Create SessionLocal class
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# Create Base class for models
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """
    Dependency for getting database session
    Automatically closes session after request
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """
    Initialize database tables
    Creates all tables defined in models
    """
    from app.models import user, attendance, request, shift, holiday
    Base.metadata.create_all(bind=engine)
