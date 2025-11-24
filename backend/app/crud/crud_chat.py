
from typing import List
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session
from app.crud.base import CRUDBase
from app.models.chat import ChatSession, ChatMessage
from app.schemas.chat import ChatSessionCreate, ChatSessionUpdate, ChatMessageCreate

class CRUDChatSession(CRUDBase[ChatSession, ChatSessionCreate, ChatSessionUpdate]):
    def create_with_user(
        self, db: Session, *, obj_in: ChatSessionCreate, user_id: int
    ) -> ChatSession:
        obj_in_data = jsonable_encoder(obj_in)
        db_obj = ChatSession(**obj_in_data, user_id=user_id)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def get_multi_by_user(
        self, db: Session, *, user_id: int, skip: int = 0, limit: int = 100
    ) -> List[ChatSession]:
        return (
            db.query(self.model)
            .filter(ChatSession.user_id == user_id)
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_latest_by_user(self, db: Session, *, user_id: int) -> ChatSession | None:
        return (
            db.query(self.model)
            .filter(ChatSession.user_id == user_id)
            .order_by(ChatSession.started_at.desc())
            .first()
        )

chat_session = CRUDChatSession(ChatSession)


class CRUDChatMessage(CRUDBase[ChatMessage, ChatMessageCreate, ChatMessageCreate]):
    def get_by_session(self, db: Session, *, session_id: int, skip: int = 0, limit: int = 100) -> list[ChatMessage]:
        return (
            db.query(self.model)
            .filter(ChatMessage.session_id == session_id)
            .order_by(ChatMessage.created_at.asc())
            .offset(skip)
            .limit(limit)
            .all()
        )

chat_message = CRUDChatMessage(ChatMessage)
