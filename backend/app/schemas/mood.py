
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.models.mood import MoodValence, RiskAssessment

# Shared properties
class MoodCheckinBase(BaseModel):
    mood_valence: MoodValence
    energy_level: int
    stress_level: Optional[int] = 0
    anxiety_level: Optional[int] = 0
    sleep_hours_last_night: Optional[float] = None
    tags: Optional[List[str]] = []
    note: Optional[str] = None
    additional_metrics: Optional[Dict[str, Any]] = {}

# Properties to receive via API on creation
class MoodCheckinCreate(MoodCheckinBase):
    pass

# Properties to receive via API on update
class MoodCheckinUpdate(MoodCheckinBase):
    pass

class MoodCheckinInDBBase(MoodCheckinBase):
    id: int
    user_id: int
    ai_risk_assessment: Optional[RiskAssessment] = RiskAssessment.LOW
    ai_recommended_actions: Optional[List[Dict]] = []
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# Additional properties to return via API
class MoodCheckin(MoodCheckinInDBBase):
    pass

class MoodInsight(BaseModel):
    insight: str

class MoodSuggestion(BaseModel):
    title: str
    description: str
    category: str
