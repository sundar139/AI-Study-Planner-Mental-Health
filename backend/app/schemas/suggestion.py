from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict

class WellbeingSuggestionBase(BaseModel):
    title: str
    description: str
    category: str
    mood_checkin_id: Optional[int] = None
    expires_at: Optional[datetime] = None

class WellbeingSuggestionCreate(WellbeingSuggestionBase):
    pass

class WellbeingSuggestion(WellbeingSuggestionBase):
    id: int
    user_id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)