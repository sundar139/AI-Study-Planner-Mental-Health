from typing import Any, List, Tuple
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import and_
from app import models, schemas
from app.crud import crud_goal, crud_schedule
from app.crud import mood_checkin as crud_mood_checkin
from app.api import deps
from app.models.schedule import BlockType, BlockStatus, BlockSource, ScheduleBlock
from app.services.ai_service import ai_service

router = APIRouter()

@router.get("/", response_model=List[schemas.GoalOut])
def read_goals(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    goals = crud_goal.get_goals(db, user_id=current_user.id, skip=skip, limit=limit)
    return goals

@router.post("/", response_model=schemas.GoalOut)
def create_goal(
    *,
    db: Session = Depends(deps.get_db),
    goal_in: schemas.GoalCreate,
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    goal = crud_goal.create_goal(db, goal=goal_in, user_id=current_user.id)
    return goal

@router.patch("/{goal_id}", response_model=schemas.GoalOut)
def update_goal(
    *,
    db: Session = Depends(deps.get_db),
    goal_id: int,
    goal_in: schemas.GoalUpdate,
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    goal = crud_goal.get_goal(db, goal_id=goal_id, user_id=current_user.id)
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    goal = crud_goal.update_goal(db, db_obj=goal, obj_in=goal_in)
    return goal

@router.delete("/{goal_id}", response_model=schemas.GoalOut)
def delete_goal(
    *,
    db: Session = Depends(deps.get_db),
    goal_id: int,
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    goal = crud_goal.get_goal(db, goal_id=goal_id, user_id=current_user.id)
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    goal = crud_goal.delete_goal(db, db_obj=goal)
    return goal

@router.get("/{goal_id}/sessions", response_model=List[schemas.GoalSessionOut])
def get_goal_sessions(
    *,
    db: Session = Depends(deps.get_db),
    goal_id: int,
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    """
    Get all sessions for a specific goal.
    """
    goal = crud_goal.get_goal(db, goal_id=goal_id, user_id=current_user.id)
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    sessions = crud_goal.get_goal_sessions(db, goal_id=goal_id, user_id=current_user.id)
    return sessions

@router.post("/{goal_id}/schedule-session", response_model=schemas.GoalSessionScheduleResponse)
def schedule_goal_session(
    *,
    db: Session = Depends(deps.get_db),
    goal_id: int,
    session_in: schemas.GoalSessionCreate,
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    """
    Schedule a goal session and add it to the user's calendar.
    Creates both a GoalSession record and a ScheduleBlock entry.
    """
    # Verify goal exists and belongs to current user
    goal = crud_goal.get_goal(db, goal_id=goal_id, user_id=current_user.id)
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    # Create GoalSession
    goal_session = crud_goal.create_goal_session(
        db, 
        session=session_in, 
        goal_id=goal_id
    )
    
    # Create ScheduleBlock entry for the calendar
    schedule_block_data = schemas.ScheduleBlockCreate(
        start_at=session_in.start_time,
        end_at=session_in.end_time,
        title=goal.name,
        type=BlockType.EVENT,
        status=BlockStatus.PLANNED,
        source=BlockSource.MANUAL
    )
    schedule_block_db = crud_schedule.create_schedule_block(
        db,
        block=schedule_block_data,
        user_id=current_user.id
    )
    
    # Convert SQLAlchemy models to Pydantic schemas (Pydantic v2)
    goal_session_schema = schemas.GoalSessionOut.model_validate(goal_session)
    schedule_block_schema = schemas.ScheduleBlock.model_validate(schedule_block_db)
    
    return schemas.GoalSessionScheduleResponse(
        goal_session=goal_session_schema,
        schedule_block=schedule_block_schema
    )

def _compute_candidate_slots(
    target_date: datetime.date,
    duration_minutes: int,
    existing_blocks: List[ScheduleBlock],
    preferred_time_window: str = None
) -> List[Tuple[datetime, datetime]]:
    """
    Rule-based logic to find candidate time slots.
    Returns a list of (start_datetime, end_datetime) tuples.
    """
    # Define time windows to check (morning, afternoon, evening)
    time_windows = [
        (9, 12),   # Morning: 9 AM - 12 PM
        (13, 17),  # Afternoon: 1 PM - 5 PM
        (18, 21),  # Evening: 6 PM - 9 PM
    ]
    
    # Filter time windows by preference if specified
    if preferred_time_window:
        pref_lower = preferred_time_window.lower()
        if "morning" in pref_lower:
            time_windows = [(9, 12)]
        elif "afternoon" in pref_lower:
            time_windows = [(13, 17)]
        elif "evening" in pref_lower:
            time_windows = [(18, 21)]
    
    candidate_slots = []
    
    def overlaps_with_existing(start: datetime, end: datetime) -> bool:
        """Check if a time slot overlaps with any existing block"""
        for block in existing_blocks:
            block_start = block.start_at
            block_end = block.end_at
            # Check for overlap: start < block_end and end > block_start
            if start < block_end and end > block_start:
                return True
        return False
    
    # Try to find available slots in each time window
    for window_start_hour, window_end_hour in time_windows:
        window_start = datetime.combine(target_date, datetime.min.time()).replace(
            hour=window_start_hour, minute=0, second=0, microsecond=0, tzinfo=timezone.utc
        )
        window_end = datetime.combine(target_date, datetime.min.time()).replace(
            hour=window_end_hour, minute=0, second=0, microsecond=0, tzinfo=timezone.utc
        )
        
        # Try slots starting every 30 minutes within this window
        current_time = window_start
        while current_time + timedelta(minutes=duration_minutes) <= window_end:
            slot_start = current_time
            slot_end = slot_start + timedelta(minutes=duration_minutes)
            
            if not overlaps_with_existing(slot_start, slot_end):
                candidate_slots.append((slot_start, slot_end))
                
                # Limit total candidates to avoid too many LLM calls
                if len(candidate_slots) >= 10:
                    break
            
            current_time += timedelta(minutes=30)
        
        if len(candidate_slots) >= 10:
            break
    
    return candidate_slots


@router.post("/{goal_id}/suggest-times", response_model=schemas.SuggestTimesResponse)
async def suggest_times(
    *,
    db: Session = Depends(deps.get_db),
    goal_id: int,
    request: schemas.SuggestTimesRequest,
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    """
    AI-assisted time slot suggestion for a goal session on a given date.
    Uses rule-based logic to find candidate slots, then LLM to rank and generate user-friendly reasons.
    Returns either Case A (suggestions) or Case B (no good slots).
    """
    # Verify goal exists and belongs to current user
    goal = crud_goal.get_goal(db, goal_id=goal_id, user_id=current_user.id)
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    # Parse the date
    try:
        target_date = datetime.strptime(request.date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    # Use provided duration or goal's default duration
    duration_minutes = request.duration_minutes if request.duration_minutes else goal.duration_minutes
    
    # Get all schedule blocks for that date (timezone-aware)
    start_of_day = datetime.combine(target_date, datetime.min.time()).replace(tzinfo=timezone.utc)
    end_of_day = start_of_day + timedelta(days=1)
    
    # Query schedule blocks for the day
    existing_blocks = db.query(ScheduleBlock).filter(
        and_(
            ScheduleBlock.user_id == current_user.id,
            ScheduleBlock.start_at >= start_of_day,
            ScheduleBlock.start_at < end_of_day,
            ScheduleBlock.status != BlockStatus.CANCELED
        )
    ).order_by(ScheduleBlock.start_at).all()
    
    # Step 1: Compute candidate slots using rule-based logic
    candidate_slots = _compute_candidate_slots(
        target_date=target_date,
        duration_minutes=duration_minutes,
        existing_blocks=existing_blocks,
        preferred_time_window=goal.preferred_time_window
    )
    
    # Step 2: If we have candidate slots, use AI to rank and generate reasons
    if candidate_slots:
        try:
            # Prepare candidate slots as dicts for AI service
            candidate_slots_dict = [
                {
                    "start": start.isoformat(),
                    "end": end.isoformat()
                }
                for start, end in candidate_slots
            ]
            
            # Prepare existing blocks summary for AI
            existing_blocks_dict = [
                {
                    "start": block.start_at.isoformat(),
                    "end": block.end_at.isoformat(),
                    "title": block.title or "Event",
                    "type": block.type.value if hasattr(block.type, 'value') else str(block.type)
                }
                for block in existing_blocks
            ]
            
            # Call AI service to rank slots
            ranked_slots = await ai_service.rank_time_slots(
                goal_name=goal.name,
                duration_minutes=duration_minutes,
                preferred_time_window=goal.preferred_time_window,
                target_date=request.date,
                existing_blocks=existing_blocks_dict,
                candidate_slots=candidate_slots_dict
            )
            
            # Convert AI results to TimeSuggestion objects
            # Create a map from ISO string to (start_dt, end_dt) tuple for easy lookup
            candidate_slots_map = {
                start.isoformat(): (start, end)
                for start, end in candidate_slots
            }
            
            ai_suggestions = []
            for slot in ranked_slots[:3]:  # Take top 3
                try:
                    slot_start_str = slot["start"]
                    # Find matching candidate slot to get exact datetime objects
                    # This ensures we use the same timezone-aware datetime objects from our computation
                    if slot_start_str in candidate_slots_map:
                        start_dt, end_dt = candidate_slots_map[slot_start_str]
                        ai_suggestions.append(schemas.TimeSuggestion(
                            start_time=start_dt,
                            end_time=end_dt,
                            reason=slot.get("reason", "Good time slot")
                        ))
                    else:
                        # Fallback: try to parse ISO string directly if AI returned a slightly different format
                        # Normalize ISO format for parsing
                        start_str = slot_start_str
                        if start_str.endswith("Z"):
                            start_str = start_str[:-1] + "+00:00"
                        elif "+" not in start_str and "-" in start_str:
                            start_str = start_str + "+00:00"
                        
                        end_str = slot.get("end", "")
                        if end_str:
                            if end_str.endswith("Z"):
                                end_str = end_str[:-1] + "+00:00"
                            elif "+" not in end_str and "-" in end_str:
                                end_str = end_str + "+00:00"
                        else:
                            # Calculate end from start + duration if not provided
                            start_dt = datetime.fromisoformat(start_str)
                            end_dt = start_dt + timedelta(minutes=duration_minutes)
                            ai_suggestions.append(schemas.TimeSuggestion(
                                start_time=start_dt,
                                end_time=end_dt,
                                reason=slot.get("reason", "Good time slot")
                            ))
                            continue
                        
                        start_dt = datetime.fromisoformat(start_str)
                        end_dt = datetime.fromisoformat(end_str)
                        ai_suggestions.append(schemas.TimeSuggestion(
                            start_time=start_dt,
                            end_time=end_dt,
                            reason=slot.get("reason", "Good time slot")
                        ))
                except (ValueError, KeyError, AttributeError) as e:
                    print(f"Error parsing AI slot result: {e}, slot: {slot}")
                    continue
            
            if ai_suggestions:
                return schemas.SuggestTimesResponse(
                    case="A",
                    suggestions=ai_suggestions
                )
            
        except Exception as e:
            print(f"Error in AI ranking, falling back to rule-based: {e}")
            # Fall through to rule-based suggestions
        
        # Fallback: Use first 2-3 candidate slots with rule-based reasons
        fallback_suggestions = []
        for start, end in candidate_slots[:3]:
            hour = start.hour
            if hour < 12:
                reason = "Morning slot - fresh start"
            elif hour < 17:
                reason = "Afternoon slot - good energy"
            else:
                reason = "Evening slot - wrap up the day"
            
            fallback_suggestions.append(schemas.TimeSuggestion(
                start_time=start,
                end_time=end,
                reason=reason
            ))
        
        return schemas.SuggestTimesResponse(
            case="A",
            suggestions=fallback_suggestions
        )
    
    # Case B: No good slots found
    alternatives = [
        {"action": "try_shorter", "label": "Try shorter duration"},
        {"action": "try_tomorrow", "label": "Try tomorrow instead"},
        {"action": "schedule_anyway", "label": "Schedule anyway"}
    ]
    
    # Optionally use AI to generate a more empathetic message
    message = f"Your calendar is quite full on {target_date.strftime('%B %d, %Y')}. Consider these alternatives:"
    try:
        ai_message = await ai_service.generate_busy_day_message(target_date.strftime('%B %d, %Y'))
        if ai_message:
            message = ai_message
    except Exception as e:
        print(f"Error generating AI message, using default: {e}")
        # Use default message above
    
    return schemas.SuggestTimesResponse(
        case="B",
        message=message,
        alternatives=alternatives
    )

@router.post("/{goal_id}/suggest-dates-times", response_model=schemas.MoodDateSuggestionsResponse)
async def suggest_dates_times(
    *,
    db: Session = Depends(deps.get_db),
    goal_id: int,
    request: schemas.SuggestDatesTimesRequest,
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    """
    Suggest time slots grouped by upcoming dates, influenced by recent mood/wellbeing signals.
    Uses availability (existing schedule blocks) and goal preferences. Returns 2-3 suggestions per date.
    """
    goal = crud_goal.get_goal(db, goal_id=goal_id, user_id=current_user.id)
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    # Read recent mood check-ins (last 5)
    recent_moods = crud_mood_checkin.get_multi_by_owner(db=db, owner_id=current_user.id, limit=5)
    # Simple heuristic to choose earlier or later dates based on energy/stress/sleep
    latest = recent_moods[-1] if recent_moods else None
    energy = getattr(latest, "energy_level", 3) or 3
    stress = getattr(latest, "stress_level", 3) or 3
    sleep = float(getattr(latest, "sleep_hours_last_night", 7.0) or 7.0)

    # Determine day offsets priority
    total_days = max(1, min(7, int(request.days or 3)))
    base_offsets = list(range(0, total_days))
    if energy >= 4 and stress <= 4 and sleep >= 7:
        # Prefer nearer days
        day_offsets = base_offsets
    elif energy <= 2 or stress >= 7 or sleep < 6:
        # Push to a bit later
        day_offsets = [min(2, total_days - 1)] + [i for i in base_offsets if i != min(2, total_days - 1)]
    else:
        # Slightly later first
        day_offsets = [1] + [i for i in base_offsets if i != 1]

    groups: list[schemas.DateSuggestionsGroup] = []

    for offset in day_offsets:
        from datetime import date
        target_date = (datetime.now(timezone.utc) + timedelta(days=offset)).date()
        duration_minutes = request.duration_minutes if request.duration_minutes else goal.duration_minutes

        # Bounds for the day
        start_of_day = datetime.combine(target_date, datetime.min.time()).replace(tzinfo=timezone.utc)
        end_of_day = start_of_day + timedelta(days=1)

        existing_blocks = db.query(ScheduleBlock).filter(
            and_(
                ScheduleBlock.user_id == current_user.id,
                ScheduleBlock.start_at >= start_of_day,
                ScheduleBlock.start_at < end_of_day,
                ScheduleBlock.status != BlockStatus.CANCELED,
            )
        ).order_by(ScheduleBlock.start_at).all()

        candidate_slots = _compute_candidate_slots(
            target_date=target_date,
            duration_minutes=duration_minutes,
            existing_blocks=existing_blocks,
            preferred_time_window=goal.preferred_time_window,
        )

        suggestions: list[schemas.TimeSuggestion] = []
        if candidate_slots:
            try:
                if request.fast:
                    for start, end in candidate_slots[:3]:
                        hour = start.hour
                        reason = "Morning slot - fresh start" if hour < 12 else (
                            "Afternoon slot - good energy" if hour < 17 else "Evening slot - wrap up the day"
                        )
                        suggestions.append(schemas.TimeSuggestion(start_time=start, end_time=end, reason=reason))
                else:
                    candidate_slots_dict = [
                        {"start": start.isoformat(), "end": end.isoformat()}
                        for start, end in candidate_slots
                    ]
                    existing_blocks_dict = [
                        {
                            "start": block.start_at.isoformat(),
                            "end": block.end_at.isoformat(),
                            "title": block.title or "Event",
                            "type": block.type.value if hasattr(block.type, "value") else str(block.type),
                        }
                        for block in existing_blocks
                    ]
                    ranked_slots = await ai_service.rank_time_slots(
                        goal_name=goal.name,
                        duration_minutes=duration_minutes,
                        preferred_time_window=goal.preferred_time_window,
                        target_date=target_date.strftime("%Y-%m-%d"),
                        existing_blocks=existing_blocks_dict,
                        candidate_slots=candidate_slots_dict,
                    )

                    candidate_slots_map = {start.isoformat(): (start, end) for start, end in candidate_slots}
                    for slot in ranked_slots[:3]:
                        start_str = slot.get("start")
                        if not start_str:
                            continue
                        if start_str in candidate_slots_map:
                            start_dt, end_dt = candidate_slots_map[start_str]
                            suggestions.append(
                                schemas.TimeSuggestion(
                                    start_time=start_dt, end_time=end_dt, reason=slot.get("reason", "Good time slot")
                                )
                            )
                        else:
                            s = start_str
                            if s.endswith("Z"):
                                s = s[:-1] + "+00:00"
                            e = slot.get("end") or ""
                            if e:
                                if e.endswith("Z"):
                                    e = e[:-1] + "+00:00"
                                start_dt = datetime.fromisoformat(s)
                                end_dt = datetime.fromisoformat(e)
                            else:
                                start_dt = datetime.fromisoformat(s)
                                end_dt = start_dt + timedelta(minutes=duration_minutes)
                            suggestions.append(
                                schemas.TimeSuggestion(
                                    start_time=start_dt, end_time=end_dt, reason=slot.get("reason", "Good time slot")
                                )
                            )
            except Exception as e:
                print(f"Error ranking mood-aware slots: {e}")
                for start, end in candidate_slots[:3]:
                    hour = start.hour
                    reason = "Morning slot - fresh start" if hour < 12 else (
                        "Afternoon slot - good energy" if hour < 17 else "Evening slot - wrap up the day"
                    )
                    suggestions.append(schemas.TimeSuggestion(start_time=start, end_time=end, reason=reason))

        if suggestions:
            groups.append(
                schemas.DateSuggestionsGroup(
                    date=target_date.strftime("%Y-%m-%d"), suggestions=suggestions
                )
            )

    return schemas.MoodDateSuggestionsResponse(groups=groups)

