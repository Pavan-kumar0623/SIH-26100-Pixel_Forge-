from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.bidder import Bidder
from models.risk_signal import RiskSignal
from schemas.document import RiskSignalResponse, RiskStatusUpdate

router = APIRouter(tags=["Risk"])


@router.get("/api/bidders/{bidder_id}/risks")
def get_bidder_risks(bidder_id: int, db: Session = Depends(get_db)):
    bidder = db.query(Bidder).filter(Bidder.id == bidder_id).first()
    if not bidder:
        raise HTTPException(status_code=404, detail="Bidder not found")

    risks = db.query(RiskSignal).filter(RiskSignal.bidder_id == bidder_id).order_by(
        RiskSignal.severity.desc(), RiskSignal.created_at.desc()
    ).all()

    return {
        "bidder_id": bidder_id,
        "company_name": bidder.company_name,
        "summary": {
            "total": len(risks),
            "high": sum(1 for r in risks if r.severity == "HIGH"),
            "medium": sum(1 for r in risks if r.severity == "MEDIUM"),
            "low": sum(1 for r in risks if r.severity == "LOW"),
            "open": sum(1 for r in risks if r.status == "OPEN"),
        },
        "signals": [
            {
                "id": r.id,
                "risk_type": r.risk_type,
                "description": r.description,
                "severity": r.severity,
                "source": r.source,
                "evidence": r.evidence,
                "status": r.status,
                "created_at": r.created_at.isoformat()
            } for r in risks
        ]
    }


@router.get("/api/tenders/{tender_id}/risks")
def get_tender_risks(tender_id: int, db: Session = Depends(get_db)):
    """Get all risk signals across all bidders in a tender."""
    bidders = db.query(Bidder).filter(Bidder.tender_id == tender_id).all()
    result = []
    for bidder in bidders:
        risks = db.query(RiskSignal).filter(RiskSignal.bidder_id == bidder.id).all()
        result.append({
            "bidder_id": bidder.id,
            "company_name": bidder.company_name,
            "risks": [
                {
                    "id": r.id,
                    "risk_type": r.risk_type,
                    "severity": r.severity,
                    "description": r.description,
                    "status": r.status,
                    "evidence": r.evidence
                } for r in risks
            ]
        })
    return result


@router.patch("/api/risks/{risk_id}/status")
def update_risk_status(risk_id: int, data: RiskStatusUpdate, db: Session = Depends(get_db)):
    risk = db.query(RiskSignal).filter(RiskSignal.id == risk_id).first()
    if not risk:
        raise HTTPException(status_code=404, detail="Risk signal not found")
    valid_statuses = ["OPEN", "REVIEWED", "RESOLVED"]
    if data.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    risk.status = data.status
    db.commit()
    return {"message": f"Risk status updated to {data.status}"}
