from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from database import Base


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    bidder_id = Column(Integer, ForeignKey("bidders.id"), nullable=False)
    file_name = Column(String(255), nullable=False)
    document_type = Column(String(100), default="UNKNOWN")
    file_path = Column(String(500))
    status = Column(String(50), default="UPLOADED")
    classification_confidence = Column(Float)
    is_supported = Column(String(10), default="unknown")
    ocr_used = Column(String(10), default="false")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    bidder = relationship("Bidder", back_populates="documents")
    extracted_fields = relationship("ExtractedField", back_populates="document", cascade="all, delete-orphan")
