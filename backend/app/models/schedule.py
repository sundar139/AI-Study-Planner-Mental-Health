
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum as SqEnum
from sqlalchemy.orm import relationship
from app.db.base import Base
import enum

class BlockType(str, enum.Enum):
    STUDY = "STUDY"
    BREAK = "BREAK"
    EXAM = "EXAM"
    EVENT = "EVENT"
    PEER_SESSION = "PEER_SESSION"

class BlockSource(str, enum.Enum):
    MANUAL = "MANUAL"
    AI_SUGGESTED = "AI_SUGGESTED"
    IMPORTED = "IMPORTED"

class BlockStatus(str, enum.Enum):
    PLANNED = "PLANNED"
    COMPLETED = "COMPLETED"
    SKIPPED = "SKIPPED"
    CANCELED = "CANCELED"

class ScheduleBlock(Base):
    __tablename__ = "schedule_blocks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    assignment_id = Column(Integer, ForeignKey("assignments.id"), nullable=True)
    subtask_id = Column(Integer, ForeignKey("subtasks.id"), nullable=True)
    
    start_at = Column(DateTime(timezone=True), nullable=False)
    end_at = Column(DateTime(timezone=True), nullable=False)
    
    type = Column(SqEnum(BlockType), default=BlockType.STUDY)
    source = Column(SqEnum(BlockSource), default=BlockSource.MANUAL)
    status = Column(SqEnum(BlockStatus), default=BlockStatus.PLANNED)
    
    title = Column(String, nullable=True) # Optional override or for non-assignment blocks

    user = relationship("User", back_populates="schedule_blocks")
    assignment = relationship("Assignment", back_populates="schedule_blocks")
    subtask = relationship("Subtask", backref="schedule_blocks")
