"""
ProcureAI — FastAPI Backend
AI-powered procurement platform for document processing, compliance checking, risk analysis, and officer assistance.
"""
import os
import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from sqlalchemy.orm import Session
from sqlalchemy import text

from database import init_db, get_db
from config import get_settings
from services.ocr_service import get_tesseract_status
from routers import (
    tenders,
    requirements,
    bidders,
    documents,
    compliance,
    risk,
    graph,
    compare,
    export,
    chatbot
)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    init_db()
    os.makedirs(settings.upload_dir, exist_ok=True)
    tess_status = get_tesseract_status()
    has_gemini = bool(settings.active_gemini_key and settings.active_gemini_key != "your_gemini_api_key_here")
    has_xai = bool(settings.active_xai_key and settings.active_xai_key != "your_xai_api_key_here")

    print("=" * 60)
    print("  ProcureAI Enterprise Backend v1.0.0 Starting Up")
    print("=" * 60)
    print(f"  Database:        {settings.database_url}")
    print(f"  Upload Dir:      {settings.upload_dir}")
    print(f"  Gemini Engine:   {'READY (Configured)' if has_gemini else 'NOT CONFIGURED (Using Rule-based fallback)'}")
    print(f"  Grok Assistant:  {'READY (Configured)' if has_xai else 'NOT CONFIGURED (Using Grounded DB fallback)'}")
    print(f"  Tesseract OCR:   {tess_status.get('status', 'unknown').upper()} - {tess_status.get('message', '')}")
    print("=" * 60)
    yield
    # Shutdown
    print("ProcureAI backend shutting down")


app = FastAPI(
    title="ProcureAI Enterprise Platform",
    description="Comprehensive AI platform for tender document processing, compliance checking, risk analysis, and conversational intelligence.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS — allow React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(tenders.router)
app.include_router(requirements.router)
app.include_router(bidders.router)
app.include_router(documents.router)
app.include_router(compliance.router)
app.include_router(risk.router)
app.include_router(graph.router)
app.include_router(compare.router)
app.include_router(export.router)
app.include_router(chatbot.router)


@app.get("/")
def root():
    return {
        "name": "ProcureAI Enterprise Platform",
        "version": "1.0.0",
        "status": "operational",
        "docs": "/docs",
        "modules": [
            "Tenders & Requirements",
            "Bidders & Intelligence Dossier",
            "Document Processing & Evidence Extraction",
            "Regulatory Compliance Engine",
            "Procurement Vigilance & Risk Engine",
            "Entity Relationship Network Graph",
            "Comparative Evaluation Matrix",
            "Reporting & Export (Excel / CSV)",
            "Grok Procurement Officer Chatbot"
        ]
    }


@app.get("/health")
def health(db: Session = Depends(get_db)):
    """Comprehensive system health and diagnostics endpoint."""
    tess = get_tesseract_status()
    has_gemini = bool(settings.active_gemini_key and settings.active_gemini_key != "your_gemini_api_key_here")
    has_xai = bool(settings.active_xai_key and settings.active_xai_key != "your_xai_api_key_here")

    # DB connection check
    db_ok = False
    tender_count = 0
    bidder_count = 0
    try:
        from models.tender import Tender
        from models.bidder import Bidder
        tender_count = db.query(Tender).count()
        bidder_count = db.query(Bidder).count()
        db_ok = True
    except Exception as e:
        db_error = str(e)

    return {
        "status": "healthy" if db_ok else "degraded",
        "components": {
            "database": {
                "status": "connected" if db_ok else "error",
                "tender_count": tender_count,
                "bidder_count": bidder_count
            },
            "gemini_document_ai": {
                "status": "configured" if has_gemini else "fallback_mode",
                "model": "gemini-1.5-flash",
                "configured": has_gemini
            },
            "grok_procurement_assistant": {
                "status": "configured" if has_xai else "fallback_mode",
                "model": settings.grok_model,
                "configured": has_xai
            },
            "tesseract_ocr": tess
        }
    }
