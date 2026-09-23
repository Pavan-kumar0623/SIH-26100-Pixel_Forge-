"""
Risk Engine
Generates structured risk signals through 9 detection functions.
Pure deterministic Python — no AI calls.
"""
from sqlalchemy.orm import Session
from datetime import date
from dateutil import parser as date_parser
from models.risk_signal import RiskSignal
from models.document import Document
from models.extracted_field import ExtractedField
from models.bidder import Bidder
from models.requirement import Requirement


def run_risk_detection(bidder_id: int, tender_id: int, db: Session) -> list:
    """Run all 9 risk detection functions and store signals."""
    # Clear old signals for this bidder/tender combo
    db.query(RiskSignal).filter(RiskSignal.bidder_id == bidder_id).delete()
    db.commit()

    signals = []
    signals += detect_missing_documents(bidder_id, tender_id, db)
    signals += detect_unsupported_documents(bidder_id, db)
    signals += detect_expired_documents(bidder_id, db)
    signals += detect_name_mismatch(bidder_id, db)
    signals += detect_address_mismatch(bidder_id, db)
    signals += detect_identifier_mismatch(bidder_id, db)
    signals += detect_date_inconsistency(bidder_id, db)
    signals += detect_relationship_signals(bidder_id, tender_id, db)
    signals += detect_historical_changes(bidder_id, db)

    # Store all signals
    for s in signals:
        rs = RiskSignal(
            bidder_id=bidder_id,
            risk_type=s["risk_type"],
            description=s["description"],
            severity=s["severity"],
            source=s.get("source", ""),
            evidence=s.get("evidence", ""),
            status="OPEN"
        )
        db.add(rs)
    db.commit()
    return signals


def detect_missing_documents(bidder_id: int, tender_id: int, db: Session) -> list:
    requirements = db.query(Requirement).filter(
        Requirement.tender_id == tender_id,
        Requirement.mandatory == True
    ).all()
    documents = db.query(Document).filter(Document.bidder_id == bidder_id).all()
    processed_types = {d.document_type for d in documents if d.status in ["PROCESSED", "NEEDS_REVIEW"]}

    signals = []
    for req in requirements:
        if req.expected_document_type and req.expected_document_type not in processed_types:
            signals.append({
                "risk_type": "MISSING_DOCUMENT",
                "description": f"Mandatory requirement '{req.name}' has no corresponding verified document",
                "severity": "HIGH",
                "source": f"Requirement: {req.name}",
                "evidence": f"Expected document type: {req.expected_document_type}"
            })
    return signals


def detect_unsupported_documents(bidder_id: int, db: Session) -> list:
    unsupported = db.query(Document).filter(
        Document.bidder_id == bidder_id,
        Document.status == "UNSUPPORTED"
    ).all()
    signals = []
    for doc in unsupported:
        signals.append({
            "risk_type": "UNSUPPORTED_DOCUMENT",
            "description": f"Uploaded document '{doc.file_name}' could not be classified as a supported document type",
            "severity": "MEDIUM",
            "source": doc.file_name,
            "evidence": f"File: {doc.file_name} | Status: UNSUPPORTED"
        })
    return signals


def detect_expired_documents(bidder_id: int, db: Session) -> list:
    expired_fields = db.query(ExtractedField).join(Document).filter(
        Document.bidder_id == bidder_id,
        ExtractedField.validation_status == "EXPIRED"
    ).all()
    signals = []
    for f in expired_fields:
        signals.append({
            "risk_type": "EXPIRED_DOCUMENT",
            "description": f"Expired validity detected: {f.field_name} = {f.field_value}",
            "severity": "HIGH",
            "source": f"Document ID: {f.document_id}",
            "evidence": f.evidence or f"Field: {f.field_name}, Value: {f.field_value}"
        })
    return signals


def detect_name_mismatch(bidder_id: int, db: Session) -> list:
    """Compare company names across documents."""
    name_fields = db.query(ExtractedField).join(Document).filter(
        Document.bidder_id == bidder_id,
        ExtractedField.field_name.in_(["company_name", "enterprise_name", "name"]),
        ExtractedField.field_value != None
    ).all()

    signals = []
    names = [(f.field_value.strip().lower(), f) for f in name_fields if f.field_value]
    seen = []
    for value, field in names:
        for prev_value, prev_field in seen:
            # Simple mismatch: significant difference
            if value != prev_value and not _names_similar(value, prev_value):
                signals.append({
                    "risk_type": "NAME_MISMATCH",
                    "description": f"Company name inconsistency detected across documents",
                    "severity": "MEDIUM",
                    "source": f"Document {field.document_id} vs Document {prev_field.document_id}",
                    "evidence": f"'{field.field_value}' vs '{prev_field.field_value}'"
                })
                break
        seen.append((value, field))
    return signals


def detect_address_mismatch(bidder_id: int, db: Session) -> list:
    """Compare addresses across documents."""
    addr_fields = db.query(ExtractedField).join(Document).filter(
        Document.bidder_id == bidder_id,
        ExtractedField.field_name.in_(["registered_address", "address"]),
        ExtractedField.field_value != None
    ).all()

    signals = []
    addresses = [(f.field_value.strip().lower(), f) for f in addr_fields if f.field_value]
    seen = []
    for value, field in addresses:
        for prev_value, prev_field in seen:
            if not _addresses_similar(value, prev_value):
                signals.append({
                    "risk_type": "ADDRESS_MISMATCH",
                    "description": "Registered address inconsistency detected across documents — potential address change or discrepancy",
                    "severity": "MEDIUM",
                    "source": f"Document {field.document_id} vs Document {prev_field.document_id}",
                    "evidence": f"Address 1: '{field.field_value}' | Address 2: '{prev_field.field_value}'"
                })
                break
        seen.append((value, field))
    return signals


def detect_identifier_mismatch(bidder_id: int, db: Session) -> list:
    """Check for conflicting GSTIN/PAN/Udyam identifiers."""
    signals = []
    for field_name in ["gstin", "pan", "udyam_number", "cin"]:
        fields = db.query(ExtractedField).join(Document).filter(
            Document.bidder_id == bidder_id,
            ExtractedField.field_name == field_name,
            ExtractedField.field_value != None
        ).all()
        unique_values = list({f.field_value.strip().upper() for f in fields if f.field_value})
        if len(unique_values) > 1:
            signals.append({
                "risk_type": "IDENTIFIER_MISMATCH",
                "description": f"Conflicting {field_name.upper()} values found across documents",
                "severity": "HIGH",
                "source": f"Multiple documents",
                "evidence": f"{field_name.upper()} values: {', '.join(unique_values)}"
            })
    return signals


def detect_date_inconsistency(bidder_id: int, db: Session) -> list:
    """Check for incorporation date conflicts."""
    signals = []
    date_fields = db.query(ExtractedField).join(Document).filter(
        Document.bidder_id == bidder_id,
        ExtractedField.field_name == "incorporation_date",
        ExtractedField.field_value != None
    ).all()

    dates = []
    for f in date_fields:
        try:
            parsed = date_parser.parse(f.field_value, dayfirst=True)
            dates.append((parsed, f))
        except Exception:
            pass

    if len(dates) >= 2:
        # Check if any two dates differ by more than 30 days
        for i in range(len(dates)):
            for j in range(i + 1, len(dates)):
                diff = abs((dates[i][0] - dates[j][0]).days)
                if diff > 30:
                    signals.append({
                        "risk_type": "DATE_INCONSISTENCY",
                        "description": "Incorporation date inconsistency across documents",
                        "severity": "MEDIUM",
                        "source": f"Document {dates[i][1].document_id} vs Document {dates[j][1].document_id}",
                        "evidence": f"Date 1: {dates[i][0].strftime('%d %b %Y')} | Date 2: {dates[j][0].strftime('%d %b %Y')}"
                    })
    return signals


def detect_relationship_signals(bidder_id: int, tender_id: int, db: Session) -> list:
    """
    Detect potential shared relationships across bidders in same tender.
    Checks for shared GSTIN, PAN, address.
    This is a signal for officer review — not fraud determination.
    """
    from models.bidder import Bidder
    signals = []

    # Get all bidders in same tender
    current_bidder = db.query(Bidder).filter(Bidder.id == bidder_id).first()
    if not current_bidder:
        return signals

    other_bidders = db.query(Bidder).filter(
        Bidder.tender_id == tender_id,
        Bidder.id != bidder_id
    ).all()

    if not other_bidders:
        return signals

    # Check shared GSTIN (unlikely but detectable)
    if current_bidder.gstin:
        for ob in other_bidders:
            if ob.gstin and ob.gstin.strip().upper() == current_bidder.gstin.strip().upper():
                signals.append({
                    "risk_type": "SHARED_IDENTIFIER",
                    "description": f"Potential shared GSTIN with another bidder '{ob.company_name}' — requires officer review",
                    "severity": "HIGH",
                    "source": f"Bidder comparison",
                    "evidence": f"GSTIN: {current_bidder.gstin} also found in bidder: {ob.company_name}"
                })

    # Check shared registered address (simplified: city-level)
    if current_bidder.registered_address:
        for ob in other_bidders:
            if ob.registered_address and _addresses_similar(
                current_bidder.registered_address.lower(),
                ob.registered_address.lower()
            ) and len(current_bidder.registered_address) > 20:
                signals.append({
                    "risk_type": "SHARED_ADDRESS",
                    "description": f"Potential shared registered address with '{ob.company_name}' — requires officer review",
                    "severity": "MEDIUM",
                    "source": "Bidder address comparison",
                    "evidence": f"Address similarity detected with bidder: {ob.company_name}"
                })

    return signals


def detect_historical_changes(bidder_id: int, db: Session) -> list:
    """
    Detect changes in bidder information compared to previous tender participations.
    Uses procurement_history notes for context.
    """
    from models.procurement_history import ProcurementHistory
    signals = []
    history = db.query(ProcurementHistory).filter(
        ProcurementHistory.bidder_id == bidder_id
    ).order_by(ProcurementHistory.created_at.desc()).all()

    if len(history) > 1:
        if any("address_change" in (h.notes or "").lower() for h in history):
            signals.append({
                "risk_type": "HISTORICAL_ADDRESS_CHANGE",
                "description": "Bidder has previously recorded address changes across tender participations",
                "severity": "LOW",
                "source": "Procurement History",
                "evidence": "See bidder procurement history for details"
            })

    return signals


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _names_similar(a: str, b: str) -> bool:
    """Check if two company names are similar enough (typos, abbreviations)."""
    # Remove common suffixes
    for suffix in [" pvt ltd", " private limited", " ltd", " limited", " llp", " inc"]:
        a = a.replace(suffix, "")
        b = b.replace(suffix, "")
    a = a.strip()
    b = b.strip()
    if a == b:
        return True
    # Check if one is a substring of the other (abbreviation)
    if a in b or b in a:
        return True
    # Levenshtein-like: simple character overlap
    overlap = sum(1 for c in a if c in b)
    return overlap / max(len(a), len(b), 1) > 0.8


def _addresses_similar(a: str, b: str) -> bool:
    """Check if two addresses refer to the same location."""
    a_words = set(a.lower().split())
    b_words = set(b.lower().split())
    # Remove common stop words
    stops = {"the", "a", "an", "of", "and", "in", "at", "near", "no", "plot", "flat", "floor", "#"}
    a_words -= stops
    b_words -= stops
    if not a_words or not b_words:
        return False
    overlap = len(a_words & b_words)
    return overlap / min(len(a_words), len(b_words)) > 0.5
