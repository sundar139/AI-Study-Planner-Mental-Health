from typing import List
from sqlalchemy.orm import Session
from app.models.goal import Goal, GoalSession
from app.schemas.goal import GoalCreate, GoalUpdate, GoalSessionCreate

def get_goals(db: Session, user_id: int, skip: int = 0, limit: int = 100):
    return db.query(Goal).filter(Goal.user_id == user_id).offset(skip).limit(limit).all()

def create_goal(db: Session, goal: GoalCreate, user_id: int):
    db_goal = Goal(**goal.dict(), user_id=user_id)
    db.add(db_goal)
    db.commit()
    db.refresh(db_goal)
    return db_goal

def get_goal(db: Session, goal_id: int, user_id: int):
    return db.query(Goal).filter(Goal.id == goal_id, Goal.user_id == user_id).first()

def update_goal(db: Session, db_obj: Goal, obj_in: GoalUpdate):
    for field, value in obj_in.dict(exclude_unset=True).items():
        setattr(db_obj, field, value)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def delete_goal(db: Session, db_obj: Goal):
    db.delete(db_obj)
    db.commit()
    return db_obj

# GoalSession CRUD
def create_goal_session(db: Session, session: GoalSessionCreate, goal_id: int):
    db_session = GoalSession(**session.dict(), goal_id=goal_id)
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return db_session

def get_goal_sessions(db: Session, goal_id: int, user_id: int):
    goal = get_goal(db, goal_id=goal_id, user_id=user_id)
    if not goal:
        return []
    return db.query(GoalSession).filter(GoalSession.goal_id == goal_id).order_by(GoalSession.start_time.desc()).all()

