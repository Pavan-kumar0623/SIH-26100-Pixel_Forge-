from sqlalchemy import Column, Integer, String, Text, DateTime
from datetime import datetime, timezone
from database import Base


class Relationship(Base):
    __tablename__ = "relationships"

    id = Column(Integer, primary_key=True, index=True)
    entity_1 = Column(Integer, nullable=False)
    entity_2 = Column(Integer, nullable=False)
    relationship_type = Column(String(100), nullable=False)
    evidence = Column(Text)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
