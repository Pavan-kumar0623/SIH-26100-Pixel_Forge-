from sqlalchemy import Column, Integer, String, Text, DateTime
from datetime import datetime, timezone
from database import Base


class Entity(Base):
    __tablename__ = "entities"

    id = Column(Integer, primary_key=True, index=True)
    entity_type = Column(String(100), nullable=False)
    entity_value = Column(Text, nullable=False)
    bidder_id = Column(Integer, nullable=True)
    tender_id = Column(Integer, nullable=True)
    source = Column(String(255))
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
