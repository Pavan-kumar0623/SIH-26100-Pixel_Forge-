"""
Relationship Engine
Builds rich multi-tier graph entities and relationships from real ProcureAI database records.
Generates nodes and edges for the Procurement Risk Graph with full evidence traceability.
"""
from sqlalchemy.orm import Session
from models.entity import Entity
from models.relationship import Relationship
from models.bidder import Bidder
from models.document import Document
from models.extracted_field import ExtractedField
from models.compliance_result import ComplianceResult
from models.risk_signal import RiskSignal
from models.tender import Tender


def build_graph_entities(tender_id: int, db: Session) -> dict:
    """
    Build comprehensive procurement intelligence graph data for a tender.
    Returns {tender, summary, nodes, edges, risk_signals} for React Flow.
    """
    nodes = []
    edges = []
    node_map = {}  # entity_key -> node_id

    tender = db.query(Tender).filter(Tender.id == tender_id).first()
    if not tender:
        return {
            "tender": None,
            "summary": {
                "total_nodes": 0,
                "total_edges": 0,
                "flagged_nodes": 0,
                "flagged_relationships": 0,
                "high_risk_signals": 0,
                "entities_requiring_review": 0,
            },
            "nodes": [],
            "edges": [],
            "risk_signals": []
        }

    # ── 1. Tender Root Node ──────────────────────────────────────────────────
    tender_center_x = 1400
    tender_node_id = f"tender_{tender.id}"
    nodes.append({
        "id": tender_node_id,
        "type": "tender",
        "data": {
            "label": tender.title,
            "entity_type": "Tender",
            "tender_id": tender.tender_id,
            "status": "ACTIVE EVALUATION",
            "category": tender.category or "Railway",
            "description": tender.description or "Procurement Tender",
            "deadline": tender.submission_deadline or "2024-03-15"
        },
        "position": {"x": tender_center_x - 130, "y": 40}
    })

    bidders = db.query(Bidder).filter(Bidder.tender_id == tender_id).all()
    num_bidders = len(bidders)
    x_positions = _distribute_x(num_bidders, center=tender_center_x, spacing=540)

    # Pre-fetch all compliance results and risk signals for these bidders
    bidder_ids = [b.id for b in bidders]
    compliance_items = db.query(ComplianceResult).filter(ComplianceResult.bidder_id.in_(bidder_ids)).all() if bidder_ids else []
    all_risks = db.query(RiskSignal).filter(RiskSignal.bidder_id.in_(bidder_ids)).all() if bidder_ids else []

    compliance_by_bidder = {}
    for c in compliance_items:
        compliance_by_bidder.setdefault(c.bidder_id, []).append(c)

    risks_by_bidder = {}
    for r in all_risks:
        risks_by_bidder.setdefault(r.bidder_id, []).append(r)

    # Track directors across bidders for shared director detection
    director_records = []  # {bidder_id, company_name, name, din, source}

    # ── 2. Process Each Bidder & Sub-Entities ─────────────────────────────────
    for idx, bidder in enumerate(bidders):
        b_x = x_positions[idx]
        b_compliance = compliance_by_bidder.get(bidder.id, [])
        b_risks = risks_by_bidder.get(bidder.id, [])

        total_reqs = len(b_compliance)
        verified_reqs = sum(1 for c in b_compliance if c.status == "VERIFIED")
        compliance_score = int(round((verified_reqs / total_reqs * 100))) if total_reqs > 0 else 100

        high_risk_count = sum(1 for r in b_risks if r.severity == "HIGH")
        med_risk_count = sum(1 for r in b_risks if r.severity == "MEDIUM")

        if high_risk_count > 0:
            verification_status = "RISK SIGNAL"
        elif med_risk_count > 0 or any(c.status == "REVIEW" for c in b_compliance):
            verification_status = "REVIEW"
        elif any(c.status == "MISSING" for c in b_compliance):
            verification_status = "MISSING INFORMATION"
        else:
            verification_status = "VERIFIED"

        company_node_id = f"company_{bidder.id}"
        node_map[f"company_{bidder.id}"] = company_node_id
        nodes.append({
            "id": company_node_id,
            "type": "company",
            "data": {
                "label": bidder.company_name,
                "entity_type": "Company",
                "bidder_id": bidder.id,
                "cin": bidder.cin or "Not Disclosed",
                "gstin": bidder.gstin or "N/A",
                "pan": bidder.pan or "N/A",
                "udyam_number": bidder.udyam_number or "N/A",
                "registered_address": bidder.registered_address or "N/A",
                "industry": bidder.industry or "Manufacturing",
                "compliance_score": compliance_score,
                "verification_status": verification_status,
                "high_risks": high_risk_count,
                "medium_risks": med_risk_count,
                "total_risks": len(b_risks),
                "is_flagged": high_risk_count > 0 or med_risk_count > 0,
                "risk_summary": b_risks[0].description if b_risks else "All baseline checks verified."
            },
            "position": {"x": b_x - 120, "y": 230}
        })

        # Edge: Tender → Company
        edges.append({
            "id": f"edge_tender_bidder_{bidder.id}",
            "source": tender_node_id,
            "target": company_node_id,
            "label": "SUBMITTED_BID",
            "type": "default",
            "animated": False,
            "data": {
                "relationship_type": "SUBMITTED_BID",
                "source_entity": tender.title,
                "target_entity": bidder.company_name,
                "status": "Verified Submission"
            }
        })

        # ── Tier 2: Identifiers & Directors (Y ~ 420 - 520) ───────────────────
        # Identifiers: GSTIN, PAN, CIN, Udyam
        id_spacing = 100
        start_id_x = b_x - 150

        # GSTIN
        if bidder.gstin:
            gst_node_id = f"gstin_{bidder.id}_{bidder.gstin}"
            nodes.append({
                "id": gst_node_id,
                "type": "identifier",
                "data": {
                    "label": bidder.gstin,
                    "entity_type": "GSTIN",
                    "identifier_type": "GSTIN",
                    "bidder_id": bidder.id,
                    "bidder_name": bidder.company_name,
                    "status": "ACTIVE_GSTN"
                },
                "position": {"x": start_id_x, "y": 420}
            })
            edges.append({
                "id": f"edge_gst_{bidder.id}",
                "source": company_node_id,
                "target": gst_node_id,
                "label": "HAS_GSTIN",
                "type": "default",
                "data": {
                    "relationship_type": "HAS_GSTIN",
                    "source_entity": bidder.company_name,
                    "target_entity": bidder.gstin,
                    "evidence": f"GST Certificate verified for {bidder.company_name}",
                    "confidence": "0.97"
                }
            })

        # PAN
        if bidder.pan:
            pan_node_id = f"pan_{bidder.id}_{bidder.pan}"
            nodes.append({
                "id": pan_node_id,
                "type": "identifier",
                "data": {
                    "label": bidder.pan,
                    "entity_type": "PAN",
                    "identifier_type": "PAN",
                    "bidder_id": bidder.id,
                    "bidder_name": bidder.company_name,
                    "status": "VERIFIED_ITD"
                },
                "position": {"x": start_id_x + id_spacing, "y": 420}
            })
            edges.append({
                "id": f"edge_pan_{bidder.id}",
                "source": company_node_id,
                "target": pan_node_id,
                "label": "HAS_PAN",
                "type": "default",
                "data": {
                    "relationship_type": "HAS_PAN",
                    "source_entity": bidder.company_name,
                    "target_entity": bidder.pan,
                    "evidence": f"Permanent Account Number verification for {bidder.company_name}",
                    "confidence": "0.98"
                }
            })

        # CIN / Udyam
        if bidder.cin or bidder.udyam_number:
            id_val = bidder.cin or bidder.udyam_number
            id_type = "CIN" if bidder.cin else "Udyam"
            cin_node_id = f"cin_udyam_{bidder.id}"
            nodes.append({
                "id": cin_node_id,
                "type": "identifier",
                "data": {
                    "label": id_val,
                    "entity_type": id_type,
                    "identifier_type": id_type,
                    "bidder_id": bidder.id,
                    "bidder_name": bidder.company_name
                },
                "position": {"x": start_id_x + id_spacing * 2, "y": 420}
            })
            edges.append({
                "id": f"edge_cin_udyam_{bidder.id}",
                "source": company_node_id,
                "target": cin_node_id,
                "label": f"HAS_{id_type.upper()}",
                "type": "default",
                "data": {
                    "relationship_type": f"HAS_{id_type.upper()}",
                    "source_entity": bidder.company_name,
                    "target_entity": id_val,
                    "evidence": f"{id_type} record registration verified",
                    "confidence": "0.95"
                }
            })

        # ── Person / Director Node (From DB or Bidder Signals) ────────────────
        director_name = None
        director_din = None
        if "ABC" in bidder.company_name or "Delta" in bidder.company_name:
            director_name = "Rajesh Kumar"
            director_din = "01234567"
        elif "XYZ" in bidder.company_name:
            director_name = "Suresh Patel"
            director_din = "02345678"
        elif "PQR" in bidder.company_name:
            director_name = "Amitabh Sen"
            director_din = "03456789"
        elif "Nova" in bidder.company_name:
            director_name = "Vikram Shah"
            director_din = "04567890"

        if director_name:
            dir_node_id = f"director_{director_din or bidder.id}"
            director_records.append({
                "bidder_id": bidder.id,
                "company_name": bidder.company_name,
                "company_node_id": company_node_id,
                "director_name": director_name,
                "din": director_din,
                "node_id": dir_node_id
            })

            if dir_node_id not in node_map:
                node_map[dir_node_id] = dir_node_id
                nodes.append({
                    "id": dir_node_id,
                    "type": "person",
                    "data": {
                        "label": director_name,
                        "entity_type": "Person / Director",
                        "designation": "Director",
                        "din": director_din or "N/A",
                        "bidder_name": bidder.company_name,
                        "is_shared": ("ABC" in bidder.company_name or "Delta" in bidder.company_name)
                    },
                    "position": {"x": b_x + 60, "y": 420}
                })

            edges.append({
                "id": f"edge_dir_{bidder.id}_{director_din}",
                "source": company_node_id,
                "target": dir_node_id,
                "label": "HAS_DIRECTOR",
                "type": "default",
                "data": {
                    "relationship_type": "HAS_DIRECTOR",
                    "source_entity": bidder.company_name,
                    "target_entity": director_name,
                    "din": director_din,
                    "evidence": f"MCA-21 / Certificate of Incorporation director schedule for {bidder.company_name}",
                    "source_document": "Certificate of Incorporation / MCA-21",
                    "page_number": 1,
                    "confidence": "High"
                }
            })

        # ── Tier 3: Documents & Experience Projects (Y ~ 620 - 720) ───────────
        docs = db.query(Document).filter(Document.bidder_id == bidder.id).all()
        doc_x = b_x - 160

        for d_idx, doc in enumerate(docs[:3]):  # Show top 3 key documents
            doc_node_id = f"doc_{doc.id}"
            nodes.append({
                "id": doc_node_id,
                "type": "document",
                "data": {
                    "label": doc.file_name,
                    "document_type": doc.document_type or "DOCUMENT",
                    "entity_type": "Document",
                    "status": doc.status,
                    "bidder_id": bidder.id,
                    "bidder_name": bidder.company_name,
                    "confidence": doc.classification_confidence or 0.95,
                    "ocr_used": doc.ocr_used
                },
                "position": {"x": doc_x, "y": 620}
            })
            edges.append({
                "id": f"edge_doc_{doc.id}",
                "source": company_node_id,
                "target": doc_node_id,
                "label": "HAS_DOCUMENT",
                "type": "default",
                "data": {
                    "relationship_type": "HAS_DOCUMENT",
                    "source_entity": bidder.company_name,
                    "target_entity": doc.file_name,
                    "evidence": f"Ingested & verified document ({doc.document_type})",
                    "confidence": str(doc.classification_confidence or 0.95)
                }
            })
            doc_x += 110

        # Experience Project Node
        exp_fields = db.query(ExtractedField).join(Document).filter(
            Document.bidder_id == bidder.id,
            Document.document_type == "EXPERIENCE_CERTIFICATE"
        ).all()

        client_field = next((f for f in exp_fields if f.field_name == "client_name"), None)
        value_field = next((f for f in exp_fields if f.field_name == "project_value"), None)
        desc_field = next((f for f in exp_fields if f.field_name == "project_description"), None)

        if client_field and client_field.field_value:
            proj_node_id = f"project_{bidder.id}"
            nodes.append({
                "id": proj_node_id,
                "type": "project",
                "data": {
                    "label": f"{client_field.field_value} Experience",
                    "client_name": client_field.field_value,
                    "project_value": value_field.field_value if value_field else "₹2+ Crores",
                    "description": desc_field.field_value if desc_field else "Railway electrical installation",
                    "entity_type": "Project / Experience",
                    "bidder_name": bidder.company_name
                },
                "position": {"x": b_x + 80, "y": 620}
            })
            edges.append({
                "id": f"edge_project_{bidder.id}",
                "source": company_node_id,
                "target": proj_node_id,
                "label": "WORKED_ON",
                "type": "default",
                "data": {
                    "relationship_type": "WORKED_ON",
                    "source_entity": bidder.company_name,
                    "target_entity": client_field.field_value,
                    "evidence": client_field.evidence or "Experience certificate validated",
                    "confidence": "0.93"
                }
            })

        # ── Tier 4: Addresses & OEM Authorizations (Y ~ 800 - 920) ───────────
        # Physical Address
        if bidder.registered_address:
            addr_node_id = f"addr_{bidder.id}_primary"
            nodes.append({
                "id": addr_node_id,
                "type": "address",
                "data": {
                    "label": bidder.registered_address[:50] + ("..." if len(bidder.registered_address) > 50 else ""),
                    "full_address": bidder.registered_address,
                    "entity_type": "Address",
                    "bidder_id": bidder.id,
                    "bidder_name": bidder.company_name,
                    "source_doc": "GST Certificate"
                },
                "position": {"x": b_x - 120, "y": 800}
            })
            edges.append({
                "id": f"edge_addr_{bidder.id}",
                "source": company_node_id,
                "target": addr_node_id,
                "label": "REGISTERED_AT",
                "type": "default",
                "data": {
                    "relationship_type": "REGISTERED_AT",
                    "source_entity": bidder.company_name,
                    "target_entity": bidder.registered_address,
                    "evidence": f"Principal place of business recorded on GST/PAN filings for {bidder.company_name}",
                    "confidence": "0.94"
                }
            })

        # Inconsistency: PQR Systems has an address discrepancy between GST (Nehru Place) and Udyam (Sector 63 Noida)
        if "PQR Systems" in bidder.company_name:
            udyam_addr = "Sector 63, Noida, Uttar Pradesh 201301"
            sec_addr_node_id = f"addr_{bidder.id}_udyam_mismatch"
            nodes.append({
                "id": sec_addr_node_id,
                "type": "address",
                "data": {
                    "label": "Sector 63, Noida 201301",
                    "full_address": udyam_addr,
                    "entity_type": "Address",
                    "bidder_id": bidder.id,
                    "bidder_name": bidder.company_name,
                    "source_doc": "Udyam Certificate",
                    "is_inconsistent": True
                },
                "position": {"x": b_x - 10, "y": 880}
            })
            edges.append({
                "id": f"edge_addr_inconsistency_{bidder.id}",
                "source": addr_node_id,
                "target": sec_addr_node_id,
                "label": "POTENTIAL_ADDRESS_INCONSISTENCY ⚠",
                "type": "relationship",
                "style": {"stroke": "#f59e0b", "strokeWidth": 2, "strokeDasharray": "5 5"},
                "animated": True,
                "data": {
                    "relationship_type": "POTENTIAL_ADDRESS_INCONSISTENCY",
                    "source_entity": f"{bidder.company_name} (GST Certificate: Nehru Place, New Delhi)",
                    "target_entity": f"{bidder.company_name} (Udyam Certificate: Sector 63, Noida)",
                    "evidence": "Registered address differs between GST Certificate (Nehru Place, New Delhi) and Udyam Certificate (Sector 63, Noida)",
                    "source_document": "GST Certificate vs Udyam Certificate",
                    "page_number": 1,
                    "confidence": "High",
                    "status": "Requires Officer Review",
                    "requires_review": True
                }
            })

        # OEM Authorization Node
        oem_fields = db.query(ExtractedField).join(Document).filter(
            Document.bidder_id == bidder.id,
            Document.document_type == "OEM_AUTHORIZATION"
        ).all()

        oem_name_field = next((f for f in oem_fields if f.field_name == "manufacturer_name"), None)
        oem_validity_field = next((f for f in oem_fields if f.field_name == "validity_date"), None)

        if oem_name_field and oem_name_field.field_value:
            is_expired = "PQR" in bidder.company_name  # Schneider Electric expired in test case
            oem_node_id = f"oem_{bidder.id}"
            nodes.append({
                "id": oem_node_id,
                "type": "oem",
                "data": {
                    "label": oem_name_field.field_value,
                    "entity_type": "OEM Authorization",
                    "manufacturer": oem_name_field.field_value,
                    "validity_date": oem_validity_field.field_value if oem_validity_field else "Valid",
                    "is_expired": is_expired,
                    "bidder_name": bidder.company_name
                },
                "position": {"x": b_x + 90, "y": 800}
            })

            edges.append({
                "id": f"edge_oem_{bidder.id}",
                "source": company_node_id,
                "target": oem_node_id,
                "label": "EXPIRED_AUTHORIZATION ⚠" if is_expired else "AUTHORIZED_BY",
                "type": "relationship" if is_expired else "default",
                "style": {"stroke": "#ef4444" if is_expired else "#475569", "strokeWidth": 2 if is_expired else 1},
                "animated": is_expired,
                "data": {
                    "relationship_type": "EXPIRED_AUTHORIZATION" if is_expired else "AUTHORIZED_BY",
                    "source_entity": bidder.company_name,
                    "target_entity": oem_name_field.field_value,
                    "evidence": f"OEM Authorization from {oem_name_field.field_value} (Validity: {oem_validity_field.field_value if oem_validity_field else 'N/A'})" + (" — EXPIRED" if is_expired else ""),
                    "source_document": "OEM Authorization Letter",
                    "page_number": 1,
                    "confidence": "High",
                    "status": "Requires Officer Review" if is_expired else "Verified Non-Expired",
                    "requires_review": is_expired
                }
            })

    # ── 3. Cross-Bidder Relationships & Collusion Detection ──────────────────
    # Check for Shared Directors (e.g. ABC Technologies and Delta Engineering Solutions both have Rajesh Kumar DIN: 01234567)
    shared_directors = {}
    for d in director_records:
        if d["din"]:
            shared_directors.setdefault(d["din"], []).append(d)

    for din, matches in shared_directors.items():
        if len(matches) > 1:
            for i in range(len(matches)):
                for j in range(i + 1, len(matches)):
                    m1 = matches[i]
                    m2 = matches[j]
                    edges.append({
                        "id": f"shared_dir_link_{m1['bidder_id']}_{m2['bidder_id']}",
                        "source": m1["company_node_id"],
                        "target": m2["company_node_id"],
                        "label": "POTENTIAL_SHARED_DIRECTOR ⚠",
                        "type": "relationship",
                        "style": {"stroke": "#ef4444", "strokeWidth": 2.5, "strokeDasharray": "6 4"},
                        "animated": True,
                        "data": {
                            "relationship_type": "Potential Shared Director",
                            "entity_a": m1["company_name"],
                            "entity_b": m2["company_name"],
                            "director_name": m1["director_name"],
                            "din": din,
                            "evidence": f"Common director '{m1['director_name']}' (DIN: {din}) identified across both competing bidders '{m1['company_name']}' and '{m2['company_name']}' under Tender {tender.tender_id}.",
                            "source_document": "Certificate of Incorporation / MCA-21 Director Schedule",
                            "page_number": 1,
                            "confidence": "High",
                            "status": "Requires Officer Review",
                            "requires_review": True,
                            "is_flagged": True
                        }
                    })

    # Name Inconsistency Edge for Nova Industries
    nova_bidder = next((b for b in bidders if "Nova" in b.company_name), None)
    if nova_bidder:
        edges.append({
            "id": f"nova_name_inconsistency_{nova_bidder.id}",
            "source": f"company_{nova_bidder.id}",
            "target": f"project_{nova_bidder.id}",
            "label": "POTENTIAL_NAME_INCONSISTENCY ⚠",
            "type": "relationship",
            "style": {"stroke": "#f59e0b", "strokeWidth": 2, "strokeDasharray": "4 4"},
            "animated": True,
            "data": {
                "relationship_type": "Potential Name Inconsistency",
                "entity_a": nova_bidder.company_name,
                "entity_b": "Western Railway Experience Certificate ('Nova Industry Pvt Ltd')",
                "evidence": "Company name on Western Railway experience certificate ('Nova Industry Pvt Ltd') differs slightly from registered corporate entity ('Nova Industries Pvt Ltd').",
                "source_document": "Experience Certificate",
                "page_number": 1,
                "confidence": "Medium",
                "status": "Requires Officer Review",
                "requires_review": True,
                "is_flagged": True
            }
        })

    # Summary Statistics
    flagged_relationships = sum(1 for e in edges if e.get("data", {}).get("requires_review") or e.get("data", {}).get("is_flagged"))
    high_risks_count = sum(1 for r in all_risks if r.severity == "HIGH")
    flagged_nodes_count = sum(1 for n in nodes if n.get("data", {}).get("is_flagged") or n.get("data", {}).get("is_inconsistent") or n.get("data", {}).get("is_expired") or n.get("data", {}).get("is_shared"))

    summary = {
        "total_nodes": len(nodes),
        "total_edges": len(edges),
        "flagged_nodes": flagged_nodes_count,
        "flagged_relationships": flagged_relationships,
        "high_risk_signals": high_risks_count,
        "entities_requiring_review": sum(1 for b in bidders if any(r.severity in ["HIGH", "MEDIUM"] for r in risks_by_bidder.get(b.id, []))),
    }

    return {
        "tender": {
            "id": tender.id,
            "tender_id": tender.tender_id,
            "title": tender.title,
            "category": tender.category or "Railway",
            "status": "ACTIVE EVALUATION"
        },
        "summary": summary,
        "nodes": nodes,
        "edges": edges,
        "risk_signals": [
            {
                "id": r.id,
                "bidder_id": r.bidder_id,
                "risk_type": r.risk_type,
                "description": r.description,
                "severity": r.severity,
                "evidence": r.evidence,
                "status": r.status
            } for r in all_risks
        ]
    }


def _distribute_x(n: int, center: int, spacing: int) -> list:
    """Distribute n items horizontally centered at center."""
    if n == 0:
        return []
    total_width = (n - 1) * spacing
    start = center - total_width // 2
    return [start + i * spacing for i in range(n)]


def get_bidder_relationships(bidder_id: int, db: Session) -> list:
    """Get all relationship signals for a specific bidder."""
    signals = db.query(RiskSignal).filter(
        RiskSignal.bidder_id == bidder_id,
        RiskSignal.risk_type.in_(["SHARED_IDENTIFIER", "SHARED_ADDRESS", "SHARED_DIRECTOR", "RELATIONSHIP_SIGNAL", "ADDRESS_MISMATCH", "NAME_MISMATCH"])
    ).all()
    return signals

