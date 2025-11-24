
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, JSON, Enum as SqEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.db.base import Base

class InterventionCategory(str, enum.Enum):
    BREATHING = "breathing"
    MOVEMENT = "movement"
    FOCUS = "focus"
    REFRAMING = "reframing"
    REWARD = "reward"
    SOCIAL = "social"

class UserFeedback(str, enum.Enum):
    HELPFUL = "helpful"
    NEUTRAL = "neutral"
    NOT_HELPFUL = "not_helpful"

class Intervention(Base):
    __tablename__ = "interventions"

    id = Column(Integer, primary_key=True, index=True)
    category = Column(SqEnum(InterventionCategory), nullable=False)
    title = Column(String, index=True, nullable=False)
    description = Column(Text, nullable=False)
    estimated_duration_minutes = Column(Integer, default=5)
    requirements = Column(JSON, default=list) # e.g. ["headphones", "quiet space"]
    recommended_for = Column(JSON, default=dict) # e.g. {"stress": "high"}

    sessions = relationship("InterventionSession", back_populates="intervention")

class InterventionSession(Base):
    __tablename__ = "intervention_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    intervention_id = Column(Integer, ForeignKey("interventions.id"), nullable=False)
    
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    user_feedback = Column(SqEnum(UserFeedback), nullable=True)
    context_snapshot = Column(JSON, nullable=True) # mood, workload at time

    intervention = relationship("Intervention", back_populates="sessions")
    user = relationship("User") # Add backref in User if needed, or just one-way for now
