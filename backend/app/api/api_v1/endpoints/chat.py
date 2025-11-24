
from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import crud, models, schemas
from datetime import datetime, timedelta
from app.api import deps

router = APIRouter()

@router.post("/ask")
async def ask_assignwell(
    *,
    db: Session = Depends(deps.get_db),
    message: schemas.ChatMessage,
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    """
    Chat with AssignWell AI (Therapist-style).
    """
    # Use AIService to generate response
    from app.services.ai_service import ai_service

    # Build context solely from mood signals
    moods = crud.mood_checkin.get_multi_by_owner(db=db, owner_id=current_user.id, limit=5)
    mood_history = [
        {
            "mood_valence": getattr(m, "mood_valence", None),
            "energy_level": getattr(m, "energy_level", None),
            "stress_level": getattr(m, "stress_level", None),
            "sleep_hours_last_night": getattr(m, "sleep_hours_last_night", None),
            "created_at": getattr(m, "created_at", None).isoformat() if getattr(m, "created_at", None) else None,
        }
        for m in moods
    ]

    context = {
        "user_name": current_user.full_name,
        "mood_history": mood_history,
    }

    # Ensure a chat session
    session_id = getattr(message, "context", {}) and getattr(message.context, "get", lambda *_: None)("session_id")
    session = None
    try:
        if isinstance(session_id, int):
            s = crud.chat_session.get(db=db, id=session_id)
            if s and s.user_id == current_user.id:
                session = s
        if session is None:
            session = crud.chat_session.get_latest_by_user(db=db, user_id=current_user.id)
        if session is None:
            session = crud.chat_session.create_with_user(db=db, obj_in=schemas.ChatSessionCreate(), user_id=current_user.id)
        try:
            crud.chat_message.create(db=db, obj_in=schemas.ChatMessageCreate(session_id=session.id, role="user", content=message.content))
        except Exception:
            pass
    except Exception:
        session = None

    # Try to respond quickly; fallback to quick tip on timeout/errors
    import asyncio
    try:
        response_content = await asyncio.wait_for(
            ai_service.chat_response(message.content, context),
            timeout=1.5
        )
    except asyncio.TimeoutError:
        response_content = ai_service.quick_tip(context)
    except Exception:
        response_content = ai_service.quick_tip(context)

    # Persist assistant message (best-effort)
    saved_id = None
    try:
        if session:
            saved = crud.chat_message.create(db=db, obj_in=schemas.ChatMessageCreate(session_id=session.id, role="assistant", content=response_content))
            saved_id = saved.id
    except Exception:
        pass

    return {"role": "assistant", "content": response_content, "session_id": (session.id if session else None), "message_id": saved_id}

@router.get("/sessions", response_model=List[schemas.ChatSession])
def read_chat_sessions(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    """
    Retrieve chat sessions.
    """
    sessions = crud.chat_session.get_multi_by_user(db=db, user_id=current_user.id, skip=skip, limit=limit)
    return sessions

@router.get("/session/current", response_model=schemas.ChatSessionDetail)
def read_current_session(
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    session = crud.chat_session.get_latest_by_user(db=db, user_id=current_user.id)
    if not session:
        session = crud.chat_session.create_with_user(db=db, obj_in=schemas.ChatSessionCreate(), user_id=current_user.id)
    messages = crud.chat_message.get_by_session(db=db, session_id=session.id, skip=0, limit=500)
    # Pydantic v2 model_validate
    sess = schemas.ChatSession.model_validate(session)
    msgs = [schemas.ChatMessageOut.model_validate(m) for m in messages]
    return schemas.ChatSessionDetail(**sess.model_dump(), messages=msgs)

@router.post("/session/new", response_model=schemas.ChatSession)
def create_new_session(
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    """
    Explicitly start a new chat session for the current user.
    """
    session = crud.chat_session.create_with_user(db=db, obj_in=schemas.ChatSessionCreate(), user_id=current_user.id)
    return session

@router.post("/session/end", response_model=schemas.ChatSession)
def end_current_session(
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    """
    Mark the latest chat session as ended (best-effort).
    """
    session = crud.chat_session.get_latest_by_user(db=db, user_id=current_user.id)
    if not session:
        # Nothing to end; create and end immediately
        session = crud.chat_session.create_with_user(db=db, obj_in=schemas.ChatSessionCreate(), user_id=current_user.id)
    try:
        from datetime import datetime
        update = schemas.ChatSessionUpdate(ended_at=datetime.utcnow())
        session = crud.chat_session.update(db=db, db_obj=session, obj_in=update)
    except Exception:
        pass
    return session
