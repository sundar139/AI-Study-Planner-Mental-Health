
from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import crud, models, schemas
from app.api import deps

router = APIRouter()

@router.get("/", response_model=List[schemas.Intervention])
def read_interventions(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    """
    Retrieve interventions.
    """
    interventions = crud.intervention.get_multi(db, skip=skip, limit=limit)
    return interventions

@router.post("/session/start", response_model=schemas.InterventionSession)
def start_intervention_session(
    *,
    db: Session = Depends(deps.get_db),
    session_in: schemas.InterventionSessionCreate,
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    """
    Start an intervention session.
    """
    session = crud.intervention_session.create_with_user(db=db, obj_in=session_in, user_id=current_user.id)
    return session

@router.post("/session/{id}/complete", response_model=schemas.InterventionSession)
def complete_intervention_session(
    *,
    db: Session = Depends(deps.get_db),
    id: int,
    session_in: schemas.InterventionSessionUpdate,
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    """
    Complete an intervention session.
    """
    session = crud.intervention_session.get(db=db, id=id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.user_id != current_user.id:
        raise HTTPException(status_code=400, detail="Not enough permissions")
    session = crud.intervention_session.update(db=db, db_obj=session, obj_in=session_in)
    return session
