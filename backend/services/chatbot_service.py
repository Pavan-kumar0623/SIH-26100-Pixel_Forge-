"""
ProcureAI — Chatbot Service (Grok / xAI Integration)
Dedicated Conversational Intelligence Assistant for Procurement Officers.
Provides context-aware analysis of tenders, bidder risks, compliance gaps, and document anomalies.
"""
import uuid
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
import httpx

from config import get_settings
from schemas.chatbot import ChatResponse, ChatSource, QuickAction

logger = logging.getLogger("procure_ai.chatbot")
settings = get_settings()

# In-memory session store: session_id -> list of {"role": "...", "content": "..."}
_SESSION_MEMORY: Dict[str, List[Dict[str, str]]] = {}
MAX_SESSION_MESSAGES = 12

SYSTEM_PROMPT = """You are ProcureAI Assistant, an elite procurement intelligence advisor powered by Grok (xAI).
You assist procurement officers, tender evaluation committees, and vigilance officers in evaluating public and enterprise tenders.

CORE PRINCIPLES:
1. ALWAYS ground your findings in the provided database context. Cite specific bidder names, GSTINs, requirement codes, and risk signals.
2. Maintain strict impartiality and neutral regulatory tone. Do not accuse; state observed facts (e.g., "The system flagged a shared address between Bidder A and Bidder B" rather than "Bidder A is committing fraud").
3. When analyzing compliance, differentiate clearly between VERIFIED, REQUIRES REVIEW, and MISSING requirements.
4. Highlight any high-severity risk signals (such as shell company indicators, common directors, address overlaps, or bid rigging patterns).
5. If the user asks for recommendations, provide structured, actionable procurement next steps (e.g., "Request original GST challan", "Issue clarification under Clause 4.2", "Refer to Vigilance Division").
6. Be concise, well-structured, using bullet points and bold headers for clarity.
"""


def get_quick_actions() -> List[QuickAction]:
    """Return recommended quick actions for procurement officers."""
    return [
        QuickAction(
            id="summary",
            label="Summarize Tender Evaluation",
            prompt="Provide an executive summary of this tender, including total bidders, compliance rate, and key risks.",
            category="Overview"
        ),
        QuickAction(
            id="high_risk",
            label="Flag High-Risk Bidders",
            prompt="Which bidders have HIGH severity risk signals, and what evidence was detected?",
            category="Risk"
        ),
        QuickAction(
            id="compliance_gaps",
            label="Audit Compliance Gaps",
            prompt="List all mandatory requirements that have MISSING or REVIEW status across participating bidders.",
            category="Compliance"
        ),
        QuickAction(
            id="collusion_check",
            label="Inspect Cartelization & Ties",
            prompt="Are there any cross-bidder relationships, common directors, or shared addresses among the bidders?",
            category="Vigilance"
        ),
        QuickAction(
            id="recommendation",
            label="Award Recommendation Readiness",
            prompt="Based on the compliance matrix and risk profiles, which bidders are eligible for commercial evaluation?",
            category="Decision"
        )
    ]


def clear_session(session_id: str) -> bool:
    """Clear memory for a given session."""
    if session_id in _SESSION_MEMORY:
        del _SESSION_MEMORY[session_id]
        return True
    return False


async def ask_procure_chatbot(
    message: str,
    context: str,
    sources: List[ChatSource],
    session_id: Optional[str] = None
) -> ChatResponse:
    """
    Send prompt + procurement context + conversation history to Grok (xAI) API.
    Falls back gracefully to intelligent local procurement rule-base if xAI key is not set.
    """
    if not session_id:
        session_id = str(uuid.uuid4())

    if session_id not in _SESSION_MEMORY:
        _SESSION_MEMORY[session_id] = []

    history = _SESSION_MEMORY[session_id]

    # Check if xAI API key is available
    xai_key = settings.active_xai_key
    has_valid_key = bool(xai_key and xai_key != "your_xai_api_key_here" and len(xai_key) > 5)

    answer = ""
    model_used = settings.grok_model

    if has_valid_key:
        try:
            # Build conversation payload
            messages_payload = [{"role": "system", "content": SYSTEM_PROMPT}]
            
            # Grounding context message
            if context.strip():
                messages_payload.append({
                    "role": "system",
                    "content": f"CURRENT PROCUREMENT DATABASE CONTEXT:\n{context}"
                })

            # Append past turns
            for turn in history[-MAX_SESSION_MESSAGES:]:
                messages_payload.append(turn)

            # Append current user prompt
            messages_payload.append({"role": "user", "content": message})

            url = f"{settings.grok_api_base_url.rstrip('/')}/chat/completions"
            headers = {
                "Authorization": f"Bearer {xai_key}",
                "Content-Type": "application/json"
            }
            body = {
                "model": settings.grok_model,
                "messages": messages_payload,
                "temperature": 0.2,
                "max_tokens": 1200
            }

            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(url, headers=headers, json=body)
                resp.raise_for_status()
                data = resp.json()
                answer = data["choices"][0]["message"]["content"]
                model_used = data.get("model", settings.grok_model)

        except Exception as e:
            logger.warning(f"Grok API call failed or timed out ({e}). Falling back to local intelligence.")
            answer = _generate_local_intelligence_response(message, context, sources)
            model_used = "procure-ai-local-rules (Grok fallback)"
    else:
        # Local procurement analyst fallback
        answer = _generate_local_intelligence_response(message, context, sources)
        model_used = "procure-ai-local-grounded (Configure XAI_API_KEY for Grok live)"

    # Update session memory
    history.append({"role": "user", "content": message})
    history.append({"role": "assistant", "content": answer})
    if len(history) > MAX_SESSION_MESSAGES * 2:
        _SESSION_MEMORY[session_id] = history[-MAX_SESSION_MESSAGES * 2:]

    now_iso = datetime.now(timezone.utc).isoformat()

    suggestions = [
        "Which bidder has the highest compliance rate?",
        "Explain the high risk flags detected.",
        "Generate a comparative summary for committee review."
    ]

    return ChatResponse(
        answer=answer,
        session_id=session_id,
        sources=sources,
        timestamp=now_iso,
        model_used=model_used,
        quick_suggestions=suggestions
    )


def _generate_local_intelligence_response(query: str, context: str, sources: List[ChatSource]) -> str:
    """
    Intelligent local procurement rule-base response generator when external API is offline.
    Uses exact context to compile precise, professional procurement advisory notes.
    """
    q_lower = query.lower()

    if not context.strip():
        return (
            "**ProcureAI Assistant (Grounding Active)**\n\n"
            "I am ready to assist you. Currently, no active tender or bidder is selected. "
            "Please select a Tender from the top selector or navigate to a Bidder's dossier, "
            "and I will analyze the compliance scores, submitted documents, and risk indicators for you."
        )

    # 1. High risk queries
    if any(k in q_lower for k in ["risk", "red flag", "flag", "warning", "cartel", "collusion", "shell"]):
        lines = [
            "### 🛡️ Risk & Vigilance Intelligence Report\n",
            "Based on live extraction and risk engine evaluations in the database:\n"
        ]
        risk_sources = [s for s in sources if s.type == "risk"]
        if risk_sources:
            for s in risk_sources:
                lines.append(f"- **{s.label}**: {s.snippet}")
            lines.append("\n**Actionable Vigilance Recommendation:**")
            lines.append("1. Place flagged bidders under enhanced scrutiny prior to commercial opening.")
            lines.append("2. Issue formal clarification requests requiring notarized affidavits for questioned disclosures.")
        else:
            lines.append("No active HIGH severity risk signals were detected in the current scope.")
        return "\n".join(lines)

    # 2. Compliance queries
    if any(k in q_lower for k in ["compliance", "mandatory", "requirement", "verify", "eligibility"]):
        lines = [
            "### 📋 Technical & Regulatory Compliance Assessment\n",
            "Here is the evaluation breakdown derived from submitted bidder documents:\n"
        ]
        # Extract compliance lines from context
        comp_lines = [l for l in context.split("\n") if "Compliance:" in l or "Requirement" in l or "STATUS =" in l]
        if comp_lines:
            for l in comp_lines[:8]:
                lines.append(f"{l}")
        else:
            lines.append("Detailed compliance metrics are actively linked. Check the Compliance Matrix tab for the complete line-by-line verification.")
        lines.append("\n**Procurement Officer Advisory:**")
        lines.append("Ensure all *Mandatory* requirements are strictly `VERIFIED` before qualifying bidders for commercial bid opening.")
        return "\n".join(lines)

    # 3. Summary / Overview queries
    if any(k in q_lower for k in ["summary", "overview", "status", "report", "evaluate"]):
        lines = [
            "### 📊 Tender Evaluation Executive Summary\n",
            "Contextual intelligence synthesized from system records:\n"
        ]
        # Include top tender overview
        for line in context.split("\n")[:12]:
            if line.strip():
                lines.append(line)
        lines.append("\n**Next Recommended Steps:**")
        lines.append("- Review unverified documents under the Document Explorer.")
        lines.append("- Inspect the Bidder Comparison Matrix to contrast technical turnover and experience.")
        return "\n".join(lines)

    # Default contextual response
    return (
        f"### 📑 Procurement Intelligence Dossier\n\n"
        f"In response to your query: *\"{query}\"*\n\n"
        f"**Relevant Database Records:**\n"
        f"{context[:800]}...\n\n"
        f"*ProcureAI Officer Note:* All information shown above is retrieved from active database records. "
        f"To unlock full generative synthesis with Grok, ensure `XAI_API_KEY` is configured in your backend `.env` file."
    )
