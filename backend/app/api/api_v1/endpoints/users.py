
from typing import Any, List
from fastapi import APIRouter, Body, Depends, HTTPException
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.api import deps

router = APIRouter()

@router.post("/", response_model=schemas.User)
def create_user(
    *,
    db: Session = Depends(deps.get_db),
    user_in: schemas.UserCreate,
) -> Any:
    """
    Create new user.
    """
    try:
        user = crud.crud_user.get_user_by_email(db, email=user_in.email)
        if user:
            raise HTTPException(
                status_code=400,
                detail="The user with this username already exists in the system.",
            )
        user = crud.crud_user.create_user(db, user=user_in)
        from app.schemas.user_settings import UserSettingsCreate
        settings_in = UserSettingsCreate()
        crud.crud_user_settings.create_with_user(db, obj_in=settings_in, user_id=user.id)
        return user
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/me", response_model=schemas.User)
def read_user_me(
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    """
    Get current user.
    """
    return current_user

@router.put("/me", response_model=schemas.User)
def update_user_me(
    *,
    db: Session = Depends(deps.get_db),
    user_in: schemas.UserUpdate,
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    """
    Update current user's profile (excluding password changes).
    """
    # Prevent email changes from causing conflicts silently; allow updating full_name, timezone, institution
    update_data = user_in.dict(exclude_unset=True)
    if "password" in update_data:
        update_data.pop("password")
    db_user = crud.crud_user.get_user(db, user_id=current_user.id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    user = crud.crud_user.update(db, db_obj=db_user, obj_in=update_data)
    return user

@router.delete("/me", response_model=schemas.User)
def delete_user_me(
    *,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    """
    Delete current user's account.
    """
    db_user = crud.crud_user.get_user(db, user_id=current_user.id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    deleted = crud.crud_user.remove(db, id=db_user.id)
    return deleted

@router.get("/me/settings", response_model=schemas.UserSettings)
def read_user_settings(
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    """
    Get current user settings.
    """
    settings = crud.crud_user_settings.get_by_user_id(db, user_id=current_user.id)
    if not settings:
        # Create default settings if they don't exist
        settings_in = schemas.UserSettingsCreate(
            max_daily_study_hours=8,
            preferred_study_blocks={"morning": True, "afternoon": True, "evening": False},
            notification_preferences={"email": True, "push": True},
            privacy_preferences={"share_data": False},
            wellbeing_settings={"checkin_frequency": "daily"}
        )
        settings = crud.crud_user_settings.create_with_user(db, obj_in=settings_in, user_id=current_user.id)
    return settings

@router.put("/me/settings", response_model=schemas.UserSettings)
def update_user_settings(
    *,
    db: Session = Depends(deps.get_db),
    settings_in: schemas.UserSettingsUpdate,
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    """
    Update current user settings.
    """
    settings = crud.crud_user_settings.get_by_user_id(db, user_id=current_user.id)
    if not settings:
        raise HTTPException(status_code=404, detail="Settings not found")
    settings = crud.crud_user_settings.update_settings(db, db_obj=settings, obj_in=settings_in)
    return settings
