"""
Relationship Engine
Builds graph entities and relationships from processed bidder data.
Generates nodes and edges for the Procurement Risk Graph.
"""
from sqlalchemy.orm import Session
from models.entity import Entity
from models.relationship import Relationship
from models.bidder import Bidder
from models.document import Document
from models.extracted_field import ExtractedField
from models.tender import Tender


def build_graph_entities(tender_id: int, db: Session) -> dict:
    """
    Build full graph data for a tender.
    Returns {nodes, edges} for React Flow.
    """
    nodes = []
    edges = []
    node_map = {}  # entity_key -> node_id

    tender = db.query(Tender).filter(Tender.id == tender_id).first()
    if not tender:
        return {"nodes": [], "edges": []}

    # ── Tender Node ────────────────────────────────────────────────────────────
    tender_node_id = f"tender_{tender.id}"
    nodes.append({
        "id": tender_node_id,
        "type": "tender",
        "data": {
            "label": tender.title,
            "entity_type": "Tender",
            "tender_id": tender.tender_id,
            "status": tender.status
        },
        "position": {"x": 400, "y": 50}
    })

    bidders = db.query(Bidder).filter(Bidder.tender_id == tender_id).all()

    # Layout bidder nodes in a row
    x_positions = _distribute_x(len(bidders), center=400, spacing=280)

    for idx, bidder in enumerate(bidders):
        # ── Company Node ───────────────────────────────────────────────────────
        company_node_id = f"company_{bidder.id}"
        node_map[f"company_{bidder.id}"] = company_node_id
        nodes.append({
            "id": company_node_id,
            "type": "company",
            "data": {
                "label": bidder.company_name,
                "entity_type": "Company",
                "bidder_id": bidder.id,
                "industry": bidder.industry,
                "gstin": bidder.gstin,
                "pan": bidder.pan
            },
            "position": {"x": x_positions[idx], "y": 220}
        })

        # Tender → Company edge
        edges.append({
            "id": f"edge_tender_bidder_{bidder.id}",
            "source": tender_node_id,
            "target": company_node_id,
            "label": "SUBMITTED_BID",
            "type": "default",
            "animated": False
        })

        # ── Identifier Nodes ───────────────────────────────────────────────────
        y_offset = 380
        x_base = x_positions[idx]
        id_x = x_base - 80

        if bidder.gstin:
            gst_node_id = f"gstin_{bidder.gstin}"
            if gst_node_id not in node_map:
                node_map[gst_node_id] = gst_node_id
                nodes.append({
                    "id": gst_node_id,
                    "type": "identifier",
                    "data": {"label": bidder.gstin, "entity_type": "GSTIN"},
                    "position": {"x": id_x, "y": y_offset}
                })
            edges.append({
                "id": f"edge_gst_{bidder.id}_{bidder.gstin}",
                "source": company_node_id,
                "target": gst_node_id,
                "label": "HAS_GST",
                "type": "default"
            })
            id_x += 170

        if bidder.pan:
            pan_node_id = f"pan_{bidder.pan}"
            if pan_node_id not in node_map:
                node_map[pan_node_id] = pan_node_id
                nodes.append({
                    "id": pan_node_id,
                    "type": "identifier",
                    "data": {"label": bidder.pan, "entity_type": "PAN"},
                    "position": {"x": id_x, "y": y_offset}
                })
            edges.append({
                "id": f"edge_pan_{bidder.id}_{bidder.pan}",
                "source": company_node_id,
                "target": pan_node_id,
                "label": "HAS_PAN",
                "type": "default"
            })
            id_x += 170

        if bidder.udyam_number:
            udyam_node_id = f"udyam_{bidder.udyam_number}"
            if udyam_node_id not in node_map:
                node_map[udyam_node_id] = udyam_node_id
                nodes.append({
                    "id": udyam_node_id,
                    "type": "identifier",
                    "data": {"label": bidder.udyam_number, "entity_type": "Udyam"},
                    "position": {"x": id_x, "y": y_offset}
                })
            edges.append({
                "id": f"edge_udyam_{bidder.id}",
                "source": company_node_id,
                "target": udyam_node_id,
                "label": "HAS_UDYAM",
                "type": "default"
            })

        # ── Address Node ───────────────────────────────────────────────────────
        if bidder.registered_address:
            addr_key = bidder.registered_address[:50].strip().lower().replace(" ", "_")
            addr_node_id = f"addr_{abs(hash(addr_key)) % 100000}"
            if addr_node_id not in node_map:
                node_map[addr_node_id] = addr_node_id
                nodes.append({
                    "id": addr_node_id,
                    "type": "address",
                    "data": {"label": bidder.registered_address[:60], "entity_type": "Address"},
                    "position": {"x": x_base, "y": 540}
                })
            edges.append({
                "id": f"edge_addr_{bidder.id}",
                "source": company_node_id,
                "target": addr_node_id,
                "label": "REGISTERED_AT",
                "type": "default"
            })

    # ── Cross-Bidder Relationship Detection ───────────────────────────────────
    edges += _detect_shared_relationships(bidders, node_map, db)

    return {"nodes": nodes, "edges": edges}


def _detect_shared_relationships(bidders: list, node_map: dict, db: Session) -> list:
    """Detect shared identifiers across bidders and add highlighted edges."""
    edges = []

    # Collect identifier values per bidder
    bidder_data = []
    for b in bidders:
        bidder_data.append({
            "bidder": b,
            "gstin": b.gstin,
            "pan": b.pan,
            "address": b.registered_address
        })

    # Find shared GSTINs
    for i in range(len(bidder_data)):
        for j in range(i + 1, len(bidder_data)):
            b1 = bidder_data[i]
            b2 = bidder_data[j]

            if b1["gstin"] and b2["gstin"] and b1["gstin"] == b2["gstin"]:
                edges.append({
                    "id": f"shared_gstin_{b1['bidder'].id}_{b2['bidder'].id}",
                    "source": f"company_{b1['bidder'].id}",
                    "target": f"company_{b2['bidder'].id}",
                    "label": "SHARED_GSTIN ⚠",
                    "type": "relationship",
                    "style": {"stroke": "#f59e0b", "strokeWidth": 2},
                    "animated": True,
                    "data": {"requires_review": True}
                })

    return edges


def _distribute_x(n: int, center: int, spacing: int) -> list:
    """Distribute n items horizontally centered at center."""
    if n == 0:
        return []
    total_width = (n - 1) * spacing
    start = center - total_width // 2
    return [start + i * spacing for i in range(n)]


def get_bidder_relationships(bidder_id: int, db: Session) -> list:
    """Get all relationship signals for a specific bidder."""
    from models.risk_signal import RiskSignal
    signals = db.query(RiskSignal).filter(
        RiskSignal.bidder_id == bidder_id,
        RiskSignal.risk_type.in_(["SHARED_IDENTIFIER", "SHARED_ADDRESS", "SHARED_DIRECTOR"])
    ).all()
    return signals
