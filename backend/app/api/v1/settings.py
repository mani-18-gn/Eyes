from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from backend.app.core.config import settings
from backend.app.core.database import get_db
from backend.app.core.deps import get_current_user
from backend.app.models.models import User, Scan, BrainMemory, Expense, AgentTask
from backend.app.schemas.schemas import HealthStatus
from ai_service.app.providers.multimodal_hub import multimodal_hub

router = APIRouter()

class APIKeyUpdateRequest(BaseModel):
    gemini_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None

@router.get("/health", response_model=HealthStatus)
async def check_health():
    return {
        "status": "operational",
        "version": settings.VERSION,
        "database": "sqlite_connected" if "sqlite" in settings.DATABASE_URL else "postgresql_connected",
        "ai_provider": "gemini" if multimodal_hub.gemini_key else ("openai" if multimodal_hub.openai_key else "local_deterministic"),
        "gemini_configured": bool(multimodal_hub.gemini_key),
        "openai_configured": bool(multimodal_hub.openai_key)
    }

@router.post("/keys")
async def update_api_keys(
    payload: APIKeyUpdateRequest,
    current_user: User = Depends(get_current_user)
):
    multimodal_hub.update_keys(
        gemini_key=payload.gemini_api_key,
        openai_key=payload.openai_api_key
    )
    return {
        "success": True,
        "message": "AI Provider credentials updated in active engine runtime.",
        "gemini_active": bool(multimodal_hub.gemini_key),
        "openai_active": bool(multimodal_hub.openai_key)
    }

@router.get("/wrapped")
async def get_reality_wrapped(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Computes Reality Wrapped using ONLY real persisted user data.
    Never fabricates statistics.
    """
    # Total scans
    scans_res = await db.execute(select(func.count(Scan.id)).where(Scan.user_id == current_user.id))
    total_scans = scans_res.scalar() or 0

    # Total memories
    mem_res = await db.execute(select(func.count(BrainMemory.id)).where(BrainMemory.user_id == current_user.id))
    total_memories = mem_res.scalar() or 0

    # Total expenses
    exp_res = await db.execute(select(func.count(Expense.id)).where(Expense.user_id == current_user.id))
    total_expenses = exp_res.scalar() or 0

    # Total agent tasks
    task_res = await db.execute(select(func.count(AgentTask.id)).where(AgentTask.user_id == current_user.id))
    total_tasks = task_res.scalar() or 0

    if total_scans == 0 and total_memories == 0 and total_expenses == 0:
        return {
            "has_enough_activity": False,
            "message": "Not enough activity yet for your Wrapped. Start by pointing your camera at something real!"
        }

    return {
        "has_enough_activity": True,
        "stats": {
            "total_scans": total_scans,
            "saved_memories": total_memories,
            "tracked_expenses": total_expenses,
            "executed_actions": total_tasks,
            "preferred_language": current_user.preferred_language,
            "ai_personality": current_user.ai_personality
        }
    }
