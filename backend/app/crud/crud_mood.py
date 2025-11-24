
from typing import List

from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.mood import MoodCheckin
from app.schemas.mood import MoodCheckinCreate, MoodCheckinUpdate

class CRUDMoodCheckin(CRUDBase[MoodCheckin, MoodCheckinCreate, MoodCheckinUpdate]):
    def create_with_owner(
        self, db: Session, *, obj_in: MoodCheckinCreate, owner_id: int
    ) -> MoodCheckin:
        obj_in_data = jsonable_encoder(obj_in)
        db_obj = MoodCheckin(**obj_in_data, user_id=owner_id)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def get_multi_by_owner(
        self, db: Session, *, owner_id: int, skip: int = 0, limit: int = 100
    ) -> List[MoodCheckin]:
        return (
            db.query(self.model)
            .filter(MoodCheckin.user_id == owner_id)
            .offset(skip)
            .limit(limit)
            .all()
        )

mood_checkin = CRUDMoodCheckin(MoodCheckin)
