from typing import List, Optional, Dict, Any
from datetime import datetime, date
from pydantic import BaseModel, EmailStr, Field

# ----------------- Auth Schemas -----------------
class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: Optional[str] = None
    preferred_language: str = "en"
    ai_personality: str = "gen_z"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: Optional[str] = None
    preferred_language: str
    ai_personality: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    preferred_language: Optional[str] = None
    ai_personality: Optional[str] = None

# ----------------- Vision & Multimodal Schemas -----------------
class ObservationItem(BaseModel):
    entity: str
    location: Optional[str] = None
    confidence: float
    description: str

class InferenceItem(BaseModel):
    hypothesis: str
    confidence: float
    reasoning: str

class VisionResultResponse(BaseModel):
    id: str
    scan_id: str
    observed_facts: List[Any]
    inferred_facts: List[Any]
    ocr_text: Optional[str] = None
    structured_entities: Dict[str, Any]
    confidence_scores: Dict[str, Any]
    response_markdown: str
    suggested_actions: List[Any]
    warnings: List[str]
    provider_used: str
    created_at: datetime

    class Config:
        from_attributes = True

class ScanResponse(BaseModel):
    id: str
    user_id: str
    image_url: str
    thumbnail_url: Optional[str] = None
    blur_score: float
    is_blurry: bool
    width: int
    height: int
    mode: str
    language: str
    is_saved_to_brain: bool
    created_at: datetime
    vision_result: Optional[VisionResultResponse] = None

    class Config:
        from_attributes = True

# ----------------- Visual Chat Schemas -----------------
class MessageCreate(BaseModel):
    content: str
    language: Optional[str] = None

class MessageResponse(BaseModel):
    id: str
    conversation_id: str
    sender: str
    content: str
    epistemic_class: str
    sources: List[Dict[str, Any]]
    created_at: datetime

    class Config:
        from_attributes = True

class ConversationResponse(BaseModel):
    id: str
    user_id: str
    scan_id: Optional[str] = None
    title: str
    mode: str
    created_at: datetime
    messages: List[MessageResponse] = []

    class Config:
        from_attributes = True

# ----------------- Brain & Workspace Schemas -----------------
class WorkspaceCreate(BaseModel):
    name: str
    description: Optional[str] = None
    icon: Optional[str] = "folder"
    color: Optional[str] = "#8b5cf6"

class WorkspaceResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    icon: str
    color: str
    created_at: datetime

    class Config:
        from_attributes = True

class BrainMemoryCreate(BaseModel):
    workspace_id: Optional[str] = None
    category: str = "personal"
    title: str
    content: str
    source_type: str = "manual"
    source_id: Optional[str] = None
    tags: List[str] = []

class BrainMemoryResponse(BaseModel):
    id: str
    workspace_id: Optional[str] = None
    category: str
    title: str
    content: str
    source_type: str
    source_id: Optional[str] = None
    tags: List[str]
    created_at: datetime

    class Config:
        from_attributes = True

class BrainSearchRequest(BaseModel):
    query: str
    category: Optional[str] = None
    workspace_id: Optional[str] = None
    limit: int = 10

class BrainSearchResult(BaseModel):
    id: str
    title: str
    content: str
    category: str
    score: float
    source_type: str
    created_at: datetime

# ----------------- Expenses / Receipt Schemas -----------------
class ExpenseCreate(BaseModel):
    scan_id: Optional[str] = None
    merchant: str
    amount: float
    currency: str = "INR"
    category: str = "Food"
    date: date
    line_items: List[Dict[str, Any]] = []

class ExpenseResponse(BaseModel):
    id: str
    scan_id: Optional[str] = None
    merchant: str
    amount: float
    currency: str
    category: str
    date: date
    line_items: List[Dict[str, Any]]
    created_at: datetime

    class Config:
        from_attributes = True

# ----------------- Reality Agent & Tools -----------------
class AgentToolCallRequest(BaseModel):
    tool_name: str
    payload: Dict[str, Any]

class ToolConfirmationRequest(BaseModel):
    task_id: str
    approved: bool

class AgentTaskResponse(BaseModel):
    id: str
    tool_name: str
    payload: Dict[str, Any]
    status: str
    result: Optional[Dict[str, Any]] = None
    created_at: datetime
    executed_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# ----------------- Error & Health Schemas -----------------
class ErrorResponse(BaseModel):
    success: bool = False
    code: str
    message: str
    details: Optional[Dict[str, Any]] = None
    requestId: Optional[str] = None

class HealthStatus(BaseModel):
    status: str
    version: str
    database: str
    ai_provider: str
    gemini_configured: bool
    openai_configured: bool
