from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from database import Base


class Requirement(Base):
    __tablename__ = "requirements"

    id = Column(Integer, primary_key=True, index=True)
    tender_id = Column(Integer, ForeignKey("tenders.id"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    mandatory = Column(Boolean, default=True)
    expected_document_type = Column(String(100))
    validation_rule = Column(Text)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    tender = relationship("Tender", back_populates="requirements")
    compliance_results = relationship("ComplianceResult", back_populates="requirement", cascade="all, delete-orphan")
