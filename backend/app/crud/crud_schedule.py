
from typing import List
from sqlalchemy.orm import Session
from app.models.schedule import ScheduleBlock
from app.schemas.schedule import ScheduleBlockCreate, ScheduleBlockUpdate

def get_schedule_blocks(db: Session, user_id: int, skip: int = 0, limit: int = 100):
    return db.query(ScheduleBlock).filter(ScheduleBlock.user_id == user_id).offset(skip).limit(limit).all()

def create_schedule_block(db: Session, block: ScheduleBlockCreate, user_id: int):
    db_block = ScheduleBlock(**block.dict(), user_id=user_id)
    db.add(db_block)
    db.commit()
    db.refresh(db_block)
    return db_block

def get_schedule_block(db: Session, block_id: int, user_id: int):
    return db.query(ScheduleBlock).filter(ScheduleBlock.id == block_id, ScheduleBlock.user_id == user_id).first()

def delete_schedule_block(db: Session, db_obj: ScheduleBlock):
    db.delete(db_obj)
    db.commit()
    return db_obj
