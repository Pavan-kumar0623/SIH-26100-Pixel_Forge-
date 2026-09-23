"""
Comparison Service
Generates multi-bidder comparison matrix from live DB data.
No hardcoded results — everything from database.
"""
from sqlalchemy.orm import Session
from models.bidder import Bidder
from models.requirement import Requirement
from models.compliance_result import ComplianceResult
from models.risk_signal import RiskSignal
from models.document import Document


def generate_comparison(tender_id: int, bidder_ids: list, db: Session) -> dict:
    """
    Generate comparison matrix for selected bidders against tender requirements.
    """
    # Load tender requirements
    requirements = db.query(Requirement).filter(Requirement.tender_id == tender_id).all()

    # Load bidders
    bidders = db.query(Bidder).filter(
        Bidder.id.in_(bidder_ids),
        Bidder.tender_id == tender_id
    ).all()

    if not bidders:
        return {"error": "No bidders found"}

    # Build comparison matrix
    comparison_matrix = []
    for req in requirements:
        row = {
            "requirement_id": req.id,
            "requirement_name": req.name,
            "mandatory": req.mandatory,
            "expected_document_type": req.expected_document_type,
            "bidder_results": {}
        }
        for bidder in bidders:
            result = db.query(ComplianceResult).filter(
                ComplianceResult.bidder_id == bidder.id,
                ComplianceResult.requirement_id == req.id
            ).first()
            row["bidder_results"][bidder.id] = {
                "bidder_name": bidder.company_name,
                "status": result.status if result else "MISSING",
                "reason": result.reason if result else "No compliance check run",
                "evidence": result.evidence if result else None
            }
        comparison_matrix.append(row)

    # Build per-bidder summary
    bidder_summaries = []
    for bidder in bidders:
        docs = db.query(Document).filter(Document.bidder_id == bidder.id).all()
        risks = db.query(RiskSignal).filter(RiskSignal.bidder_id == bidder.id).all()
        compliance_results = db.query(ComplianceResult).filter(
            ComplianceResult.bidder_id == bidder.id
        ).all()

        verified = sum(1 for r in compliance_results if r.status == "VERIFIED")
        missing = sum(1 for r in compliance_results if r.status == "MISSING")
        review = sum(1 for r in compliance_results if r.status == "REVIEW")

        high_risks = sum(1 for r in risks if r.severity == "HIGH" and r.status == "OPEN")
        medium_risks = sum(1 for r in risks if r.severity == "MEDIUM" and r.status == "OPEN")
        low_risks = sum(1 for r in risks if r.severity == "LOW" and r.status == "OPEN")

        relationship_signals = sum(1 for r in risks if r.risk_type in [
            "SHARED_IDENTIFIER", "SHARED_ADDRESS", "SHARED_DIRECTOR"
        ])

        total_reqs = len(requirements)
        compliance_score = round((verified / total_reqs * 100) if total_reqs > 0 else 0, 1)

        # Determine overall category
        if missing > 0 or high_risks > 0:
            category = "CRITICAL_ATTENTION"
        elif review > 0 or medium_risks > 0:
            category = "REQUIRES_REVIEW"
        else:
            category = "NO_SIGNIFICANT_ISSUE"

        bidder_summaries.append({
            "bidder_id": bidder.id,
            "company_name": bidder.company_name,
            "gstin": bidder.gstin,
            "pan": bidder.pan,
            "industry": bidder.industry,
            "documents_uploaded": len(docs),
            "documents_processed": sum(1 for d in docs if d.status == "PROCESSED"),
            "compliance_score": compliance_score,
            "verified_count": verified,
            "missing_count": missing,
            "review_count": review,
            "high_risks": high_risks,
            "medium_risks": medium_risks,
            "low_risks": low_risks,
            "total_risks": len(risks),
            "relationship_signals": relationship_signals,
            "category": category
        })

    return {
        "tender_id": tender_id,
        "requirements": [{"id": r.id, "name": r.name, "mandatory": r.mandatory} for r in requirements],
        "bidders": bidder_summaries,
        "comparison_matrix": comparison_matrix
    }
