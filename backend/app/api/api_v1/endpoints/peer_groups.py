
from typing import Any, List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.api import deps

router = APIRouter()

@router.get("/", response_model=List[schemas.PeerGroup])
def read_peer_groups(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Retrieve peer groups.
    """
    groups = crud.peer_group.get_multi(db, skip=skip, limit=limit)
    # Manually populate member count for now or use a hybrid property
    for group in groups:
        group.member_count = len(group.members)
    return groups

@router.post("/", response_model=schemas.PeerGroup)
def create_peer_group(
    *,
    db: Session = Depends(deps.get_db),
    group_in: schemas.PeerGroupCreate,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Create new peer group.
    """
    group = crud.peer_group.create(db=db, obj_in=group_in)
    # Auto-join creator
    crud.peer_group.join_group(db=db, group_id=group.id, user_id=current_user.id)
    return group

@router.post("/{group_id}/join", response_model=schemas.GroupMember)
def join_peer_group(
    *,
    db: Session = Depends(deps.get_db),
    group_id: int,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Join a peer group.
    """
    group = crud.peer_group.get(db=db, id=group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    if crud.peer_group.is_member(db=db, group_id=group_id, user_id=current_user.id):
         raise HTTPException(status_code=400, detail="Already a member")

    member = crud.peer_group.join_group(db=db, group_id=group_id, user_id=current_user.id)
    return member

@router.get("/{group_id}/messages", response_model=List[schemas.GroupMessage])
def read_messages(
    *,
    db: Session = Depends(deps.get_db),
    group_id: int,
    skip: int = 0,
    limit: int = 100,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Retrieve messages for a peer group.
    """
    if not crud.peer_group.is_member(db=db, group_id=group_id, user_id=current_user.id):
        raise HTTPException(status_code=403, detail="Not a member of this group")
        
    messages = crud.peer_group.get_messages(db=db, group_id=group_id, skip=skip, limit=limit)
    return messages

@router.post("/{group_id}/messages", response_model=schemas.GroupMessage)
def create_message(
    *,
    db: Session = Depends(deps.get_db),
    group_id: int,
    message_in: schemas.GroupMessageCreate,
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    """
    Post a message to a peer group.
    """
    if not crud.peer_group.is_member(db=db, group_id=group_id, user_id=current_user.id):
        raise HTTPException(status_code=403, detail="Not a member of this group")
        
    message = crud.peer_group.create_message(
        db=db, group_id=group_id, user_id=current_user.id, content=message_in.content
    )
    return message
