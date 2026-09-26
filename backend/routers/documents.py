import os
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models.document import Document
from models.bidder import Bidder
from models.extracted_field import ExtractedField
from schemas.document import DocumentResponse, ExtractedFieldResponse
from services.document_processor import save_uploaded_file, process_document, validate_file
from config import get_settings
import tempfile

settings = get_settings()
router = APIRouter(tags=["Documents"])


@router.post("/api/bidders/{bidder_id}/documents")
async def upload_document(
    bidder_id: int,
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db)
):
    """Upload a document for a bidder. Processing starts immediately in the background."""
    bidder = db.query(Bidder).filter(Bidder.id == bidder_id).first()
    if not bidder:
        raise HTTPException(status_code=404, detail="Bidder not found")

    # Read file content
    file_bytes = await file.read()

    # Quick extension check before saving
    from pathlib import Path
    ext = Path(file.filename).suffix.lower()
    allowed = {".pdf", ".png", ".jpg", ".jpeg"}
    if ext not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format: {ext}. Allowed: PDF, PNG, JPG, JPEG"
        )

    # Check size
    max_bytes = settings.max_upload_size_mb * 1024 * 1024
    if len(file_bytes) > max_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Max size: {settings.max_upload_size_mb}MB"
        )

    # Save file
    file_path = save_uploaded_file(file_bytes, file.filename, bidder.tender_id, bidder_id)

    # Create document record
    doc = Document(
        bidder_id=bidder_id,
        file_name=file.filename,
        file_path=file_path,
        status="UPLOADED"
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    # Process in background
    doc_id = doc.id
    background_tasks.add_task(_process_document_task, doc_id)

    return {
        "id": doc.id,
        "file_name": doc.file_name,
        "status": "UPLOADED",
        "message": "Document uploaded successfully. Processing started."
    }


def _process_document_task(document_id: int):
    """Background task for document processing."""
    from database import SessionLocal
    db = SessionLocal()
    try:
        process_document(document_id, db)
    finally:
        db.close()


@router.post("/api/documents/{document_id}/process")
def trigger_processing(document_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Manually trigger/re-trigger processing for a document."""
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    background_tasks.add_task(_process_document_task, document_id)
    return {"message": "Processing started", "document_id": document_id}


@router.get("/api/documents/{document_id}", response_model=DocumentResponse)
def get_document(document_id: int, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


@router.get("/api/bidders/{bidder_id}/documents", response_model=List[DocumentResponse])
def get_bidder_documents(bidder_id: int, db: Session = Depends(get_db)):
    """List all documents for a specific bidder."""
    bidder = db.query(Bidder).filter(Bidder.id == bidder_id).first()
    if not bidder:
        raise HTTPException(status_code=404, detail="Bidder not found")
    docs = db.query(Document).filter(Document.bidder_id == bidder_id).all()
    return docs


@router.get("/api/documents/{document_id}/evidence")
def get_document_evidence(document_id: int, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    fields = db.query(ExtractedField).filter(ExtractedField.document_id == document_id).all()
    return {
        "document_id": document_id,
        "file_name": doc.file_name,
        "document_type": doc.document_type,
        "status": doc.status,
        "classification_confidence": doc.classification_confidence,
        "ocr_used": doc.ocr_used,
        "fields": [
            {
                "id": f.id,
                "field_name": f.field_name,
                "field_value": f.field_value,
                "confidence": f.confidence,
                "page_number": f.page_number,
                "evidence": f.evidence,
                "validation_status": f.validation_status,
                "validation_message": f.validation_message
            }
            for f in fields
        ]
    }


@router.get("/api/documents/{document_id}/download")
def download_document(document_id: int, inline: bool = True, db: Session = Depends(get_db)):
    """Download/view the document file with proper MIME type and inline header."""
    from fastapi.responses import FileResponse, Response
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc or not doc.file_path or not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="Document file not found on disk")

    ext = os.path.splitext(doc.file_name)[1].lower()
    media_types = {
        ".pdf": "application/pdf",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".txt": "text/plain",
    }
    media_type = media_types.get(ext, "application/octet-stream")

    # If it's a seeded mock file (text saved with .pdf extension), render a styled HTML preview card
    if ext == ".pdf":
        try:
            with open(doc.file_path, "rb") as f:
                header = f.read(5)
            if header != b"%PDF-":
                with open(doc.file_path, "r", encoding="utf-8", errors="ignore") as f:
                    txt = f.read()
                html = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>{doc.file_name}</title>
<style>
body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace; background: #0b0f19; color: #f1f5f9; padding: 2rem; margin: 0; }}
.card {{ background: #111827; border: 1px solid #1e293b; border-radius: 8px; padding: 2rem; max-width: 600px; margin: 2rem auto; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5); }}
h2 {{ color: #e2e8f0; margin-top: 0; font-size: 1.1rem; display: flex; align-items: center; gap: 8px; }}
.badge {{ background: rgba(99, 102, 241, 0.2); color: #c0c1ff; border: 1px solid rgba(99, 102, 241, 0.4); padding: 0.25rem 0.6rem; border-radius: 4px; font-size: 0.75rem; font-weight: bold; text-transform: uppercase; }}
.content {{ margin-top: 1.5rem; padding: 1.25rem; background: #0b0f19; border: 1px solid #1e293b; border-radius: 6px; color: #cbd5e1; font-size: 0.95rem; line-height: 1.6; white-space: pre-wrap; font-family: monospace; }}
.info {{ margin-top: 1.5rem; font-size: 0.75rem; color: #64748b; border-top: 1px solid #1e293b; padding-top: 1rem; }}
</style>
</head>
<body>
<div class="card">
  <h2>📄 {doc.file_name}</h2>
  <span class="badge">{doc.document_type or 'MOCK DOCUMENT'}</span>
  <div class="content">{txt}</div>
  <div class="info">💡 This is a seeded demonstration document record. Upload a real PDF or image above to test live PyMuPDF & OCR extraction!</div>
</div>
</body>
</html>"""
                return Response(content=html, media_type="text/html")
        except Exception:
            pass

    disposition = "inline" if inline else "attachment"
    ascii_filename = "".join(c for c in doc.file_name if 32 <= ord(c) < 127 and c not in '"\\') or "document.pdf"
    return FileResponse(
        path=doc.file_path,
        filename=ascii_filename,
        media_type=media_type,
        content_disposition_type=disposition
    )
