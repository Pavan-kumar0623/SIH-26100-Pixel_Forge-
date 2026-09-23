from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from database import Base


class ComplianceResult(Base):
    __tablename__ = "compliance_results"

    id = Column(Integer, primary_key=True, index=True)
    bidder_id = Column(Integer, ForeignKey("bidders.id"), nullable=False)
    requirement_id = Column(Integer, ForeignKey("requirements.id"), nullable=False)
    status = Column(String(50), default="MISSING")
    reason = Column(Text)
    evidence = Column(Text)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    bidder = relationship("Bidder", back_populates="compliance_results")
    requirement = relationship("Requirement", back_populates="compliance_results")
