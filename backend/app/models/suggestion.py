from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.base import Base

class WellbeingSuggestion(Base):
    __tablename__ = "wellbeing_suggestions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    mood_checkin_id = Column(Integer, ForeignKey("mood_checkins.id"), nullable=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=False)
    category = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)

    user = relationship("User")
    mood_checkin = relationship("MoodCheckin")