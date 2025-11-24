
from typing import Optional, List, Dict
from pydantic import BaseModel, ConfigDict

class UserSettingsBase(BaseModel):
    max_daily_study_hours: Optional[int] = 8
    preferred_study_blocks: Optional[List[Dict[str, str]]] = []
    notification_preferences: Optional[Dict] = {}
    privacy_preferences: Optional[Dict] = {}
    wellbeing_settings: Optional[Dict] = {}

class UserSettingsCreate(UserSettingsBase):
    pass

class UserSettingsUpdate(UserSettingsBase):
    pass

class UserSettings(UserSettingsBase):
    id: int
    user_id: int
    model_config = ConfigDict(from_attributes=True)
