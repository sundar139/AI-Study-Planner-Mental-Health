from typing import List, Optional
from sqlalchemy.orm import Session
from datetime import datetime
from app.models.suggestion import WellbeingSuggestion
from app.schemas.suggestion import WellbeingSuggestionCreate

def create_many(db: Session, user_id: int, items: List[WellbeingSuggestionCreate], mood_checkin_id: Optional[int] = None) -> List[WellbeingSuggestion]:
    created: List[WellbeingSuggestion] = []
    for item in items:
        obj = WellbeingSuggestion(
            user_id=user_id,
            mood_checkin_id=mood_checkin_id,
            title=item.title,
            description=item.description,
            category=item.category,
            expires_at=item.expires_at,
        )
        db.add(obj)
        created.append(obj)
    db.commit()
    for obj in created:
        db.refresh(obj)
    return created

def latest_for_user(db: Session, user_id: int, since_minutes: int = 1440) -> List[WellbeingSuggestion]:
    threshold = datetime.utcnow()
    return db.query(WellbeingSuggestion).filter(WellbeingSuggestion.user_id == user_id).order_by(WellbeingSuggestion.created_at.desc()).limit(10).all()