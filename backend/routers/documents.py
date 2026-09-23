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
def download_document(document_id: int, db: Session = Depends(get_db)):
    """Download/view the raw document file."""
    from fastapi.responses import FileResponse
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc or not doc.file_path or not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="Document file not found on disk")
    return FileResponse(
        path=doc.file_path,
        filename=doc.file_name,
        media_type="application/octet-stream"
    )
