from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import uuid
from database import get_db
from models.tender import Tender
from schemas.tender import TenderCreate, TenderUpdate, TenderResponse

router = APIRouter(prefix="/api/tenders", tags=["Tenders"])


@router.post("", response_model=TenderResponse)
def create_tender(data: TenderCreate, db: Session = Depends(get_db)):
    tender_id = data.tender_id or f"TND-{uuid.uuid4().hex[:8].upper()}"
    tender = Tender(
        tender_id=tender_id,
        title=data.title,
        description=data.description,
        category=data.category,
        tender_date=data.tender_date,
        submission_deadline=data.submission_deadline,
        status=data.status or "DRAFT"
    )
    db.add(tender)
    db.commit()
    db.refresh(tender)
    return tender


@router.get("", response_model=List[TenderResponse])
def list_tenders(db: Session = Depends(get_db)):
    return db.query(Tender).order_by(Tender.created_at.desc()).all()


@router.get("/{tender_id}", response_model=TenderResponse)
def get_tender(tender_id: int, db: Session = Depends(get_db)):
    tender = db.query(Tender).filter(Tender.id == tender_id).first()
    if not tender:
        raise HTTPException(status_code=404, detail="Tender not found")
    return tender


@router.put("/{tender_id}", response_model=TenderResponse)
def update_tender(tender_id: int, data: TenderUpdate, db: Session = Depends(get_db)):
    tender = db.query(Tender).filter(Tender.id == tender_id).first()
    if not tender:
        raise HTTPException(status_code=404, detail="Tender not found")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(tender, field, value)
    db.commit()
    db.refresh(tender)
    return tender


@router.delete("/{tender_id}")
def delete_tender(tender_id: int, db: Session = Depends(get_db)):
    tender = db.query(Tender).filter(Tender.id == tender_id).first()
    if not tender:
        raise HTTPException(status_code=404, detail="Tender not found")
    db.delete(tender)
    db.commit()
    return {"message": "Tender deleted"}
