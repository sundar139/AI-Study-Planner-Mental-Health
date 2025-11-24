
from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import models, schemas
from app.crud import crud_assignment as asg
from app.api import deps

router = APIRouter()

@router.get("/", response_model=List[schemas.Assignment])
def read_assignments(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    assignments = asg.get_assignments(db, user_id=current_user.id, skip=skip, limit=limit)
    return assignments

@router.post("/", response_model=schemas.Assignment)
def create_assignment(
    *,
    db: Session = Depends(deps.get_db),
    assignment_in: schemas.AssignmentCreate,
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    assignment = asg.create_assignment(db, assignment=assignment_in, user_id=current_user.id)
    return assignment

@router.get("/{id}", response_model=schemas.Assignment)
def read_assignment(
    *,
    db: Session = Depends(deps.get_db),
    id: int,
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    assignment = asg.get_assignment(db, assignment_id=id, user_id=current_user.id)
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    return assignment

@router.put("/{id}", response_model=schemas.Assignment)
def update_assignment(
    *,
    db: Session = Depends(deps.get_db),
    id: int,
    assignment_in: schemas.AssignmentUpdate,
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    assignment = asg.get_assignment(db, assignment_id=id, user_id=current_user.id)
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    assignment = asg.update_assignment(db, db_obj=assignment, obj_in=assignment_in)
    return assignment

@router.delete("/{id}", response_model=schemas.Assignment)
def delete_assignment(
    *,
    db: Session = Depends(deps.get_db),
    id: int,
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    assignment = asg.get_assignment(db, assignment_id=id, user_id=current_user.id)
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    assignment = asg.delete_assignment(db, db_obj=assignment)
    return assignment

@router.post("/{id}/plan", response_model=List[schemas.Subtask])
async def generate_assignment_plan(
    *,
    db: Session = Depends(deps.get_db),
    id: int,
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    """
    Generate a study plan (subtasks) for an assignment using AI.
    """
    assignment = asg.get_assignment(db, assignment_id=id, user_id=current_user.id)
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    # Use AIService to generate plan
    from app.services.ai_service import ai_service
    
    plan = await ai_service.generate_assignment_plan(
        assignment_title=assignment.title,
        assignment_description=assignment.description
    )
    
    # Create subtasks from plan
    created_subtasks = []
    for step in plan:
        subtask_in = schemas.SubtaskCreate(
            title=step["title"],
            estimated_minutes=step["estimated_minutes"],
            order_index=step["order"]
        )
        subtask = asg.create_subtask(db, subtask=subtask_in, assignment_id=assignment.id)
        created_subtasks.append(subtask)
        
    # Mark assignment as having an AI plan
    # assignment.ai_generated_plan = True
    # db.commit()
        
    return created_subtasks
