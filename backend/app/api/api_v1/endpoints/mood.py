
from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import crud, models, schemas
from app.crud import crud_suggestion
from app.api import deps

router = APIRouter()

@router.get("/", response_model=List[schemas.MoodCheckin])
def read_mood_checkins(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    """
    Retrieve mood check-ins.
    """
    # Assuming crud.mood_checkin exists or we use a generic one
    mood_checkins = crud.mood_checkin.get_multi_by_owner(
        db=db, owner_id=current_user.id, skip=skip, limit=limit
    )
    return mood_checkins

@router.post("/", response_model=schemas.MoodCheckin)
async def create_mood_checkin(
    *,
    db: Session = Depends(deps.get_db),
    mood_in: schemas.MoodCheckinCreate,
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    """
    Create new mood check-in.
    """
    mood_checkin = crud.mood_checkin.create_with_owner(db=db, obj_in=mood_in, owner_id=current_user.id)
    from app.services.ai_service import ai_service
    recent = crud.mood_checkin.get_multi_by_owner(db=db, owner_id=current_user.id, limit=7)
    history_dicts = [
        {
            "mood_valence": m.mood_valence,
            "energy_level": m.energy_level,
            "stress_level": m.stress_level,
            "sleep_hours_last_night": m.sleep_hours_last_night,
            "additional_metrics": m.additional_metrics,
            "created_at": m.created_at,
        }
        for m in recent
    ]
    sleep_hrs_7 = float(sum([(m.sleep_hours_last_night or 0.0) for m in recent]))
    activity = {"sleep_hrs_7": sleep_hrs_7, "checkins_7": len(recent)}
    items = await ai_service.wellbeing_suggestions(history_dicts, activity)
    create_items = [schemas.WellbeingSuggestionCreate(title=i["title"], description=i["description"], category=i["category"]) for i in items]
    crud_suggestion.create_many(db, user_id=current_user.id, items=create_items, mood_checkin_id=mood_checkin.id)
    return mood_checkin

@router.post("/analyze", response_model=schemas.MoodInsight)
async def analyze_mood(
    *,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    """
    Analyze recent mood logs and provide insights.
    """
    # Use AIService to analyze mood
    from app.services.ai_service import ai_service
    
    # Retrieve recent mood logs
    mood_history = crud.mood_checkin.get_multi_by_owner(
        db=db, owner_id=current_user.id, limit=5
    )
    # Convert to dict for service
    history_dicts = [
        {
            "mood_valence": m.mood_valence,
            "energy_level": m.energy_level,
            "stress_level": m.stress_level,
            "created_at": m.created_at
        } for m in mood_history
    ]
    
    analysis = await ai_service.analyze_mood(history_dicts)
    return schemas.MoodInsight(**analysis)

@router.post("/infer-metrics")
async def infer_metrics(
    *,
    db: Session = Depends(deps.get_db),
    mood_in: schemas.MoodCheckinCreate,
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    from app.services.ai_service import ai_service
    
    payload = mood_in.dict()
    result = await ai_service.infer_mood_metrics(payload)
    return result

@router.get("/suggestions", response_model=List[schemas.WellbeingSuggestion])
async def wellbeing_suggestions(
    *,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    from app.services.ai_service import ai_service
    
    stored = crud_suggestion.latest_for_user(db, user_id=current_user.id)
    if stored:
        return [schemas.WellbeingSuggestion.from_orm(s) for s in stored]
    mood_logs = crud.mood_checkin.get_multi_by_owner(db=db, owner_id=current_user.id, limit=7)
    history_dicts = [
        {
            "mood_valence": m.mood_valence,
            "energy_level": m.energy_level,
            "stress_level": m.stress_level,
            "sleep_hours_last_night": m.sleep_hours_last_night,
            "additional_metrics": m.additional_metrics,
            "created_at": m.created_at,
        }
        for m in mood_logs
    ]
    sleep_hrs_7 = float(sum([(m.sleep_hours_last_night or 0.0) for m in mood_logs]))
    activity = {"sleep_hrs_7": sleep_hrs_7, "checkins_7": len(mood_logs)}
    items = await ai_service.wellbeing_suggestions(history_dicts, activity)
    create_items = [schemas.WellbeingSuggestionCreate(title=i["title"], description=i["description"], category=i["category"]) for i in items]
    created = crud_suggestion.create_many(db, user_id=current_user.id, items=create_items)
    return [schemas.WellbeingSuggestion.from_orm(s) for s in created]
