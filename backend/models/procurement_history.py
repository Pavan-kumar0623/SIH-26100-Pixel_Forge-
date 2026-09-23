from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from database import Base


class ProcurementHistory(Base):
    __tablename__ = "procurement_history"

    id = Column(Integer, primary_key=True, index=True)
    bidder_id = Column(Integer, ForeignKey("bidders.id"), nullable=False)
    tender_id = Column(Integer, ForeignKey("tenders.id"), nullable=True)
    participation_status = Column(String(50))
    outcome = Column(String(50))
    notes = Column(Text)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    bidder = relationship("Bidder", back_populates="procurement_history")
