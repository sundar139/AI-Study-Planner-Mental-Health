
from typing import Optional, List, Dict
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.models.intervention import InterventionCategory, UserFeedback

# Intervention
class InterventionBase(BaseModel):
    category: InterventionCategory
    title: str
    description: str
    estimated_duration_minutes: Optional[int] = 5
    requirements: Optional[List[str]] = []
    recommended_for: Optional[Dict] = {}

class InterventionCreate(InterventionBase):
    pass

class InterventionUpdate(InterventionBase):
    pass

class Intervention(InterventionBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

# Intervention Session
class InterventionSessionBase(BaseModel):
    intervention_id: int
    user_feedback: Optional[UserFeedback] = None
    context_snapshot: Optional[Dict] = None

class InterventionSessionCreate(InterventionSessionBase):
    pass

class InterventionSessionUpdate(BaseModel):
    completed_at: Optional[datetime] = None
    user_feedback: Optional[UserFeedback] = None

class InterventionSession(InterventionSessionBase):
    id: int
    user_id: int
    started_at: datetime
    completed_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)
