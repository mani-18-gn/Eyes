import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_

from backend.app.core.database import get_db
from backend.app.core.deps import get_current_user
from backend.app.models.models import User, BrainMemory, Workspace, AuditLog
from backend.app.schemas.schemas import (
    BrainMemoryCreate, BrainMemoryResponse,
    WorkspaceCreate, WorkspaceResponse,
    BrainSearchRequest, BrainSearchResult
)

router = APIRouter()

# ----------------- Workspaces -----------------

@router.get("/workspaces", response_model=List[WorkspaceResponse])
async def list_workspaces(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Workspace)
        .where(Workspace.user_id == current_user.id)
        .order_by(Workspace.created_at.desc())
    )
    return result.scalars().all()

@router.post("/workspaces", response_model=WorkspaceResponse, status_code=status.HTTP_201_CREATED)
async def create_workspace(
    payload: WorkspaceCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    ws = Workspace(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        name=payload.name,
        description=payload.description,
        icon=payload.icon or "folder",
        color=payload.color or "#8b5cf6"
    )
    db.add(ws)
    await db.commit()
    await db.refresh(ws)
    return ws

# ----------------- Brain Memories -----------------

@router.get("/memories", response_model=List[BrainMemoryResponse])
async def list_memories(
    category: Optional[str] = None,
    workspace_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(BrainMemory).where(BrainMemory.user_id == current_user.id)
    if category:
        query = query.where(BrainMemory.category == category)
    if workspace_id:
        query = query.where(BrainMemory.workspace_id == workspace_id)
        
    query = query.order_by(BrainMemory.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()

@router.post("/memories", response_model=BrainMemoryResponse, status_code=status.HTTP_201_CREATED)
async def create_memory(
    payload: BrainMemoryCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Verify workspace belongs to user if provided
    if payload.workspace_id:
        ws_check = await db.execute(
            select(Workspace).where(Workspace.id == payload.workspace_id, Workspace.user_id == current_user.id)
        )
        if not ws_check.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Specified workspace does not exist or unauthorized.")

    memory = BrainMemory(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        workspace_id=payload.workspace_id,
        category=payload.category,
        title=payload.title,
        content=payload.content,
        source_type=payload.source_type,
        source_id=payload.source_id,
        tags=payload.tags
    )
    db.add(memory)
    
    # Audit log
    audit = AuditLog(
        user_id=current_user.id,
        action="memory_saved",
        details={"memory_id": memory.id, "title": memory.title, "category": memory.category}
    )
    db.add(audit)
    
    await db.commit()
    await db.refresh(memory)
    return memory

@router.delete("/memories/{memory_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_memory(
    memory_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(BrainMemory).where(BrainMemory.id == memory_id, BrainMemory.user_id == current_user.id)
    )
    memory = result.scalar_one_or_none()
    if not memory:
        raise HTTPException(status_code=404, detail="Memory not found or unauthorized.")

    await db.delete(memory)
    
    audit = AuditLog(
        user_id=current_user.id,
        action="memory_deleted",
        details={"memory_id": memory_id}
    )
    db.add(audit)
    await db.commit()
    return None

# ----------------- RAG & Natural Language Brain Search -----------------

@router.post("/search", response_model=List[BrainSearchResult])
async def search_brain(
    payload: BrainSearchRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    RAG search strictly isolated to the authenticated user.
    Never searches across other users' data.
    """
    terms = payload.query.strip().split()
    if not terms:
        return []

    # Build filtered search expression for User isolation
    conditions = [BrainMemory.user_id == current_user.id]
    if payload.category:
        conditions.append(BrainMemory.category == payload.category)
    if payload.workspace_id:
        conditions.append(BrainMemory.workspace_id == payload.workspace_id)

    # Search title and content matching any keyword
    search_filters = []
    for term in terms:
        pattern = f"%{term}%"
        search_filters.append(BrainMemory.title.ilike(pattern))
        search_filters.append(BrainMemory.content.ilike(pattern))

    conditions.append(or_(*search_filters))

    query = select(BrainMemory).where(and_(*conditions)).limit(payload.limit)
    result = await db.execute(query)
    memories = result.scalars().all()

    # Score calculation based on term overlap
    scored_results = []
    lower_query = payload.query.lower()
    for m in memories:
        score = 0.5
        if lower_query in m.title.lower():
            score += 0.4
        if lower_query in m.content.lower():
            score += 0.2
        for t in terms:
            if t.lower() in m.title.lower():
                score += 0.1
            if t.lower() in m.content.lower():
                score += 0.05
        scored_results.append(
            BrainSearchResult(
                id=m.id,
                title=m.title,
                content=m.content,
                category=m.category,
                score=round(min(score, 1.0), 2),
                source_type=m.source_type,
                created_at=m.created_at
            )
        )

    scored_results.sort(key=lambda x: x.score, reverse=True)
    return scored_results
