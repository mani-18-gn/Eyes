import uuid
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from backend.app.core.database import get_db
from backend.app.core.deps import get_current_user
from backend.app.models.models import User, Expense, AuditLog
from backend.app.schemas.schemas import ExpenseCreate, ExpenseResponse

router = APIRouter()

@router.get("", response_model=List[ExpenseResponse])
async def list_expenses(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Expense)
        .where(Expense.user_id == current_user.id)
        .order_by(Expense.date.desc(), Expense.created_at.desc())
    )
    return result.scalars().all()

@router.get("/summary")
async def get_expenses_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Expense).where(Expense.user_id == current_user.id)
    )
    expenses = result.scalars().all()
    
    total = sum([float(e.amount) for e in expenses])
    by_category: Dict[str, float] = {}
    for e in expenses:
        cat = e.category or "Other"
        by_category[cat] = by_category.get(cat, 0.0) + float(e.amount)

    return {
        "total_amount": round(total, 2),
        "currency": "INR",
        "count": len(expenses),
        "by_category": by_category
    }

@router.post("", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
async def create_expense(
    payload: ExpenseCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    expense = Expense(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        scan_id=payload.scan_id,
        merchant=payload.merchant,
        amount=payload.amount,
        currency=payload.currency,
        category=payload.category,
        date=payload.date,
        line_items=payload.line_items,
        is_confirmed=True
    )
    db.add(expense)

    audit = AuditLog(
        user_id=current_user.id,
        action="expense_recorded",
        details={"merchant": payload.merchant, "amount": payload.amount, "currency": payload.currency}
    )
    db.add(audit)
    
    await db.commit()
    await db.refresh(expense)
    return expense

@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_expense(
    expense_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Expense).where(Expense.id == expense_id, Expense.user_id == current_user.id)
    )
    exp = result.scalar_one_or_none()
    if not exp:
        raise HTTPException(status_code=404, detail="Expense record not found.")

    await db.delete(exp)
    await db.commit()
    return None
