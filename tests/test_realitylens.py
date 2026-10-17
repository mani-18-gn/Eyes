import io
import pytest
from PIL import Image, ImageDraw, ImageFilter
from datetime import date

from backend.app.core.security import get_password_hash, verify_password, create_access_token, decode_access_token
from ai_service.app.vision.preprocessor import preprocessor
from ai_service.app.ocr.ocr_engine import ocr_engine
from ai_service.app.agent.tools import agent_engine, TOOL_REGISTRY
from ai_service.app.providers.multimodal_hub import multimodal_hub

def create_sample_image(sharp: bool = True) -> bytes:
    """Creates a real in-memory image for automated testing."""
    img = Image.new("RGB", (400, 300), color=(240, 240, 245))
    draw = ImageDraw.Draw(img)
    if sharp:
        # High contrast lines and text (sharp edges)
        for i in range(10, 290, 15):
            draw.line([(i, 10), (i, 290)], fill=(10, 10, 20), width=3)
            draw.text((20, i), f"EXAM NOTICE SECTION {i}", fill=(0, 0, 0))
    else:
        # Extreme defocus blur (out-of-focus lens capture)
        for i in range(10, 290, 30):
            draw.line([(i, 10), (i, 290)], fill=(180, 180, 190), width=1)
        img = img.filter(ImageFilter.GaussianBlur(radius=12))
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=90)
    return buf.getvalue()

# ----------------- 1. Auth & Security Tests -----------------

def test_password_hashing_and_verification():
    raw_pwd = "RealityLens_Password_2026!"
    hashed = get_password_hash(raw_pwd)
    assert hashed != raw_pwd
    assert verify_password(raw_pwd, hashed) is True
    assert verify_password("WrongPassword!", hashed) is False

def test_jwt_token_lifecycle():
    user_id = "usr_test_98765"
    token = create_access_token(user_id)
    assert token is not None
    payload = decode_access_token(token)
    assert payload is not None
    assert payload["sub"] == user_id

# ----------------- 2. Vision Preprocessing & Blur Detection -----------------

def test_sharp_image_preprocessing():
    sharp_bytes = create_sample_image(sharp=True)
    res = preprocessor.process(sharp_bytes)
    assert res["width"] > 0
    assert res["height"] > 0
    assert res["blur_score"] > 35.0  # Sharp images exceed threshold
    assert res["is_blurry"] is False
    assert len(res["thumbnail_bytes"]) > 0

def test_blurry_image_rejection_warning():
    blurry_bytes = create_sample_image(sharp=False)
    res = preprocessor.process(blurry_bytes)
    assert res["blur_score"] < 35.0  # Smooth blurry image has low edge variance
    assert res["is_blurry"] is True
    assert any("blurry" in w.lower() for w in res["warnings"])

# ----------------- 3. Structured OCR Extraction -----------------

def test_ocr_structured_entity_extraction():
    sample_notice = """
    VTU EXAMINATION NOTICE
    The final semester viva is scheduled for 25/11/2026.
    Exam fee of Rs. 1,450 must be paid online before the last date.
    Submission deadline: 2026-11-20
    Contact: examcell@college.edu or visit https://vtu.ac.in
    """
    entities = ocr_engine.extract_structured_entities(sample_notice)
    assert "25/11/2026" in entities["dates"] or "2026-11-20" in entities["dates"]
    assert 1450.0 in entities["amounts"]
    assert len(entities["deadlines"]) >= 1
    assert "examcell@college.edu" in entities["emails"]
    assert any("vtu.ac.in" in u for u in entities["urls"])

# ----------------- 4. Agent Tool Safety & Confirmation Policy -----------------

def test_agent_tool_schema_validation():
    # Valid calendar event
    val = agent_engine.validate_tool_intent("CREATE_CALENDAR_EVENT", {
        "title": "Compiler Design Exam",
        "date": "2026-11-25",
        "time": "10:00",
        "duration_minutes": 180
    })
    assert val["requires_confirmation"] is True
    assert val["status"] == "PENDING_CONFIRMATION"
    assert val["validated_payload"]["title"] == "Compiler Design Exam"

def test_agent_rejects_arbitrary_unregistered_tools():
    with pytest.raises(ValueError, match="Unknown or unauthorized tool"):
        agent_engine.validate_tool_intent("SYSTEM_EXECUTE_SHELL", {"command": "rm -rf /"})

def test_agent_rejects_invalid_parameters():
    # Missing required 'date' and 'amount'
    with pytest.raises(ValueError):
        agent_engine.validate_tool_intent("ADD_EXPENSE", {"merchant": "Cafe"})

# ----------------- 5. Deterministic AI Fallback & Epistemic Honesty -----------------

@pytest.mark.asyncio
async def test_honest_epistemic_reporting():
    # When keys are missing, system MUST NOT generate fabricated answers
    img_bytes = create_sample_image(sharp=True)
    res = await multimodal_hub.analyze(
        image_bytes=img_bytes,
        user_prompt="What is this component?",
        mode="general",
        language="en"
    )
    assert "observations" in res
    assert "inferred_facts" in res
    assert "response_markdown" in res
    assert res["provider_used"] in ["local_perceptual_inspection", "gemini-2.0-flash", "gpt-4o"]
    # Check that it warns user if API key is not configured instead of pretending to have analyzed
    if res["provider_used"] == "local_perceptual_inspection":
        assert any("API Key" in w for w in res["warnings"])
