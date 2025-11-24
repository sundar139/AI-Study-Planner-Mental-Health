from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import models, schemas
from app.crud.crud_activity import activity_session
from app.api import deps

router = APIRouter()

@router.get("/", response_model=List[schemas.ActivitySession])
def read_activity_sessions(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    sessions = activity_session.get_multi_by_user(db=db, user_id=current_user.id, skip=skip, limit=limit)
    return sessions

@router.post("/", response_model=schemas.ActivitySession)
def start_activity_session(
    *,
    db: Session = Depends(deps.get_db),
    session_in: schemas.ActivitySessionCreate,
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    session = activity_session.create_with_user(db=db, obj_in=session_in, user_id=current_user.id)
    return session

@router.put("/{id}", response_model=schemas.ActivitySession)
def update_activity_session(
    *,
    db: Session = Depends(deps.get_db),
    id: int,
    session_in: schemas.ActivitySessionUpdate,
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    session = activity_session.get(db=db, id=id)
    if not session:
        raise HTTPException(status_code=404, detail="Activity session not found")
    if session.user_id != current_user.id:
        raise HTTPException(status_code=400, detail="Not enough permissions")
    session = activity_session.update(db=db, db_obj=session, obj_in=session_in)
    return session