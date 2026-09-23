from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class ChatSource(BaseModel):
    type: str  # tender, bidder, document, compliance, risk, relationship
    id: Optional[int | str] = None
    label: str
    snippet: Optional[str] = None


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, description="Officer query or command")
    tender_id: Optional[int] = Field(None, description="Active tender context ID")
    bidder_id: Optional[int] = Field(None, description="Active bidder context ID")
    session_id: Optional[str] = Field(None, description="Session ID for continuous conversation memory")


class ChatResponse(BaseModel):
    answer: str
    session_id: str
    sources: List[ChatSource] = []
    timestamp: str
    model_used: str
    quick_suggestions: List[str] = []


class QuickAction(BaseModel):
    id: str
    label: str
    prompt: str
    category: str
