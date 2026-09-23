from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from database import Base


class ExtractedField(Base):
    __tablename__ = "extracted_fields"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    field_name = Column(String(100), nullable=False)
    field_value = Column(Text)
    confidence = Column(Float, default=0.0)
    page_number = Column(Integer, default=1)
    evidence = Column(Text)
    validation_status = Column(String(50), default="PENDING")
    validation_message = Column(Text)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    document = relationship("Document", back_populates="extracted_fields")
