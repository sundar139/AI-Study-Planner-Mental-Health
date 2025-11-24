
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Float, Enum as SqEnum, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.db.base import Base

class MoodValence(str, enum.Enum):
    VERY_NEGATIVE = "very_negative"
    NEGATIVE = "negative"
    NEUTRAL = "neutral"
    POSITIVE = "positive"
    VERY_POSITIVE = "very_positive"

class RiskAssessment(str, enum.Enum):
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"

class MoodCheckin(Base):
    __tablename__ = "mood_checkins"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    mood_valence = Column(SqEnum(MoodValence), nullable=False)
    energy_level = Column(Integer, nullable=False) # 1-5
    stress_level = Column(Integer, default=0) # 0-10
    anxiety_level = Column(Integer, default=0) # 0-10
    sleep_hours_last_night = Column(Float, nullable=True)
    additional_metrics = Column(JSON, default=dict)
    
    tags = Column(JSON, default=list)
    note = Column(Text, nullable=True)
    
    ai_risk_assessment = Column(SqEnum(RiskAssessment), default=RiskAssessment.LOW)
    ai_recommended_actions = Column(JSON, default=list)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    user = relationship("User", back_populates="mood_logs")
