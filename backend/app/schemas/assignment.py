
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.models.assignment import DifficultyLevel, AssignmentStatus, SourceType, ImportanceLevel

# Subtask
class SubtaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    estimated_minutes: Optional[int] = 15
    status: Optional[AssignmentStatus] = AssignmentStatus.NOT_STARTED
    order_index: Optional[int] = 0

class SubtaskCreate(SubtaskBase):
    pass

class SubtaskUpdate(SubtaskBase):
    pass

class Subtask(SubtaskBase):
    id: int
    assignment_id: int
    ai_generated: bool
    model_config = ConfigDict(from_attributes=True)

# Assignment
class AssignmentBase(BaseModel):
    title: str
    description: Optional[str] = None
    due_at: Optional[datetime] = None
    estimated_minutes: Optional[int] = 30
    difficulty: Optional[DifficultyLevel] = DifficultyLevel.MEDIUM
    status: Optional[AssignmentStatus] = AssignmentStatus.NOT_STARTED
    source_type: Optional[SourceType] = SourceType.MANUAL
    user_confidence: Optional[int] = 3
    importance_level: Optional[ImportanceLevel] = ImportanceLevel.MEDIUM
    ai_context_summary: Optional[str] = None
    is_group: Optional[bool] = False

class AssignmentCreate(AssignmentBase):
    course_id: Optional[int] = None

class AssignmentUpdate(AssignmentBase):
    course_id: Optional[int] = None

class Assignment(AssignmentBase):
    id: int
    user_id: int
    course_id: Optional[int]
    ai_generated_plan: bool
    created_at: datetime
    updated_at: Optional[datetime]
    subtasks: List[Subtask] = []
    model_config = ConfigDict(from_attributes=True)

# Course
class CourseBase(BaseModel):
    name: str
    code: Optional[str] = None
    color_hex: Optional[str] = "#3B82F6"

class CourseCreate(CourseBase):
    pass

class CourseUpdate(CourseBase):
    pass

class Course(CourseBase):
    id: int
    user_id: int
    created_at: datetime
    assignments: List[Assignment] = []
    model_config = ConfigDict(from_attributes=True)
