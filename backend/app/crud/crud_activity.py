from typing import List
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session
from app.crud.base import CRUDBase
from app.models.activity import ActivitySession
from app.schemas.activity import ActivitySessionCreate, ActivitySessionUpdate

class CRUDActivitySession(CRUDBase[ActivitySession, ActivitySessionCreate, ActivitySessionUpdate]):
    def create_with_user(self, db: Session, *, obj_in: ActivitySessionCreate, user_id: int) -> ActivitySession:
        obj_in_data = jsonable_encoder(obj_in)
        db_obj = ActivitySession(**obj_in_data, user_id=user_id)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def get_multi_by_user(self, db: Session, *, user_id: int, skip: int = 0, limit: int = 100) -> List[ActivitySession]:
        return (
            db.query(self.model)
            .filter(ActivitySession.user_id == user_id)
            .order_by(self.model.started_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

activity_session = CRUDActivitySession(ActivitySession)