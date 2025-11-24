
from typing import List
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session
from app.crud.base import CRUDBase
from app.models.intervention import Intervention, InterventionSession
from app.schemas.intervention import InterventionCreate, InterventionUpdate, InterventionSessionCreate, InterventionSessionUpdate

class CRUDIntervention(CRUDBase[Intervention, InterventionCreate, InterventionUpdate]):
    pass

class CRUDInterventionSession(CRUDBase[InterventionSession, InterventionSessionCreate, InterventionSessionUpdate]):
    def create_with_user(
        self, db: Session, *, obj_in: InterventionSessionCreate, user_id: int
    ) -> InterventionSession:
        obj_in_data = jsonable_encoder(obj_in)
        db_obj = InterventionSession(**obj_in_data, user_id=user_id)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def get_multi_by_user(
        self, db: Session, *, user_id: int, skip: int = 0, limit: int = 100
    ) -> List[InterventionSession]:
        return (
            db.query(self.model)
            .filter(InterventionSession.user_id == user_id)
            .offset(skip)
            .limit(limit)
            .all()
        )

intervention = CRUDIntervention(Intervention)
intervention_session = CRUDInterventionSession(InterventionSession)
