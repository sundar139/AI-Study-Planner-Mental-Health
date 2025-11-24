
from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import models, schemas
from app.api import deps
from app.crud import crud_assignment as asg

router = APIRouter()

@router.get("/", response_model=List[schemas.Course])
def read_courses(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    courses = asg.get_courses(db, user_id=current_user.id, skip=skip, limit=limit)
    return courses

@router.post("/", response_model=schemas.Course)
def create_course(
    *,
    db: Session = Depends(deps.get_db),
    course_in: schemas.CourseCreate,
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    course = asg.create_course(db, course=course_in, user_id=current_user.id)
    return course
