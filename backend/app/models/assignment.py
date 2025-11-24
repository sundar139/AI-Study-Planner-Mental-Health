
from sqlalchemy import Boolean, Column, Integer, String, DateTime, ForeignKey, Enum as SqEnum, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base
import enum

class DifficultyLevel(int, enum.Enum):
    VERY_EASY = 1
    EASY = 2
    MEDIUM = 3
    HARD = 4
    VERY_HARD = 5

class AssignmentStatus(str, enum.Enum):
    NOT_STARTED = "NOT_STARTED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    ARCHIVED = "ARCHIVED"

class SourceType(str, enum.Enum):
    MANUAL = "manual"
    IMPORT_PDF = "import_pdf"
    IMPORT_LMS = "import_lms"

class ImportanceLevel(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, index=True, nullable=False)
    code = Column(String, index=True)
    color_hex = Column(String, default="#3B82F6")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    owner = relationship("User", backref="courses")
    assignments = relationship("Assignment", back_populates="course", cascade="all, delete-orphan")

class Assignment(Base):
    __tablename__ = "assignments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=True)
    title = Column(String, index=True, nullable=False)
    description = Column(Text, nullable=True)
    due_at = Column(DateTime(timezone=True), nullable=True)
    estimated_minutes = Column(Integer, default=30)
    difficulty = Column(SqEnum(DifficultyLevel), default=DifficultyLevel.MEDIUM)
    status = Column(SqEnum(AssignmentStatus), default=AssignmentStatus.NOT_STARTED)
    source_type = Column(SqEnum(SourceType), default=SourceType.MANUAL)
    user_confidence = Column(Integer, default=3) # 1-5
    importance_level = Column(SqEnum(ImportanceLevel), default=ImportanceLevel.MEDIUM)
    ai_context_summary = Column(Text, nullable=True)
    is_group = Column(Boolean, default=False)
    ai_generated_plan = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    owner = relationship("User", back_populates="assignments")
    course = relationship("Course", back_populates="assignments")
    subtasks = relationship("Subtask", back_populates="assignment", cascade="all, delete-orphan")
    schedule_blocks = relationship("ScheduleBlock", back_populates="assignment")

class Subtask(Base):
    __tablename__ = "subtasks"

    id = Column(Integer, primary_key=True, index=True)
    assignment_id = Column(Integer, ForeignKey("assignments.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    estimated_minutes = Column(Integer, default=15)
    status = Column(SqEnum(AssignmentStatus), default=AssignmentStatus.NOT_STARTED)
    order_index = Column(Integer, default=0)
    ai_generated = Column(Boolean, default=False)

    assignment = relationship("Assignment", back_populates="subtasks")
