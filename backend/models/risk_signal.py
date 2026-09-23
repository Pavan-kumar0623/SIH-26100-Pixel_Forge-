from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from database import Base


class RiskSignal(Base):
    __tablename__ = "risk_signals"

    id = Column(Integer, primary_key=True, index=True)
    bidder_id = Column(Integer, ForeignKey("bidders.id"), nullable=False)
    risk_type = Column(String(100), nullable=False)
    description = Column(Text)
    severity = Column(String(20), default="LOW")
    source = Column(String(255))
    evidence = Column(Text)
    status = Column(String(50), default="OPEN")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    bidder = relationship("Bidder", back_populates="risk_signals")
