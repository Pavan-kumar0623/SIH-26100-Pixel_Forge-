from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class BidderBase(BaseModel):
    company_name: str
    cin: Optional[str] = None
    gstin: Optional[str] = None
    pan: Optional[str] = None
    udyam_number: Optional[str] = None
    registered_address: Optional[str] = None
    incorporation_date: Optional[str] = None
    industry: Optional[str] = None


class BidderCreate(BidderBase):
    pass


class BidderUpdate(BaseModel):
    company_name: Optional[str] = None
    cin: Optional[str] = None
    gstin: Optional[str] = None
    pan: Optional[str] = None
    udyam_number: Optional[str] = None
    registered_address: Optional[str] = None
    incorporation_date: Optional[str] = None
    industry: Optional[str] = None


class BidderResponse(BidderBase):
    id: int
    tender_id: int
    created_at: datetime

    class Config:
        from_attributes = True
