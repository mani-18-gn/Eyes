from typing import Dict, Any, Optional
from datetime import datetime, date
import logging
from pydantic import BaseModel, Field

logger = logging.getLogger("realitylens.agent")

class CalendarEventPayload(BaseModel):
    title: str = Field(..., description="Title of calendar event")
    date: str = Field(..., description="Date formatted as YYYY-MM-DD")
    time: Optional[str] = Field("09:00", description="Time formatted as HH:MM")
    duration_minutes: int = Field(60, description="Duration in minutes")
    description: Optional[str] = None
    location: Optional[str] = None

class ExpensePayload(BaseModel):
    merchant: str = Field(..., description="Name of merchant or payee")
    amount: float = Field(..., gt=0, description="Total amount paid")
    currency: str = Field("INR", description="Currency symbol/code")
    category: str = Field("Food", description="Expense category")
    date: str = Field(..., description="Date of purchase YYYY-MM-DD")
    line_items: list = Field(default_factory=list)

class TaskPayload(BaseModel):
    title: str = Field(..., description="Task title or deadline")
    due_date: Optional[str] = Field(None, description="Due date YYYY-MM-DD")
    priority: str = Field("medium", description="Priority: low, medium, high")

class ToolDefinition:
    def __init__(self, name: str, description: str, requires_confirmation: bool, payload_model: Any):
        self.name = name
        self.description = description
        self.requires_confirmation = requires_confirmation
        self.payload_model = payload_model

TOOL_REGISTRY: Dict[str, ToolDefinition] = {
    "CREATE_CALENDAR_EVENT": ToolDefinition(
        name="CREATE_CALENDAR_EVENT",
        description="Creates a verified event/reminder in the calendar.",
        requires_confirmation=True,
        payload_model=CalendarEventPayload
    ),
    "ADD_EXPENSE": ToolDefinition(
        name="ADD_EXPENSE",
        description="Records an expense extracted from a receipt or transaction.",
        requires_confirmation=True,
        payload_model=ExpensePayload
    ),
    "CREATE_TASK": ToolDefinition(
        name="CREATE_TASK",
        description="Adds a todo or academic deadline item.",
        requires_confirmation=True,
        payload_model=TaskPayload
    ),
    "SEARCH_WEB": ToolDefinition(
        name="SEARCH_WEB",
        description="Looks up current factual information from external verified sources.",
        requires_confirmation=False,
        payload_model=dict
    )
}

class RealityAgentEngine:
    """
    Deterministic Agent with prompt-injection defense and confirmation enforcement.
    """

    def validate_tool_intent(self, tool_name: str, raw_payload: Dict[str, Any]) -> Dict[str, Any]:
        if tool_name not in TOOL_REGISTRY:
            raise ValueError(f"Unknown or unauthorized tool: {tool_name}")

        tool_def = TOOL_REGISTRY[tool_name]
        try:
            if tool_def.payload_model == dict:
                validated_payload = raw_payload
            else:
                validated_model = tool_def.payload_model(**raw_payload)
                validated_payload = validated_model.model_dump()
        except Exception as e:
            raise ValueError(f"Payload validation failed for {tool_name}: {str(e)}")

        return {
            "tool_name": tool_name,
            "requires_confirmation": tool_def.requires_confirmation,
            "validated_payload": validated_payload,
            "status": "PENDING_CONFIRMATION" if tool_def.requires_confirmation else "READY"
        }

agent_engine = RealityAgentEngine()
