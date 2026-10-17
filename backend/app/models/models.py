import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Text, Integer, Float, Boolean, DateTime, ForeignKey, JSON, Numeric, Date
)
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=True)
    preferred_language = Column(String(10), default="en")  # 'en', 'kn', 'hi'
    ai_personality = Column(String(50), default="gen_z")   # 'gen_z', 'student', 'professional', 'teacher', 'simple', 'desi'
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    scans = relationship("Scan", back_populates="user", cascade="all, delete-orphan")
    conversations = relationship("Conversation", back_populates="user", cascade="all, delete-orphan")
    workspaces = relationship("Workspace", back_populates="user", cascade="all, delete-orphan")
    memories = relationship("BrainMemory", back_populates="user", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="user", cascade="all, delete-orphan")
    expenses = relationship("Expense", back_populates="user", cascade="all, delete-orphan")
    tasks = relationship("AgentTask", back_populates="user", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user", cascade="all, delete-orphan")

class Scan(Base):
    __tablename__ = "scans"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    image_url = Column(Text, nullable=False)
    thumbnail_url = Column(Text, nullable=True)
    blur_score = Column(Float, nullable=False, default=100.0)
    is_blurry = Column(Boolean, default=False)
    width = Column(Integer, nullable=False, default=1280)
    height = Column(Integer, nullable=False, default=720)
    mime_type = Column(String(50), default="image/jpeg")
    mode = Column(String(50), default="general") # general, lockin, campus, translate, receipt, code, science, kisan
    language = Column(String(10), default="en")
    is_saved_to_brain = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="scans")
    vision_result = relationship("VisionResult", back_populates="scan", uselist=False, cascade="all, delete-orphan")
    conversations = relationship("Conversation", back_populates="scan")
    expense = relationship("Expense", back_populates="scan", uselist=False)

class VisionResult(Base):
    __tablename__ = "vision_results"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    scan_id = Column(String(36), ForeignKey("scans.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    observed_facts = Column(JSON, default=list)        # What is actually in the pixels
    inferred_facts = Column(JSON, default=list)        # AI deduction
    ocr_text = Column(Text, nullable=True)             # Raw extracted text
    structured_entities = Column(JSON, default=dict)   # Dates, amounts, names, tags
    confidence_scores = Column(JSON, default=dict)     # Perceptual confidence per fact
    response_markdown = Column(Text, nullable=False)   # Rich markdown formatted breakdown
    suggested_actions = Column(JSON, default=list)     # Next available actions
    warnings = Column(JSON, default=list)              # Uncertainty or safety alerts
    provider_used = Column(String(50), default="gemini")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    scan = relationship("Scan", back_populates="vision_result")

class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    scan_id = Column(String(36), ForeignKey("scans.id", ondelete="SET NULL"), nullable=True)
    title = Column(String(255), nullable=False, default="Visual Conversation")
    mode = Column(String(50), default="general")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="conversations")
    scan = relationship("Scan", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan", order_by="Message.created_at")

class Message(Base):
    __tablename__ = "messages"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    conversation_id = Column(String(36), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    sender = Column(String(20), nullable=False)  # 'user', 'assistant', 'system'
    content = Column(Text, nullable=False)
    epistemic_class = Column(String(30), default="INFERRED") # OBSERVED, INFERRED, RETRIEVED, USER_PROVIDED, UNCERTAIN
    sources = Column(JSON, default=list)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    conversation = relationship("Conversation", back_populates="messages")

class Workspace(Base):
    __tablename__ = "workspaces"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    icon = Column(String(50), default="folder")
    color = Column(String(20), default="#8b5cf6")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="workspaces")
    memories = relationship("BrainMemory", back_populates="workspace")
    documents = relationship("Document", back_populates="workspace")

class BrainMemory(Base):
    __tablename__ = "brain_memories"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    workspace_id = Column(String(36), ForeignKey("workspaces.id", ondelete="SET NULL"), nullable=True, index=True)
    category = Column(String(50), nullable=False, default="personal") # 'college', 'work', 'receipt', 'code', 'study', 'personal'
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    source_type = Column(String(50), default="scan") # 'scan', 'document', 'conversation', 'manual'
    source_id = Column(String(36), nullable=True)
    tags = Column(JSON, default=list)
    embedding = Column(JSON, nullable=True) # Vector representation for local/pgvector RAG
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="memories")
    workspace = relationship("Workspace", back_populates="memories")

class Document(Base):
    __tablename__ = "documents"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    workspace_id = Column(String(36), ForeignKey("workspaces.id", ondelete="SET NULL"), nullable=True, index=True)
    title = Column(String(255), nullable=False)
    file_url = Column(Text, nullable=False)
    file_type = Column(String(50), default="application/pdf")
    file_size = Column(Integer, default=0)
    extracted_text = Column(Text, nullable=True)
    metadata_json = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="documents")
    workspace = relationship("Workspace", back_populates="documents")

class Expense(Base):
    __tablename__ = "expenses"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    scan_id = Column(String(36), ForeignKey("scans.id", ondelete="SET NULL"), nullable=True)
    merchant = Column(String(255), nullable=False, default="Unknown Merchant")
    amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(10), default="INR")
    category = Column(String(50), default="Food")
    date = Column(Date, nullable=False)
    line_items = Column(JSON, default=list)
    is_confirmed = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="expenses")
    scan = relationship("Scan", back_populates="expense")

class AgentTask(Base):
    __tablename__ = "agent_tasks"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    tool_name = Column(String(100), nullable=False)
    payload = Column(JSON, nullable=False)
    status = Column(String(30), default="PENDING_CONFIRMATION") # PENDING_CONFIRMATION, APPROVED, EXECUTED, REJECTED, FAILED
    result = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    executed_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="tasks")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    action = Column(String(100), nullable=False)
    details = Column(JSON, default=dict)
    ip_address = Column(String(45), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="audit_logs")
