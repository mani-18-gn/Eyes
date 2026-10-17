from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import timedelta

from backend.app.core.database import get_db
from backend.app.core.security import verify_password, get_password_hash, create_access_token
from backend.app.core.config import settings
from backend.app.core.deps import get_current_user
from backend.app.models.models import User, Workspace
from backend.app.schemas.schemas import UserRegister, UserLogin, Token, UserResponse, UserUpdate

router = APIRouter()

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(payload: UserRegister, db: AsyncSession = Depends(get_db)):
    # Check existing user
    result = await db.execute(select(User).where(User.email == payload.email.lower()))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists."
        )

    # Hash password securely
    hashed_pw = get_password_hash(payload.password)
    new_user = User(
        email=payload.email.lower(),
        password_hash=hashed_pw,
        full_name=payload.full_name or payload.email.split("@")[0].capitalize(),
        preferred_language=payload.preferred_language,
        ai_personality=payload.ai_personality
    )
    db.add(new_user)
    await db.flush()

    # Create default personal workspace
    default_ws = Workspace(
        user_id=new_user.id,
        name="Personal Space",
        description="Default workspace for notes and scans",
        icon="sparkles",
        color="#8b5cf6"
    )
    db.add(default_ws)
    await db.commit()

    token = create_access_token(new_user.id, timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": new_user.id,
            "email": new_user.email,
            "full_name": new_user.full_name,
            "preferred_language": new_user.preferred_language,
            "ai_personality": new_user.ai_personality
        }
    }

@router.post("/login", response_model=Token)
async def login(payload: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == payload.email.lower()))
    user = result.scalar_one_or_none()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password. Please verify your credentials."
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive."
        )

    token = create_access_token(user.id, timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "preferred_language": user.preferred_language,
            "ai_personality": user.ai_personality
        }
    }

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.put("/me", response_model=UserResponse)
async def update_me(
    payload: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if payload.full_name is not None:
        current_user.full_name = payload.full_name
    if payload.preferred_language is not None:
        current_user.preferred_language = payload.preferred_language
    if payload.ai_personality is not None:
        current_user.ai_personality = payload.ai_personality

    db.add(current_user)
    await db.commit()
    await db.refresh(current_user)
    return current_user
