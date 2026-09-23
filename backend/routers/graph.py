from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from services.relationship_engine import build_graph_entities, get_bidder_relationships

router = APIRouter(tags=["Graph"])


@router.get("/api/tenders/{tender_id}/graph")
def get_tender_graph(tender_id: int, db: Session = Depends(get_db)):
    """Get full procurement risk graph data for React Flow."""
    graph_data = build_graph_entities(tender_id, db)
    return graph_data


@router.get("/api/bidders/{bidder_id}/relationships")
@router.get("/api/graph/bidder/{bidder_id}")
def get_bidder_relationships_endpoint(bidder_id: int, db: Session = Depends(get_db)):
    """Get relationship signals for a specific bidder."""
    signals = get_bidder_relationships(bidder_id, db)
    return {
        "bidder_id": bidder_id,
        "relationship_signals": [
            {
                "id": s.id,
                "risk_type": s.risk_type,
                "description": s.description,
                "severity": s.severity,
                "evidence": s.evidence,
                "status": s.status
            } for s in signals
        ]
    }
