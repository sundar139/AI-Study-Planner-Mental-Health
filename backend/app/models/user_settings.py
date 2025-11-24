
from sqlalchemy import Column, Integer, String, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.db.base import Base

class UserSettings(Base):
    __tablename__ = "user_settings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    
    max_daily_study_hours = Column(Integer, default=8)
    preferred_study_blocks = Column(JSON, default=list) # List of {"start": "HH:MM", "end": "HH:MM"}
    notification_preferences = Column(JSON, default=dict)
    privacy_preferences = Column(JSON, default=dict)
    wellbeing_settings = Column(JSON, default=dict)

    user = relationship("User", back_populates="settings")
