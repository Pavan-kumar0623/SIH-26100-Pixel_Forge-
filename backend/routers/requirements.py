from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models.requirement import Requirement
from models.tender import Tender
from schemas.tender import RequirementCreate, RequirementUpdate, RequirementResponse

router = APIRouter(tags=["Requirements"])


@router.post("/api/tenders/{tender_id}/requirements", response_model=RequirementResponse)
def create_requirement(tender_id: int, data: RequirementCreate, db: Session = Depends(get_db)):
    tender = db.query(Tender).filter(Tender.id == tender_id).first()
    if not tender:
        raise HTTPException(status_code=404, detail="Tender not found")
    req = Requirement(
        tender_id=tender_id,
        name=data.name,
        description=data.description,
        mandatory=data.mandatory,
        expected_document_type=data.expected_document_type,
        validation_rule=data.validation_rule
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    return req


@router.get("/api/tenders/{tender_id}/requirements", response_model=List[RequirementResponse])
def list_requirements(tender_id: int, db: Session = Depends(get_db)):
    return db.query(Requirement).filter(Requirement.tender_id == tender_id).all()


@router.put("/api/requirements/{req_id}", response_model=RequirementResponse)
def update_requirement(req_id: int, data: RequirementUpdate, db: Session = Depends(get_db)):
    req = db.query(Requirement).filter(Requirement.id == req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Requirement not found")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(req, field, value)
    db.commit()
    db.refresh(req)
    return req


@router.delete("/api/requirements/{req_id}")
def delete_requirement(req_id: int, db: Session = Depends(get_db)):
    req = db.query(Requirement).filter(Requirement.id == req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Requirement not found")
    db.delete(req)
    db.commit()
    return {"message": "Requirement deleted"}
