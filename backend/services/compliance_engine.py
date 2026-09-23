"""
Compliance Engine
Checks bidder document evidence against tender requirements.
100% deterministic Python logic — no AI calls.
"""
from sqlalchemy.orm import Session
from models.compliance_result import ComplianceResult
from models.requirement import Requirement
from models.document import Document
from models.extracted_field import ExtractedField

COMPLIANCE_CONFIDENCE_THRESHOLD = 0.75

# Map requirement expected_document_type to document types
DOCUMENT_TYPE_MAP = {
    "GST_CERTIFICATE": ["GST_CERTIFICATE"],
    "PAN_CARD": ["PAN_CARD"],
    "UDYAM_CERTIFICATE": ["UDYAM_CERTIFICATE"],
    "INCORPORATION_CERTIFICATE": ["INCORPORATION_CERTIFICATE"],
    "EXPERIENCE_CERTIFICATE": ["EXPERIENCE_CERTIFICATE"],
    "OEM_AUTHORIZATION": ["OEM_AUTHORIZATION"],
    "TECHNICAL_DOCUMENT": ["TECHNICAL_DOCUMENT"],
    "FINANCIAL_DOCUMENT": ["FINANCIAL_DOCUMENT"],
}


def run_compliance_check(bidder_id: int, tender_id: int, db: Session) -> list:
    """
    Run full compliance check for a bidder against all tender requirements.
    Returns list of compliance result dicts.
    """
    requirements = db.query(Requirement).filter(Requirement.tender_id == tender_id).all()
    documents = db.query(Document).filter(Document.bidder_id == bidder_id).all()

    results = []
    for req in requirements:
        result = _check_single_requirement(req, documents, bidder_id, db)
        results.append(result)

        # Upsert compliance result in DB
        existing = db.query(ComplianceResult).filter(
            ComplianceResult.bidder_id == bidder_id,
            ComplianceResult.requirement_id == req.id
        ).first()

        if existing:
            existing.status = result["status"]
            existing.reason = result["reason"]
            existing.evidence = result["evidence"]
        else:
            cr = ComplianceResult(
                bidder_id=bidder_id,
                requirement_id=req.id,
                status=result["status"],
                reason=result["reason"],
                evidence=result["evidence"]
            )
            db.add(cr)

    db.commit()
    return results


def _check_single_requirement(req: Requirement, documents: list, bidder_id: int, db: Session) -> dict:
    """Check compliance for a single requirement."""
    expected_types = DOCUMENT_TYPE_MAP.get(req.expected_document_type, [req.expected_document_type]) if req.expected_document_type else []

    # Find matching processed documents
    matching_docs = [
        d for d in documents
        if d.document_type in expected_types and d.status in ["PROCESSED", "NEEDS_REVIEW"]
    ]

    if not matching_docs:
        # Check for unsupported / failed docs of that type
        failed_docs = [
            d for d in documents
            if d.document_type in expected_types and d.status in ["FAILED", "UNSUPPORTED"]
        ]
        if failed_docs:
            return {
                "requirement_id": req.id,
                "requirement_name": req.name,
                "mandatory": req.mandatory,
                "status": "REVIEW",
                "reason": f"Document uploaded but processing failed: {failed_docs[0].status}",
                "evidence": f"File: {failed_docs[0].file_name}"
            }

        status = "MISSING" if req.mandatory else "NOT_AVAILABLE"
        return {
            "requirement_id": req.id,
            "requirement_name": req.name,
            "mandatory": req.mandatory,
            "status": status,
            "reason": f"No {req.expected_document_type or req.name} document found",
            "evidence": None
        }

    # Pick best matching document
    best_doc = max(matching_docs, key=lambda d: d.classification_confidence or 0)

    # Get extracted fields for this document
    fields = db.query(ExtractedField).filter(ExtractedField.document_id == best_doc.id).all()

    # Check if any critical fields have INVALID or EXPIRED validation
    invalid_fields = [f for f in fields if f.validation_status in ["INVALID", "EXPIRED"]]
    low_confidence_fields = [f for f in fields if f.confidence < COMPLIANCE_CONFIDENCE_THRESHOLD]

    if invalid_fields:
        return {
            "requirement_id": req.id,
            "requirement_name": req.name,
            "mandatory": req.mandatory,
            "status": "REVIEW",
            "reason": f"Validation issues found: {', '.join([f.validation_message for f in invalid_fields[:2]])}",
            "evidence": f"{best_doc.file_name} | {', '.join([f'{f.field_name}: {f.field_value}' for f in fields[:3]])}"
        }

    if low_confidence_fields or best_doc.status == "NEEDS_REVIEW":
        return {
            "requirement_id": req.id,
            "requirement_name": req.name,
            "mandatory": req.mandatory,
            "status": "REVIEW",
            "reason": "Low confidence extraction — officer review recommended",
            "evidence": f"{best_doc.file_name} | Confidence: {best_doc.classification_confidence:.0%}"
        }

    # All good
    evidence_parts = [f"{f.field_name}: {f.field_value}" for f in fields if f.field_value][:4]
    return {
        "requirement_id": req.id,
        "requirement_name": req.name,
        "mandatory": req.mandatory,
        "status": "VERIFIED",
        "reason": f"{req.name} document verified successfully",
        "evidence": f"{best_doc.file_name} | {' | '.join(evidence_parts)}"
    }


def get_compliance_summary(bidder_id: int, db: Session) -> dict:
    """Get a compliance summary for a bidder."""
    results = db.query(ComplianceResult).filter(ComplianceResult.bidder_id == bidder_id).all()
    total = len(results)
    verified = sum(1 for r in results if r.status == "VERIFIED")
    missing = sum(1 for r in results if r.status == "MISSING")
    review = sum(1 for r in results if r.status == "REVIEW")
    return {
        "total": total,
        "verified": verified,
        "missing": missing,
        "review": review,
        "not_available": total - verified - missing - review,
        "compliance_score": round((verified / total * 100) if total > 0 else 0, 1)
    }


def evaluate_compliance(
    has_doc: bool,
    doc_status: str,
    extracted_fields: dict,
    validation_errors: list,
    is_expired: bool = False,
    mandatory: bool = True
) -> tuple[str, str]:
    """Pure helper function to evaluate compliance status and reason."""
    if not has_doc:
        return ("MISSING" if mandatory else "NOT_AVAILABLE", "Document not submitted")
    if is_expired:
        return ("REVIEW", "Document has expired")
    if validation_errors:
        return ("REVIEW", f"Validation errors: {', '.join(validation_errors)}")
    if doc_status in ["FAILED", "UNSUPPORTED"]:
        return ("REVIEW", f"Document processing failed: {doc_status}")
    if doc_status == "NEEDS_REVIEW":
        return ("REVIEW", "Requires manual review")
    return ("VERIFIED", "Document requirements satisfied")
