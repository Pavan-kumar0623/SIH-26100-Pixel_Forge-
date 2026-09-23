"""
ProcureAI — Chatbot API Router
Endpoints for officer assistant chat, session management, and quick prompts.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from schemas.chatbot import ChatRequest, ChatResponse, QuickAction
from services.chatbot_context_service import gather_procurement_context
from services.chatbot_service import ask_procure_chatbot, clear_session, get_quick_actions

router = APIRouter(prefix="/api/chatbot", tags=["Chatbot"])


@router.post("/chat", response_model=ChatResponse)
async def chat_with_assistant(
    request: ChatRequest,
    db: Session = Depends(get_db)
):
    """
    Send an inquiry to the Grok procurement intelligence assistant.
    Retrieves real-time context from the database and grounds the answer.
    """
    try:
        context_str, sources = gather_procurement_context(
            db=db,
            message=request.message,
            tender_id=request.tender_id,
            bidder_id=request.bidder_id
        )

        response = await ask_procure_chatbot(
            message=request.message,
            context=context_str,
            sources=sources,
            session_id=request.session_id
        )
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ProcureAI Assistant error: {str(e)}")


@router.get("/quick-actions", response_model=List[QuickAction])
def get_prompts():
    """Retrieve pre-built prompt actions for procurement officers."""
    return get_quick_actions()


@router.delete("/sessions/{session_id}")
def reset_session(session_id: str):
    """Clear memory history for a given chat session."""
    cleared = clear_session(session_id)
    return {"session_id": session_id, "cleared": cleared}
