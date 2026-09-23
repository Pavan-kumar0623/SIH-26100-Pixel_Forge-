from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models.bidder import Bidder
from models.tender import Tender
from schemas.bidder import BidderCreate, BidderUpdate, BidderResponse

router = APIRouter(tags=["Bidders"])


@router.post("/api/tenders/{tender_id}/bidders", response_model=BidderResponse)
def create_bidder(tender_id: int, data: BidderCreate, db: Session = Depends(get_db)):
    tender = db.query(Tender).filter(Tender.id == tender_id).first()
    if not tender:
        raise HTTPException(status_code=404, detail="Tender not found")
    bidder = Bidder(
        tender_id=tender_id,
        company_name=data.company_name,
        cin=data.cin,
        gstin=data.gstin,
        pan=data.pan,
        udyam_number=data.udyam_number,
        registered_address=data.registered_address,
        incorporation_date=data.incorporation_date,
        industry=data.industry
    )
    db.add(bidder)
    db.commit()
    db.refresh(bidder)
    return bidder


@router.get("/api/tenders/{tender_id}/bidders", response_model=List[BidderResponse])
def list_bidders(tender_id: int, db: Session = Depends(get_db)):
    return db.query(Bidder).filter(Bidder.tender_id == tender_id).all()


@router.get("/api/bidders/{bidder_id}", response_model=BidderResponse)
def get_bidder(bidder_id: int, db: Session = Depends(get_db)):
    bidder = db.query(Bidder).filter(Bidder.id == bidder_id).first()
    if not bidder:
        raise HTTPException(status_code=404, detail="Bidder not found")
    return bidder


@router.put("/api/bidders/{bidder_id}", response_model=BidderResponse)
def update_bidder(bidder_id: int, data: BidderUpdate, db: Session = Depends(get_db)):
    bidder = db.query(Bidder).filter(Bidder.id == bidder_id).first()
    if not bidder:
        raise HTTPException(status_code=404, detail="Bidder not found")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(bidder, field, value)
    db.commit()
    db.refresh(bidder)
    return bidder


@router.delete("/api/bidders/{bidder_id}")
def delete_bidder(bidder_id: int, db: Session = Depends(get_db)):
    bidder = db.query(Bidder).filter(Bidder.id == bidder_id).first()
    if not bidder:
        raise HTTPException(status_code=404, detail="Bidder not found")
    db.delete(bidder)
    db.commit()
    return {"message": "Bidder deleted"}


@router.get("/api/bidders/{bidder_id}/intelligence")
def get_bidder_intelligence(bidder_id: int, db: Session = Depends(get_db)):
    """Get full bidder intelligence profile."""
    from models.document import Document
    from models.compliance_result import ComplianceResult
    from models.risk_signal import RiskSignal
    from models.procurement_history import ProcurementHistory

    bidder = db.query(Bidder).filter(Bidder.id == bidder_id).first()
    if not bidder:
        raise HTTPException(status_code=404, detail="Bidder not found")

    documents = db.query(Document).filter(Document.bidder_id == bidder_id).all()
    compliance = db.query(ComplianceResult).filter(ComplianceResult.bidder_id == bidder_id).all()
    risks = db.query(RiskSignal).filter(RiskSignal.bidder_id == bidder_id).all()
    history = db.query(ProcurementHistory).filter(ProcurementHistory.bidder_id == bidder_id).all()

    return {
        "bidder": {
            "id": bidder.id,
            "company_name": bidder.company_name,
            "cin": bidder.cin,
            "gstin": bidder.gstin,
            "pan": bidder.pan,
            "udyam_number": bidder.udyam_number,
            "registered_address": bidder.registered_address,
            "incorporation_date": bidder.incorporation_date,
            "industry": bidder.industry,
            "created_at": bidder.created_at.isoformat()
        },
        "documents_count": len(documents),
        "compliance_summary": {
            "verified": sum(1 for c in compliance if c.status == "VERIFIED"),
            "missing": sum(1 for c in compliance if c.status == "MISSING"),
            "review": sum(1 for c in compliance if c.status == "REVIEW")
        },
        "risk_summary": {
            "high": sum(1 for r in risks if r.severity == "HIGH" and r.status == "OPEN"),
            "medium": sum(1 for r in risks if r.severity == "MEDIUM" and r.status == "OPEN"),
            "low": sum(1 for r in risks if r.severity == "LOW" and r.status == "OPEN")
        },
        "procurement_history": [
            {
                "id": h.id,
                "tender_id": h.tender_id,
                "participation_status": h.participation_status,
                "outcome": h.outcome,
                "notes": h.notes,
                "created_at": h.created_at.isoformat()
            } for h in history
        ]
    }
