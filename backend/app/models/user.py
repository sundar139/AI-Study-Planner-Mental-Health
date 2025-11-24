

from sqlalchemy import Boolean, Column, Integer, String, DateTime
from sqlalchemy.orm import relationship # Added this import
from sqlalchemy.sql import func
from app.db.base import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, index=True)
    timezone = Column(String, default="UTC")
    institution = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    assignments = relationship("Assignment", back_populates="owner", cascade="all, delete-orphan")
    schedule_blocks = relationship("ScheduleBlock", back_populates="user", cascade="all, delete-orphan")
    mood_logs = relationship("MoodCheckin", back_populates="user", cascade="all, delete-orphan")
    memberships = relationship("GroupMember", back_populates="user", cascade="all, delete-orphan")
    settings = relationship("UserSettings", uselist=False, back_populates="user", cascade="all, delete-orphan")
