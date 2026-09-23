from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class TenderBase(BaseModel):
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    tender_date: Optional[str] = None
    submission_deadline: Optional[str] = None
    status: Optional[str] = "DRAFT"


class TenderCreate(TenderBase):
    tender_id: Optional[str] = None


class TenderUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    tender_date: Optional[str] = None
    submission_deadline: Optional[str] = None
    status: Optional[str] = None


class TenderResponse(TenderBase):
    id: int
    tender_id: str
    created_at: datetime

    class Config:
        from_attributes = True


class RequirementBase(BaseModel):
    name: str
    description: Optional[str] = None
    mandatory: bool = True
    expected_document_type: Optional[str] = None
    validation_rule: Optional[str] = None


class RequirementCreate(RequirementBase):
    pass


class RequirementUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    mandatory: Optional[bool] = None
    expected_document_type: Optional[str] = None
    validation_rule: Optional[str] = None


class RequirementResponse(RequirementBase):
    id: int
    tender_id: int
    created_at: datetime

    class Config:
        from_attributes = True
