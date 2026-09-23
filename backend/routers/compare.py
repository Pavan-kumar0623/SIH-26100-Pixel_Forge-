from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List
from database import get_db
from services.comparison_service import generate_comparison

router = APIRouter(tags=["Comparison"])


class CompareRequest(BaseModel):
    tender_id: int
    bidder_ids: List[int]


@router.post("/api/compare")
def compare_bidders(data: CompareRequest, db: Session = Depends(get_db)):
    """Generate multi-bidder comparison matrix."""
    if len(data.bidder_ids) < 2:
        raise HTTPException(status_code=400, detail="At least 2 bidders required for comparison")
    if len(data.bidder_ids) > 20:
        raise HTTPException(status_code=400, detail="Maximum 20 bidders per comparison")
    return generate_comparison(data.tender_id, data.bidder_ids, db)
