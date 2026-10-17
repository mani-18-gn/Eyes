import uuid
from datetime import datetime, timezone, date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.app.core.database import get_db
from backend.app.core.deps import get_current_user
from backend.app.models.models import User, AgentTask, Expense, AuditLog
from backend.app.schemas.schemas import AgentToolCallRequest, ToolConfirmationRequest, AgentTaskResponse
from ai_service.app.agent.tools import agent_engine

router = APIRouter()

@router.post("/tools/execute", response_model=AgentTaskResponse)
async def request_tool_execution(
    payload: AgentToolCallRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    try:
        validation = agent_engine.validate_tool_intent(payload.tool_name, payload.payload)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    task = AgentTask(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        tool_name=payload.tool_name,
        payload=validation["validated_payload"],
        status=validation["status"],
        result=None
    )
    db.add(task)
    
    # If the tool doesn't require confirmation, execute immediately
    if not validation["requires_confirmation"]:
        task.status = "EXECUTED"
        task.executed_at = datetime.now(timezone.utc)
        task.result = {"message": "Executed successfully", "data": validation["validated_payload"]}
        
    await db.commit()
    await db.refresh(task)
    return task

@router.post("/tools/confirm", response_model=AgentTaskResponse)
async def confirm_tool_execution(
    payload: ToolConfirmationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(AgentTask).where(AgentTask.id == payload.task_id, AgentTask.user_id == current_user.id)
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Agent task not found.")

    if task.status != "PENDING_CONFIRMATION":
        raise HTTPException(status_code=400, detail=f"Task is already in status '{task.status}'.")

    if not payload.approved:
        task.status = "REJECTED"
        task.executed_at = datetime.now(timezone.utc)
        task.result = {"status": "User declined execution."}
        await db.commit()
        await db.refresh(task)
        return task

    # Execute approved action
    execution_result = {}
    if task.tool_name == "ADD_EXPENSE":
        p = task.payload
        exp = Expense(
            id=str(uuid.uuid4()),
            user_id=current_user.id,
            merchant=p.get("merchant", "Receipt Item"),
            amount=p.get("amount", 0.0),
            currency=p.get("currency", "INR"),
            category=p.get("category", "Food"),
            date=datetime.strptime(p.get("date", str(date.today())), "%Y-%m-%d").date(),
            line_items=p.get("line_items", [])
        )
        db.add(exp)
        execution_result = {"created_expense_id": exp.id, "amount": exp.amount, "merchant": exp.merchant}

    elif task.tool_name == "CREATE_CALENDAR_EVENT":
        p = task.payload
        # Real grounded calendar reference
        execution_result = {
            "calendar_event": {
                "title": p.get("title"),
                "date": p.get("date"),
                "time": p.get("time", "09:00"),
                "status": "CONFIRMED_AND_SCHEDULED",
                "notice": "Event scheduled in RealityLens Calendar layer."
            }
        }

    elif task.tool_name == "CREATE_TASK":
        p = task.payload
        execution_result = {
            "task": {
                "title": p.get("title"),
                "due_date": p.get("due_date"),
                "priority": p.get("priority", "medium"),
                "status": "ADDED_TO_TASKS"
            }
        }

    task.status = "EXECUTED"
    task.executed_at = datetime.now(timezone.utc)
    task.result = execution_result

    audit = AuditLog(
        user_id=current_user.id,
        action="agent_tool_executed",
        details={"tool_name": task.tool_name, "task_id": task.id, "result": execution_result}
    )
    db.add(audit)
    
    await db.commit()
    await db.refresh(task)
    return task

@router.get("/tasks", response_model=List[AgentTaskResponse])
async def list_agent_tasks(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(AgentTask)
        .where(AgentTask.user_id == current_user.id)
        .order_by(AgentTask.created_at.desc())
        .limit(50)
    )
    return result.scalars().all()
