from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum as SqEnum, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base
import enum

class ActivityType(str, enum.Enum):
    STUDY = "study"
    WALK = "walk"
    MEDITATE = "meditate"
    RELAX = "relax"

class ActivityStatus(str, enum.Enum):
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELED = "canceled"

class ActivitySession(Base):
    __tablename__ = "activity_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    activity_type = Column(SqEnum(ActivityType), nullable=False)
    selected_duration_minutes = Column(Integer, nullable=False)
    actual_runtime_seconds = Column(Integer, default=0)

    started_at = Column(DateTime(timezone=True), server_default=func.now())
    ended_at = Column(DateTime(timezone=True), nullable=True)
    status = Column(SqEnum(ActivityStatus), default=ActivityStatus.IN_PROGRESS)

    study_minutes = Column(Integer, nullable=True)
    break_minutes = Column(Integer, nullable=True)
    cycles_completed = Column(Integer, default=0)
    log = Column(Text, nullable=True)

    user = relationship("User")