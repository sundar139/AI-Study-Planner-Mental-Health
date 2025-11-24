
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum as SqEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base
import enum

class GoalSessionStatus(str, enum.Enum):
    SCHEDULED = "SCHEDULED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    SKIPPED = "SKIPPED"

class Goal(Base):
    __tablename__ = "goals"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    duration_minutes = Column(Integer, nullable=False)
    preferred_time_window = Column(String, nullable=True)
    sessions_per_week = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    owner = relationship("User", backref="goals")
    sessions = relationship("GoalSession", back_populates="goal", cascade="all, delete-orphan")

class GoalSession(Base):
    __tablename__ = "goal_sessions"

    id = Column(Integer, primary_key=True, index=True)
    goal_id = Column(Integer, ForeignKey("goals.id"), nullable=False)
    start_time = Column(DateTime(timezone=True), nullable=False)
    end_time = Column(DateTime(timezone=True), nullable=False)
    status = Column(SqEnum(GoalSessionStatus), default=GoalSessionStatus.SCHEDULED)

    goal = relationship("Goal", back_populates="sessions")

