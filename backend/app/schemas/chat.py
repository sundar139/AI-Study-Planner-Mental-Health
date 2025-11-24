
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.models.chat import RiskFlag

class ChatSessionBase(BaseModel):
    summary: Optional[str] = None
    risk_flag: Optional[RiskFlag] = RiskFlag.NONE

class ChatSessionCreate(ChatSessionBase):
    pass

class ChatSessionUpdate(ChatSessionBase):
    ended_at: Optional[datetime] = None
    summary: Optional[str] = None
    risk_flag: Optional[RiskFlag] = None

class ChatSession(ChatSessionBase):
    id: int
    user_id: int
    started_at: datetime
    ended_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class ChatMessage(BaseModel):
    role: Optional[str] = "user"  # user, assistant
    content: str
    context: Optional[Dict[str, Any]] = None

class ChatMessageCreate(BaseModel):
    session_id: int
    role: str
    content: str

class ChatMessageOut(BaseModel):
    id: int
    session_id: int
    role: str
    content: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class ChatSessionDetail(ChatSession):
    messages: List[ChatMessageOut] = []
