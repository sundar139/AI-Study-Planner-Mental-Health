
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.models.schedule import BlockType, BlockSource, BlockStatus

class ScheduleBlockBase(BaseModel):
    start_at: datetime
    end_at: datetime
    type: Optional[BlockType] = BlockType.STUDY
    status: Optional[BlockStatus] = BlockStatus.PLANNED
    title: Optional[str] = None

class ScheduleBlockCreate(ScheduleBlockBase):
    assignment_id: Optional[int] = None
    subtask_id: Optional[int] = None
    source: Optional[BlockSource] = BlockSource.MANUAL

class ScheduleBlockUpdate(ScheduleBlockBase):
    assignment_id: Optional[int] = None
    subtask_id: Optional[int] = None

class ScheduleBlock(ScheduleBlockBase):
    id: int
    user_id: int
    assignment_id: Optional[int]
    subtask_id: Optional[int]
    source: BlockSource
    model_config = ConfigDict(from_attributes=True)
