
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Enum as SqEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.db.base import Base

class RiskFlag(str, enum.Enum):
    NONE = "none"
    MILD = "mild"
    CONCERNING = "concerning"

class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    ended_at = Column(DateTime(timezone=True), nullable=True)
    summary = Column(Text, nullable=True)
    risk_flag = Column(SqEnum(RiskFlag), default=RiskFlag.NONE)

    user = relationship("User") # Add backref in User if needed


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("chat_sessions.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    role = Column(String, nullable=False)  # 'user' or 'assistant'
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    session = relationship("ChatSession")
    user = relationship("User")
