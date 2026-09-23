from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.bidder import Bidder
from models.requirement import Requirement
from models.compliance_result import ComplianceResult
from services.compliance_engine import run_compliance_check, get_compliance_summary
from services.risk_engine import run_risk_detection

router = APIRouter(tags=["Compliance"])


@router.get("/api/bidders/{bidder_id}/compliance")
def get_bidder_compliance(bidder_id: int, db: Session = Depends(get_db)):
    bidder = db.query(Bidder).filter(Bidder.id == bidder_id).first()
    if not bidder:
        raise HTTPException(status_code=404, detail="Bidder not found")

    results = db.query(ComplianceResult).filter(
        ComplianceResult.bidder_id == bidder_id
    ).all()

    # Enrich with requirement names
    enriched = []
    for r in results:
        req = db.query(Requirement).filter(Requirement.id == r.requirement_id).first()
        enriched.append({
            "id": r.id,
            "requirement_id": r.requirement_id,
            "requirement_name": req.name if req else "Unknown",
            "mandatory": req.mandatory if req else True,
            "expected_document_type": req.expected_document_type if req else None,
            "status": r.status,
            "reason": r.reason,
            "evidence": r.evidence,
            "created_at": r.created_at.isoformat()
        })

    return {
        "bidder_id": bidder_id,
        "company_name": bidder.company_name,
        "summary": get_compliance_summary(bidder_id, db),
        "results": enriched
    }


@router.get("/api/tenders/{tender_id}/compliance")
def get_tender_compliance(tender_id: int, db: Session = Depends(get_db)):
    """Get compliance overview for all bidders in a tender."""
    bidders = db.query(Bidder).filter(Bidder.tender_id == tender_id).all()
    result = []
    for bidder in bidders:
        result.append({
            "bidder_id": bidder.id,
            "company_name": bidder.company_name,
            "summary": get_compliance_summary(bidder.id, db)
        })
    return result


@router.post("/api/tenders/{tender_id}/bidders/{bidder_id}/run-compliance")
def trigger_compliance(tender_id: int, bidder_id: int, db: Session = Depends(get_db)):
    """Run compliance check and risk detection for a specific bidder."""
    bidder = db.query(Bidder).filter(Bidder.id == bidder_id, Bidder.tender_id == tender_id).first()
    if not bidder:
        raise HTTPException(status_code=404, detail="Bidder not found in this tender")

    compliance_results = run_compliance_check(bidder_id, tender_id, db)
    risk_results = run_risk_detection(bidder_id, tender_id, db)

    return {
        "message": "Compliance and risk check completed",
        "compliance_results": len(compliance_results),
        "risk_signals": len(risk_results)
    }


@router.post("/api/compliance/recheck/{bidder_id}")
@router.post("/api/bidders/{bidder_id}/recheck-compliance")
def recheck_compliance(bidder_id: int, db: Session = Depends(get_db)):
    """Re-run compliance evaluation and risk detection for a bidder using its registered tender."""
    bidder = db.query(Bidder).filter(Bidder.id == bidder_id).first()
    if not bidder:
        raise HTTPException(status_code=404, detail="Bidder not found")

    compliance_results = run_compliance_check(bidder.id, bidder.tender_id, db)
    risk_results = run_risk_detection(bidder.id, bidder.tender_id, db)

    return {
        "message": "Compliance and risk recheck completed",
        "bidder_id": bidder.id,
        "tender_id": bidder.tender_id,
        "compliance_results": len(compliance_results),
        "risk_signals": len(risk_results),
        "summary": get_compliance_summary(bidder.id, db)
    }
