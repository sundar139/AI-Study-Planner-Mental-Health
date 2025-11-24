
from typing import List, Optional

from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.peer_group import PeerGroup, GroupMember, GroupMessage
from app.schemas.peer_group import PeerGroupCreate, PeerGroupUpdate

class CRUDPeerGroup(CRUDBase[PeerGroup, PeerGroupCreate, PeerGroupUpdate]):
    def get_multi_with_members(
        self, db: Session, *, skip: int = 0, limit: int = 100
    ) -> List[PeerGroup]:
        return db.query(self.model).offset(skip).limit(limit).all()

    def join_group(self, db: Session, *, group_id: int, user_id: int) -> GroupMember:
        db_obj = GroupMember(group_id=group_id, user_id=user_id)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj
    
    def is_member(self, db: Session, *, group_id: int, user_id: int) -> bool:
        return db.query(GroupMember).filter(GroupMember.group_id == group_id, GroupMember.user_id == user_id).first() is not None

    def create_message(self, db: Session, *, group_id: int, user_id: int, content: str) -> GroupMessage:
        db_obj = GroupMessage(group_id=group_id, user_id=user_id, content=content)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def get_messages(self, db: Session, *, group_id: int, skip: int = 0, limit: int = 100) -> List[GroupMessage]:
        return db.query(GroupMessage).filter(GroupMessage.group_id == group_id).order_by(GroupMessage.created_at.desc()).offset(skip).limit(limit).all()

peer_group = CRUDPeerGroup(PeerGroup)
