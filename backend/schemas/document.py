from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class ExtractedFieldResponse(BaseModel):
    id: int
    document_id: int
    field_name: str
    field_value: Optional[str]
    confidence: float
    page_number: int
    evidence: Optional[str]
    validation_status: str
    validation_message: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class DocumentResponse(BaseModel):
    id: int
    bidder_id: int
    file_name: str
    document_type: str
    file_path: Optional[str]
    status: str
    classification_confidence: Optional[float]
    is_supported: Optional[str]
    ocr_used: Optional[str]
    created_at: datetime
    extracted_fields: List[ExtractedFieldResponse] = []

    class Config:
        from_attributes = True


class ComplianceResultResponse(BaseModel):
    id: int
    bidder_id: int
    requirement_id: int
    status: str
    reason: Optional[str]
    evidence: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class RiskSignalResponse(BaseModel):
    id: int
    bidder_id: int
    risk_type: str
    description: Optional[str]
    severity: str
    source: Optional[str]
    evidence: Optional[str]
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class RiskStatusUpdate(BaseModel):
    status: str
