
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict

# Shared properties
class PeerGroupBase(BaseModel):
    name: str
    description: Optional[str] = None

# Properties to receive via API on creation
class PeerGroupCreate(PeerGroupBase):
    pass

# Properties to receive via API on update
class PeerGroupUpdate(PeerGroupBase):
    pass

class PeerGroupInDBBase(PeerGroupBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# Additional properties to return via API
class PeerGroup(PeerGroupInDBBase):
    member_count: Optional[int] = 0

class GroupMemberBase(BaseModel):
    user_id: int
    group_id: int

class GroupMember(GroupMemberBase):
    id: int
    joined_at: datetime
    model_config = ConfigDict(from_attributes=True)

class GroupMessageBase(BaseModel):
    content: str

class GroupMessageCreate(GroupMessageBase):
    pass

class GroupMessage(GroupMessageBase):
    id: int
    group_id: int
    user_id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)
