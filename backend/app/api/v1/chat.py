import os
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from backend.app.core.database import get_db
from backend.app.core.config import settings
from backend.app.core.deps import get_current_user
from backend.app.models.models import User, Conversation, Message, Scan
from backend.app.schemas.schemas import ConversationResponse, MessageCreate, MessageResponse
from ai_service.app.providers.multimodal_hub import multimodal_hub

router = APIRouter()

@router.get("/conversations", response_model=List[ConversationResponse])
async def list_conversations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Conversation)
        .options(selectinload(Conversation.messages))
        .where(Conversation.user_id == current_user.id)
        .order_by(Conversation.created_at.desc())
    )
    return result.scalars().all()

@router.get("/conversations/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Conversation)
        .options(selectinload(Conversation.messages))
        .where(Conversation.id == conversation_id, Conversation.user_id == current_user.id)
    )
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    return conv

@router.post("/conversations/{conversation_id}/messages", response_model=MessageResponse)
async def send_message(
    conversation_id: str,
    payload: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Verify ownership
    result = await db.execute(
        select(Conversation)
        .options(selectinload(Conversation.messages))
        .where(Conversation.id == conversation_id, Conversation.user_id == current_user.id)
    )
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")

    # Record User Message
    user_msg = Message(
        id=str(uuid.uuid4()),
        conversation_id=conv.id,
        sender="user",
        content=payload.content,
        epistemic_class="USER_PROVIDED",
        sources=[]
    )
    db.add(user_msg)
    await db.flush()

    # Load visual context if conversation is tied to a scan
    image_bytes = None
    if conv.scan_id:
        scan_result = await db.execute(select(Scan).where(Scan.id == conv.scan_id))
        scan = scan_result.scalar_one_or_none()
        if scan:
            img_path = os.path.join(settings.UPLOAD_DIR, f"{scan.id}.jpg")
            if os.path.exists(img_path):
                with open(img_path, "rb") as f:
                    image_bytes = f.read()

    # Build history context
    history = []
    for m in conv.messages[-8:]: # Keep last 8 turns
        history.append({"sender": m.sender, "content": m.content})

    # Language resolution: check if user asks "Kannada" or similar
    lang = payload.language or current_user.preferred_language
    lower_content = payload.content.lower()
    if "kannada" in lower_content or "ಕನ್ನಡ" in lower_content:
        lang = "kn"
    elif "hindi" in lower_content or "हिंदी" in lower_content:
        lang = "hi"
    elif "english" in lower_content:
        lang = "en"

    # Multimodal or text reasoning
    if image_bytes:
        analysis = await multimodal_hub.analyze(
            image_bytes=image_bytes,
            user_prompt=payload.content,
            mode=conv.mode,
            language=lang,
            personality=current_user.ai_personality,
            history=history
        )
        assistant_content = analysis.get("response_markdown", "Could not analyze the visual context.")
        provider = analysis.get("provider_used", "local")
    else:
        # Text query without image
        assistant_content = f"Addressing your query regarding {conv.title}: {payload.content}"
        provider = "text_assistant"

    # Record Assistant Message
    assistant_msg = Message(
        id=str(uuid.uuid4()),
        conversation_id=conv.id,
        sender="assistant",
        content=assistant_content,
        epistemic_class="INFERRED",
        sources=[{"type": "chat_multimodal", "provider": provider}]
    )
    db.add(assistant_msg)
    await db.commit()
    await db.refresh(assistant_msg)

    return assistant_msg
