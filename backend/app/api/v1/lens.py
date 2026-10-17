import os
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from backend.app.core.database import get_db
from backend.app.core.config import settings
from backend.app.core.deps import get_current_user
from backend.app.models.models import User, Scan, VisionResult, Conversation, Message, BrainMemory, AuditLog
from backend.app.schemas.schemas import ScanResponse, BrainMemoryResponse
from ai_service.app.vision.preprocessor import preprocessor
from ai_service.app.providers.multimodal_hub import multimodal_hub

router = APIRouter()

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

@router.post("/scans", response_model=ScanResponse, status_code=status.HTTP_201_CREATED)
async def create_scan(
    file: UploadFile = File(...),
    prompt: Optional[str] = Form(""),
    mode: Optional[str] = Form("general"),
    language: Optional[str] = Form("en"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Validate MIME type
    if not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must be a valid image (JPEG, PNG, WEBP)."
        )

    image_bytes = await file.read()
    if len(image_bytes) > settings.MAX_IMAGE_SIZE_MB * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Image size exceeds limit of {settings.MAX_IMAGE_SIZE_MB}MB."
        )

    # 1. Real Image Preprocessing & Blur Detection
    processed = preprocessor.process(image_bytes)
    
    scan_id = str(uuid.uuid4())
    img_filename = f"{scan_id}.jpg"
    thumb_filename = f"{scan_id}_thumb.jpg"
    
    img_path = os.path.join(settings.UPLOAD_DIR, img_filename)
    thumb_path = os.path.join(settings.UPLOAD_DIR, thumb_filename)
    
    with open(img_path, "wb") as f:
        f.write(processed["optimized_bytes"])
    with open(thumb_path, "wb") as f:
        f.write(processed["thumbnail_bytes"])

    image_url = f"/uploads/{img_filename}"
    thumbnail_url = f"/uploads/{thumb_filename}"

    # 2. Persist Scan Record
    scan = Scan(
        id=scan_id,
        user_id=current_user.id,
        image_url=image_url,
        thumbnail_url=thumbnail_url,
        blur_score=processed["blur_score"],
        is_blurry=processed["is_blurry"],
        width=processed["width"],
        height=processed["height"],
        mime_type="image/jpeg",
        mode=mode or "general",
        language=language or current_user.preferred_language,
        is_saved_to_brain=False
    )
    db.add(scan)
    await db.flush()

    # 3. Multimodal AI Analysis (Real execution)
    analysis = await multimodal_hub.analyze(
        image_bytes=processed["optimized_bytes"],
        user_prompt=prompt or "",
        mode=scan.mode,
        language=scan.language,
        personality=current_user.ai_personality
    )

    # Append any preprocessing warnings (e.g. blur warnings)
    combined_warnings = list(dict.fromkeys(analysis.get("warnings", []) + processed.get("warnings", [])))

    vision_result = VisionResult(
        id=str(uuid.uuid4()),
        scan_id=scan.id,
        observed_facts=analysis.get("observations", []),
        inferred_facts=analysis.get("inferred_facts", []),
        ocr_text=analysis.get("ocr_text", ""),
        structured_entities=analysis.get("structured_entities", {}),
        confidence_scores=analysis.get("confidence_scores", {}),
        response_markdown=analysis.get("response_markdown", "No response generated."),
        suggested_actions=analysis.get("suggested_actions", []),
        warnings=combined_warnings,
        provider_used=analysis.get("provider_used", "local")
    )
    db.add(vision_result)

    # 4. Initialize visual conversation context
    conv = Conversation(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        scan_id=scan.id,
        title=f"Scan: {mode.capitalize()} ({scan_id[:8]})",
        mode=scan.mode
    )
    db.add(conv)
    await db.flush()

    # Initial assistant message in conversation
    first_msg = Message(
        conversation_id=conv.id,
        sender="assistant",
        content=vision_result.response_markdown,
        epistemic_class="INFERRED",
        sources=[{"type": "vision_result", "id": vision_result.id, "provider": vision_result.provider_used}]
    )
    db.add(first_msg)

    # 5. Audit Log
    audit = AuditLog(
        user_id=current_user.id,
        action="scan_completed",
        details={
            "scan_id": scan.id,
            "mode": scan.mode,
            "blur_score": scan.blur_score,
            "provider": vision_result.provider_used
        }
    )
    db.add(audit)
    await db.commit()

    # Reload scan with vision result for clean schema serialization
    result = await db.execute(
        select(Scan).options(selectinload(Scan.vision_result)).where(Scan.id == scan.id)
    )
    loaded_scan = result.scalar_one()
    return loaded_scan

@router.get("/scans", response_model=List[ScanResponse])
async def list_scans(
    limit: int = 30,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Scan)
        .options(selectinload(Scan.vision_result))
        .where(Scan.user_id == current_user.id)
        .order_by(Scan.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return result.scalars().all()

@router.get("/scans/{scan_id}", response_model=ScanResponse)
async def get_scan(
    scan_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Scan)
        .options(selectinload(Scan.vision_result))
        .where(Scan.id == scan_id, Scan.user_id == current_user.id)
    )
    scan = result.scalar_one_or_none()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found or access unauthorized.")
    return scan

@router.post("/scans/{scan_id}/save-brain", response_model=BrainMemoryResponse)
async def save_scan_to_brain(
    scan_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Scan).options(selectinload(Scan.vision_result)).where(Scan.id == scan_id, Scan.user_id == current_user.id)
    )
    scan = result.scalar_one_or_none()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found.")

    memory_content = f"Scan Mode: {scan.mode}\n"
    if scan.vision_result:
        memory_content += scan.vision_result.response_markdown

    memory = BrainMemory(
        user_id=current_user.id,
        category=scan.mode if scan.mode in ["college", "work", "receipt", "code", "study"] else "personal",
        title=f"Saved Scan ({scan.mode.upper()})",
        content=memory_content,
        source_type="scan",
        source_id=scan.id,
        tags=[scan.mode, "visual_scan"]
    )
    scan.is_saved_to_brain = True
    db.add(memory)
    db.add(scan)
    await db.commit()
    await db.refresh(memory)
    return memory

@router.delete("/scans/{scan_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_scan(
    scan_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Scan).where(Scan.id == scan_id, Scan.user_id == current_user.id))
    scan = result.scalar_one_or_none()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found.")

    # Remove files if present
    for path in [
        os.path.join(settings.UPLOAD_DIR, f"{scan.id}.jpg"),
        os.path.join(settings.UPLOAD_DIR, f"{scan.id}_thumb.jpg")
    ]:
        if os.path.exists(path):
            try:
                os.remove(path)
            except OSError:
                pass

    await db.delete(scan)
    await db.commit()
    return None
