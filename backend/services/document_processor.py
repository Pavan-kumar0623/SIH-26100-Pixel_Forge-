"""
Document Processing Pipeline — main orchestrator.

Flow:
1. File validation
2. Text extraction (PyMuPDF → Tesseract.js OCR worker if needed)
3. Gemini classification
4. Gemini structured extraction
5. Pydantic validation
6. Store extracted fields
7. Update bidder intelligence
8. Trigger compliance + risk updates
"""
import os
import shutil
from pathlib import Path
from sqlalchemy.orm import Session
from models.document import Document
from models.extracted_field import ExtractedField
from models.bidder import Bidder
from services.ocr_service import extract_text
from services.gemini_service import classify_document, extract_structured_data
from services.validation_service import validate_extracted_data
from config import get_settings

settings = get_settings()

ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg"}
MAX_SIZE_BYTES = settings.max_upload_size_mb * 1024 * 1024


def validate_file(file_path: str, file_name: str) -> tuple[bool, str]:
    """Validate file extension and size."""
    ext = Path(file_name).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        return False, f"Unsupported file format: {ext}. Allowed: PDF, PNG, JPG, JPEG"
    size = os.path.getsize(file_path)
    if size > MAX_SIZE_BYTES:
        return False, f"File too large: {size / (1024*1024):.1f}MB. Max: {settings.max_upload_size_mb}MB"
    return True, "OK"


def save_uploaded_file(file_bytes: bytes, file_name: str, tender_id: int, bidder_id: int) -> str:
    """Save file to local uploads directory and return file path."""
    import re
    safe_name = re.sub(r"[^\w\-_. ]", "_", file_name)
    upload_dir = Path(settings.upload_dir) / f"tender_{tender_id:03d}" / f"bidder_{bidder_id:03d}"
    upload_dir.mkdir(parents=True, exist_ok=True)
    file_path = upload_dir / safe_name
    # Handle duplicate names
    counter = 1
    while file_path.exists():
        stem = Path(safe_name).stem
        suffix = Path(safe_name).suffix
        file_path = upload_dir / f"{stem}_{counter}{suffix}"
        counter += 1
    with open(file_path, "wb") as f:
        f.write(file_bytes)
    return str(file_path)


def process_document(document_id: int, db: Session) -> dict:
    """
    Main pipeline: process a document through OCR → Gemini → Validation → Storage.
    Updates document status throughout.
    """
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        return {"error": "Document not found"}

    # Update status to PROCESSING
    doc.status = "PROCESSING"
    db.commit()

    try:
        # ── Step 1: Validate file ───────────────────────────────────────────
        valid, reason = validate_file(doc.file_path, doc.file_name)
        if not valid:
            doc.status = "FAILED"
            db.commit()
            return {"error": reason, "status": "FAILED"}

        # ── Step 2: Extract Text ────────────────────────────────────────────
        extraction_result = extract_text(doc.file_path)
        raw_text = extraction_result.get("text", "")
        ocr_used = extraction_result.get("ocr_used", False)
        doc.ocr_used = str(ocr_used).lower()
        extraction_method = extraction_result.get("method", "")

        # Only hard-fail if extraction completely errored AND we have no text at all
        if not raw_text and extraction_method in ("failed", "unsupported_format"):
            doc.status = "FAILED"
            doc.document_type = "UNKNOWN"
            db.commit()
            return {"error": extraction_result.get("error", "Unable to extract readable text"), "status": "FAILED"}

        # If text is very short (scanned doc without Tesseract), still try keyword classification
        if not raw_text:
            raw_text = f"[MINIMAL TEXT] {extraction_result.get('note', '')} filename:{doc.file_name}"

        # ── Step 3: Gemini Classification ───────────────────────────────────
        classification = classify_document(raw_text)
        doc.document_type = classification.get("document_type", "UNKNOWN")
        doc.classification_confidence = classification.get("confidence", 0.0)
        doc.is_supported = str(classification.get("is_supported", False)).lower()

        if not classification.get("is_supported", False):
            doc.status = "UNSUPPORTED"
            db.commit()
            return {
                "status": "UNSUPPORTED",
                "document_type": doc.document_type,
                "message": "Document type not supported for procurement processing"
            }

        # ── Step 4: Gemini Structured Extraction ────────────────────────────
        extracted_data = extract_structured_data(raw_text, doc.document_type)

        if extracted_data.get("extraction_failed"):
            doc.status = "NEEDS_REVIEW"
            db.commit()
            return {
                "status": "NEEDS_REVIEW",
                "document_type": doc.document_type,
                "message": "AI extraction encountered an error",
                "error": extracted_data.get("error")
            }

        # Attach confidence for downstream validators
        extracted_data["_confidence"] = classification.get("confidence", 0.85)

        # ── Step 5: Pydantic Validation ─────────────────────────────────────
        validated_fields = validate_extracted_data(doc.document_type, extracted_data)

        # ── Step 6: Store Extracted Fields ──────────────────────────────────
        # Clear old fields first (reprocessing)
        db.query(ExtractedField).filter(ExtractedField.document_id == doc.id).delete()

        has_low_confidence = False
        for field in validated_fields:
            if field.get("field_value") is None:
                continue
            ef = ExtractedField(
                document_id=doc.id,
                field_name=field["field_name"],
                field_value=str(field.get("field_value", "")),
                confidence=field.get("confidence", 0.0),
                page_number=1,
                evidence=_build_evidence(field, doc.file_name),
                validation_status=field.get("validation_status", "PENDING"),
                validation_message=field.get("validation_message", "")
            )
            db.add(ef)
            if field.get("confidence", 1.0) < 0.75:
                has_low_confidence = True

        # ── Step 7: Update Bidder Intelligence ──────────────────────────────
        _update_bidder_intelligence(doc.bidder_id, doc.document_type, extracted_data, db)

        has_invalid_or_expired = any(field.get("validation_status") in ["INVALID", "EXPIRED"] for field in validated_fields)
        doc.status = "NEEDS_REVIEW" if (has_low_confidence or has_invalid_or_expired) else "PROCESSED"
        db.commit()

        # ── Step 8: Re-evaluate Compliance & Risk Engines ───────────────────
        try:
            bidder = db.query(Bidder).filter(Bidder.id == doc.bidder_id).first()
            if bidder:
                import logging as _log
                _logger = _log.getLogger("procure_ai.doc_processor")
                from services.compliance_engine import run_compliance_check
                from services.risk_engine import run_risk_detection
                run_compliance_check(bidder.id, bidder.tender_id, db)
                run_risk_detection(bidder.id, bidder.tender_id, db)
        except Exception as engine_err:
            import logging as _log
            _log.getLogger("procure_ai.doc_processor").warning(f"Post-processing engine error: {engine_err}")

        return {
            "status": doc.status,
            "document_type": doc.document_type,
            "fields_extracted": len(validated_fields),
            "ocr_used": ocr_used,
            "classification_confidence": doc.classification_confidence
        }

    except Exception as e:
        doc.status = "FAILED"
        db.commit()
        return {"error": str(e), "status": "FAILED"}


def _build_evidence(field: dict, file_name: str) -> str:
    """Build a human-readable evidence string for a field."""
    return f'Source: {file_name} | Field: {field["field_name"]} | Value: {field.get("field_value")} | {field.get("validation_message", "")}'


def _update_bidder_intelligence(bidder_id: int, document_type: str, data: dict, db: Session):
    """Update bidder profile fields from verified document data."""
    bidder = db.query(Bidder).filter(Bidder.id == bidder_id).first()
    if not bidder:
        return

    updated = False
    
    # Update company name if detected in document
    extracted_company = (
        data.get("company_name")
        or data.get("legal_name")
        or data.get("trade_name")
        or data.get("enterprise_name")
        or (data.get("name") if document_type in ["PAN_CARD", "GST_CERTIFICATE"] else None)
    )
    if extracted_company and str(extracted_company).strip() and len(str(extracted_company).strip()) > 2:
        bidder.company_name = str(extracted_company).strip()
        updated = True

    if document_type == "GST_CERTIFICATE":
        if data.get("gstin"):
            bidder.gstin = data["gstin"]
            updated = True
        if data.get("registered_address"):
            bidder.registered_address = data["registered_address"]
            updated = True
    elif document_type == "PAN_CARD":
        if data.get("pan"):
            bidder.pan = data["pan"]
            updated = True
    elif document_type == "UDYAM_CERTIFICATE":
        if data.get("udyam_number"):
            bidder.udyam_number = data["udyam_number"]
            updated = True
        if data.get("address") and not bidder.registered_address:
            bidder.registered_address = data["address"]
            updated = True
    elif document_type == "INCORPORATION_CERTIFICATE":
        if data.get("cin"):
            bidder.cin = data["cin"]
            updated = True
        if data.get("incorporation_date"):
            bidder.incorporation_date = data["incorporation_date"]
            updated = True
        if data.get("registered_address"):
            bidder.registered_address = data["registered_address"]
            updated = True

    if updated:
        db.commit()
        db.refresh(bidder)
