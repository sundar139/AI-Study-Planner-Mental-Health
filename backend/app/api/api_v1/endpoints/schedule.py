
from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import models, schemas
from app.crud import crud_schedule as schedule_crud
from app.api import deps

router = APIRouter()

@router.get("/", response_model=List[schemas.ScheduleBlock])
def read_schedule(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    schedule = schedule_crud.get_schedule_blocks(db, user_id=current_user.id, skip=skip, limit=limit)
    return schedule

@router.post("/", response_model=schemas.ScheduleBlock)
def create_schedule_block(
    *,
    db: Session = Depends(deps.get_db),
    block_in: schemas.ScheduleBlockCreate,
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    block = schedule_crud.create_schedule_block(db, block=block_in, user_id=current_user.id)
    return block

@router.delete("/{id}", response_model=schemas.ScheduleBlock)
def delete_schedule_block(
    *,
    db: Session = Depends(deps.get_db),
    id: int,
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    block = schedule_crud.get_schedule_block(db, block_id=id, user_id=current_user.id)
    if not block:
        raise HTTPException(status_code=404, detail="Schedule block not found")
    block = schedule_crud.delete_schedule_block(db, db_obj=block)
    return block
