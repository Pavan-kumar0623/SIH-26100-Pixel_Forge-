from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from database import Base


class Bidder(Base):
    __tablename__ = "bidders"

    id = Column(Integer, primary_key=True, index=True)
    tender_id = Column(Integer, ForeignKey("tenders.id"), nullable=False)
    company_name = Column(String(255), nullable=False)
    cin = Column(String(50))
    gstin = Column(String(20))
    pan = Column(String(20))
    udyam_number = Column(String(50))
    registered_address = Column(Text)
    incorporation_date = Column(String(50))
    industry = Column(String(100))
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    tender = relationship("Tender", back_populates="bidders")
    documents = relationship("Document", back_populates="bidder", cascade="all, delete-orphan")
    compliance_results = relationship("ComplianceResult", back_populates="bidder", cascade="all, delete-orphan")
    risk_signals = relationship("RiskSignal", back_populates="bidder", cascade="all, delete-orphan")
    procurement_history = relationship("ProcurementHistory", back_populates="bidder", cascade="all, delete-orphan")
