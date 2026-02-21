"""
Holiday Model
Defines holiday configuration schema
"""

from sqlalchemy import Column, String, DateTime
from sqlalchemy.sql import func
from datetime import datetime

from app.core.database import Base


class Holiday(Base):
    """Holiday model"""
    __tablename__ = "holidays"
    
    id = Column(String, primary_key=True, index=True)  # UUID
    date = Column(String, nullable=False, index=True)  # YYYY-MM-DD
    name = Column(String, nullable=False)
    country = Column(String, nullable=False, index=True)
    state = Column(String, nullable=False, index=True)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    created_by = Column(String)
    
    def __repr__(self):
        return f"<Holiday {self.name} - {self.date} ({self.country}/{self.state})>"
