from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.models.activity import ActivityType, ActivityStatus

class ActivitySessionBase(BaseModel):
    activity_type: ActivityType
    selected_duration_minutes: int
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    status: Optional[ActivityStatus] = ActivityStatus.IN_PROGRESS
    actual_runtime_seconds: Optional[int] = 0
    study_minutes: Optional[int] = None
    break_minutes: Optional[int] = None
    cycles_completed: Optional[int] = 0
    log: Optional[str] = None

class ActivitySessionCreate(ActivitySessionBase):
    pass

class ActivitySessionUpdate(BaseModel):
    selected_duration_minutes: Optional[int] = None
    ended_at: Optional[datetime] = None
    status: Optional[ActivityStatus] = None
    actual_runtime_seconds: Optional[int] = None
    cycles_completed: Optional[int] = None
    log: Optional[str] = None

class ActivitySession(ActivitySessionBase):
    id: int
    user_id: int
    model_config = ConfigDict(from_attributes=True)