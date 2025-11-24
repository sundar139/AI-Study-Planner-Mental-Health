from typing import Optional, List, Dict
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.models.goal import GoalSessionStatus
from app.schemas.schedule import ScheduleBlock

class GoalBase(BaseModel):
    name: str
    duration_minutes: int
    preferred_time_window: Optional[str] = None
    sessions_per_week: int

class GoalCreate(GoalBase):
    pass

class GoalUpdate(BaseModel):
    name: Optional[str] = None
    duration_minutes: Optional[int] = None
    preferred_time_window: Optional[str] = None
    sessions_per_week: Optional[int] = None

class GoalOut(GoalBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime]
    model_config = ConfigDict(from_attributes=True)

class GoalSessionBase(BaseModel):
    start_time: datetime
    end_time: datetime
    status: Optional[GoalSessionStatus] = GoalSessionStatus.SCHEDULED

class GoalSessionCreate(GoalSessionBase):
    pass

class GoalSessionOut(GoalSessionBase):
    id: int
    goal_id: int
    model_config = ConfigDict(from_attributes=True)

class GoalSessionScheduleResponse(BaseModel):
    goal_session: GoalSessionOut
    schedule_block: ScheduleBlock

class SuggestTimesRequest(BaseModel):
    date: str  # YYYY-MM-DD format
    duration_minutes: Optional[int] = None  # Optional override for duration

class TimeSuggestion(BaseModel):
    start_time: datetime
    end_time: datetime
    reason: Optional[str] = None

class SuggestTimesResponse(BaseModel):
    case: str  # "A" for suggestions, "B" for no good slots
    suggestions: Optional[List[TimeSuggestion]] = None
    message: Optional[str] = None
    alternatives: Optional[List[Dict[str, str]]] = None

class SuggestDatesTimesRequest(BaseModel):
    days: int = 3
    duration_minutes: Optional[int] = None
    fast: bool = False

class DateSuggestionsGroup(BaseModel):
    date: str
    suggestions: List[TimeSuggestion]

class MoodDateSuggestionsResponse(BaseModel):
    groups: List[DateSuggestionsGroup]

