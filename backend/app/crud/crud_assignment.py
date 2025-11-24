
from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.assignment import Assignment, Course, Subtask
from app.schemas.assignment import AssignmentCreate, AssignmentUpdate, CourseCreate, CourseUpdate, SubtaskCreate, SubtaskUpdate

# Course CRUD
def get_courses(db: Session, user_id: int, skip: int = 0, limit: int = 100):
    return db.query(Course).filter(Course.user_id == user_id).offset(skip).limit(limit).all()

def create_course(db: Session, course: CourseCreate, user_id: int):
    db_course = Course(**course.dict(), user_id=user_id)
    db.add(db_course)
    db.commit()
    db.refresh(db_course)
    return db_course

def get_course(db: Session, course_id: int, user_id: int):
    return db.query(Course).filter(Course.id == course_id, Course.user_id == user_id).first()

# Assignment CRUD
def get_assignments(db: Session, user_id: int, skip: int = 0, limit: int = 100):
    return db.query(Assignment).filter(Assignment.user_id == user_id).offset(skip).limit(limit).all()

def create_assignment(db: Session, assignment: AssignmentCreate, user_id: int):
    db_assignment = Assignment(**assignment.dict(), user_id=user_id)
    db.add(db_assignment)
    db.commit()
    db.refresh(db_assignment)
    return db_assignment

def get_assignment(db: Session, assignment_id: int, user_id: int):
    return db.query(Assignment).filter(Assignment.id == assignment_id, Assignment.user_id == user_id).first()

def update_assignment(db: Session, db_obj: Assignment, obj_in: AssignmentUpdate):
    for field, value in obj_in.dict(exclude_unset=True).items():
        setattr(db_obj, field, value)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def delete_assignment(db: Session, db_obj: Assignment):
    db.delete(db_obj)
    db.commit()
    return db_obj

# Subtask CRUD
def create_subtask(db: Session, subtask: SubtaskCreate, assignment_id: int):
    db_subtask = Subtask(**subtask.dict(), assignment_id=assignment_id)
    db.add(db_subtask)
    db.commit()
    db.refresh(db_subtask)
    return db_subtask
# CRUDAssignment class to match usage in ai.py
from app.crud.base import CRUDBase

class CRUDAssignment(CRUDBase[Assignment, AssignmentCreate, AssignmentUpdate]):
    def get_multi_by_owner(
        self, db: Session, *, owner_id: int, skip: int = 0, limit: int = 100, status: Optional[str] = None
    ) -> List[Assignment]:
        query = db.query(self.model).filter(Assignment.user_id == owner_id)
        if status:
            query = query.filter(Assignment.status == status)
        return query.offset(skip).limit(limit).all()

assignment = CRUDAssignment(Assignment)
