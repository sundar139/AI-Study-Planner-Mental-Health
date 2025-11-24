from typing import Optional
from sqlalchemy.orm import Session
from app.crud.base import CRUDBase
from app.models.user_settings import UserSettings
from app.schemas.user_settings import UserSettingsCreate, UserSettingsUpdate

class CRUDUserSettings(CRUDBase[UserSettings, UserSettingsCreate, UserSettingsUpdate]):
    def get_by_user_id(self, db: Session, *, user_id: int) -> Optional[UserSettings]:
        return db.query(UserSettings).filter(UserSettings.user_id == user_id).first()

    def create_with_user(
        self, db: Session, *, obj_in: UserSettingsCreate, user_id: int
    ) -> UserSettings:
        db_obj = UserSettings(
            **obj_in.dict(),
            user_id=user_id
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def update_settings(
        self, db: Session, *, db_obj: UserSettings, obj_in: UserSettingsUpdate
    ) -> UserSettings:
        if isinstance(obj_in, dict):
            update_data = obj_in
        else:
            update_data = obj_in.dict(exclude_unset=True)
        return super().update(db, db_obj=db_obj, obj_in=update_data)

user_settings = CRUDUserSettings(UserSettings)
