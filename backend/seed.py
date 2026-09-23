"""
Seed Script — ProcureAI Demo Data
Creates synthetic test data for all 5 demo companies.
Generates realistic test PDFs using reportlab (or plain text files).
Run: python seed.py
"""
import sys
import os
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal, init_db
from models.tender import Tender
from models.requirement import Requirement
from models.bidder import Bidder
from models.document import Document
from models.extracted_field import ExtractedField
from models.compliance_result import ComplianceResult
from models.risk_signal import RiskSignal
from models.procurement_history import ProcurementHistory
from pathlib import Path
import uuid
from datetime import datetime, timezone


def create_test_pdf(content: str, filepath: str):
    """Create a simple PDF or text file with the given content."""
    path = Path(filepath)
    path.parent.mkdir(parents=True, exist_ok=True)

    try:
        # Try reportlab first
        from reportlab.lib.pagesizes import A4
        from reportlab.platypus import SimpleDocTemplate, Paragraph
        from reportlab.lib.styles import getSampleStyleSheet

        doc = SimpleDocTemplate(str(path), pagesize=A4)
        styles = getSampleStyleSheet()
        story = [Paragraph(line.replace('\n', '<br/>'), styles['Normal']) for line in content.split('\n\n')]
        doc.build(story)
        print(f"  ✅ Created PDF: {filepath}")
    except ImportError:
        # Fallback: save as .txt with .pdf extension (for demo only)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"  ✅ Created text file: {filepath} (install reportlab for real PDFs)")


def main():
    print("🌱 Seeding ProcureAI demo database...")
    init_db()
    db = SessionLocal()

    try:
        # ─── Clean existing data ────────────────────────────────────────────────
        for model in [ProcurementHistory, RiskSignal, ComplianceResult, ExtractedField, Document, Bidder, Requirement, Tender]:
            db.query(model).delete()
        db.commit()
        print("🧹 Cleared existing data")

        # ─── 1. Create Tender ────────────────────────────────────────────────────
        tender = Tender(
            tender_id="TND-2024-RAIL-001",
            title="Supply of Railway Electrical Equipment",
            description="Procurement of electrical switchgear, transformers, and control panels for railway infrastructure upgrade project. Bidders must demonstrate OEM authorization and prior railway experience.",
            category="Railway",
            tender_date="2024-01-15",
            submission_deadline="2024-03-15",
            status="ACTIVE"
        )
        db.add(tender)
        db.flush()
        print(f"✅ Created tender: {tender.title}")

        # ─── 2. Create Requirements ──────────────────────────────────────────────
        requirements_data = [
            ("GST Certificate", "Valid GST registration certificate", True, "GST_CERTIFICATE", "Valid GSTIN format, active registration"),
            ("PAN Card", "Permanent Account Number card", True, "PAN_CARD", "Valid PAN format"),
            ("Udyam Certificate", "MSME/Udyam registration certificate", False, "UDYAM_CERTIFICATE", "Valid Udyam number format"),
            ("Experience Certificate", "Work experience certificate from prior clients", True, "EXPERIENCE_CERTIFICATE", "Minimum 3 years railway sector experience"),
            ("OEM Authorization", "Original Equipment Manufacturer authorization letter", True, "OEM_AUTHORIZATION", "Valid authorization with non-expired validity date"),
            ("Technical Document", "Technical specifications and product data sheet", True, "TECHNICAL_DOCUMENT", "Complete technical specifications required"),
        ]

        requirements = []
        for name, desc, mandatory, doc_type, rule in requirements_data:
            req = Requirement(
                tender_id=tender.id,
                name=name,
                description=desc,
                mandatory=mandatory,
                expected_document_type=doc_type,
                validation_rule=rule
            )
            db.add(req)
            requirements.append(req)
        db.flush()
        print(f"✅ Created {len(requirements)} requirements")

        # ─── 3. Create Bidders ───────────────────────────────────────────────────
        bidders_data = [
            {
                "company_name": "ABC Technologies Pvt Ltd",
                "cin": "U72900KA2010PTC054321",
                "gstin": "29AABCA1234A1Z5",
                "pan": "AABCA1234A",
                "udyam_number": "UDYAM-KA-01-0012345",
                "registered_address": "123 Electronic City, Phase 1, Bengaluru, Karnataka 560100",
                "incorporation_date": "15 March 2010",
                "industry": "Electrical Equipment"
            },
            {
                "company_name": "XYZ Electricals Pvt Ltd",
                "cin": "U31300MH2008PTC178923",
                "gstin": "27AABCX5678B1Z3",
                "pan": "AABCX5678B",
                "udyam_number": "UDYAM-MH-02-0023456",
                "registered_address": "456 MIDC Industrial Area, Andheri East, Mumbai, Maharashtra 400093",
                "incorporation_date": "22 June 2008",
                "industry": "Electrical Engineering"
            },
            {
                "company_name": "PQR Systems Ltd",
                "cin": "L29299DL2015PLC089234",
                "gstin": "07AABCP9012C1Z1",
                "pan": "AABCP9012C",
                "udyam_number": None,
                "registered_address": "789 Nehru Place, New Delhi 110019",
                "incorporation_date": "10 April 2015",
                "industry": "Industrial Systems"
            },
            {
                "company_name": "Delta Engineering Solutions",
                "cin": "U29100TN2012PTC110234",
                "gstin": "33AABCD3456D1Z2",
                "pan": "AABCD3456D",
                "udyam_number": "UDYAM-TN-04-0045678",
                "registered_address": "321 Industrial Estate, Guindy, Chennai, Tamil Nadu 600032",
                "incorporation_date": "5 August 2012",
                "industry": "Engineering Services"
            },
            {
                "company_name": "Nova Industries Pvt Ltd",
                "cin": "U31900GJ2018PTC134567",
                "gstin": "24AABCN7890E1Z8",
                "pan": "AABCN7890E",
                "udyam_number": "UDYAM-GJ-05-0056789",
                "registered_address": "654 GIDC Vatva Industrial Estate, Ahmedabad, Gujarat 382445",
                "incorporation_date": "18 November 2018",
                "industry": "Industrial Manufacturing"
            }
        ]

        bidders = []
        for bd in bidders_data:
            b = Bidder(tender_id=tender.id, **bd)
            db.add(b)
            bidders.append(b)
        db.flush()
        print(f"✅ Created {len(bidders)} bidders")

        # ─── 4. Create Test Documents & Extracted Fields ─────────────────────────
        upload_base = Path("./uploads") / f"tender_{tender.id:03d}"

        # ── ABC Technologies — Mostly consistent, clean profile ──────────────────
        _seed_abc_technologies(db, bidders[0], requirements, upload_base / f"bidder_{bidders[0].id:03d}")

        # ── XYZ Electricals — Clean profile ─────────────────────────────────────
        _seed_xyz_electricals(db, bidders[1], requirements, upload_base / f"bidder_{bidders[1].id:03d}")

        # ── PQR Systems — Address mismatch + missing OEM + expired certificate ───
        _seed_pqr_systems(db, bidders[2], requirements, upload_base / f"bidder_{bidders[2].id:03d}")

        # ── Delta Engineering — Shared director signal ───────────────────────────
        _seed_delta_engineering(db, bidders[3], requirements, upload_base / f"bidder_{bidders[3].id:03d}")

        # ── Nova Industries — Experience inconsistency ───────────────────────────
        _seed_nova_industries(db, bidders[4], requirements, upload_base / f"bidder_{bidders[4].id:03d}")

        # ─── 5. Compliance Results ────────────────────────────────────────────────
        _seed_compliance(db, bidders, requirements)

        # ─── 6. Risk Signals ──────────────────────────────────────────────────────
        _seed_risk_signals(db, bidders)

        # ─── 7. Procurement History ───────────────────────────────────────────────
        _seed_procurement_history(db, bidders, tender.id)

        db.commit()
        print("\n🎉 Seed complete! Demo data created successfully.")
        print(f"   Tender: {tender.tender_id}")
        print(f"   Bidders: {len(bidders)}")
        print(f"   Requirements: {len(requirements)}")

    except Exception as e:
        db.rollback()
        print(f"❌ Seed failed: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


def _create_doc(db, bidder, file_name, doc_type, status, confidence, upload_dir, ocr_used="false"):
    upload_dir.mkdir(parents=True, exist_ok=True)
    file_path = str(upload_dir / file_name)
    # Create a placeholder file
    with open(file_path, 'w') as f:
        f.write(f"[Demo document: {doc_type} for {bidder.company_name}]")
    doc = Document(
        bidder_id=bidder.id,
        file_name=file_name,
        document_type=doc_type,
        file_path=file_path,
        status=status,
        classification_confidence=confidence,
        is_supported="true",
        ocr_used=ocr_used
    )
    db.add(doc)
    db.flush()
    return doc


def _add_field(db, doc, name, value, confidence, page, evidence, validation_status="VALID", validation_msg=""):
    ef = ExtractedField(
        document_id=doc.id,
        field_name=name,
        field_value=value,
        confidence=confidence,
        page_number=page,
        evidence=f"Source: {doc.file_name} | {evidence}",
        validation_status=validation_status,
        validation_message=validation_msg
    )
    db.add(ef)


def _seed_abc_technologies(db, bidder, requirements, upload_dir):
    # GST Certificate
    doc = _create_doc(db, bidder, "gst_certificate.pdf", "GST_CERTIFICATE", "PROCESSED", 0.97, upload_dir)
    _add_field(db, doc, "gstin", "29AABCA1234A1Z5", 0.97, 1, "GSTIN: 29AABCA1234A1Z5", "VALID", "GSTIN format valid")
    _add_field(db, doc, "company_name", "ABC Technologies Pvt Ltd", 0.96, 1, "Legal Name: ABC Technologies Pvt Ltd")
    _add_field(db, doc, "registered_address", "123 Electronic City, Phase 1, Bengaluru, Karnataka 560100", 0.94, 1, "Principal Place of Business")
    _add_field(db, doc, "registration_date", "20 March 2018", 0.95, 1, "Date of Registration: 20/03/2018")

    # PAN Card
    doc = _create_doc(db, bidder, "pan_card.pdf", "PAN_CARD", "PROCESSED", 0.98, upload_dir)
    _add_field(db, doc, "pan", "AABCA1234A", 0.98, 1, "Permanent Account Number: AABCA1234A", "VALID", "PAN format valid")
    _add_field(db, doc, "name", "ABC TECHNOLOGIES PVT LTD", 0.97, 1, "Name: ABC TECHNOLOGIES PVT LTD")

    # Udyam Certificate
    doc = _create_doc(db, bidder, "udyam_certificate.pdf", "UDYAM_CERTIFICATE", "PROCESSED", 0.96, upload_dir)
    _add_field(db, doc, "udyam_number", "UDYAM-KA-01-0012345", 0.96, 1, "Udyam Registration Number: UDYAM-KA-01-0012345", "VALID", "Udyam format valid")
    _add_field(db, doc, "enterprise_name", "ABC Technologies Pvt Ltd", 0.95, 1, "Name of Enterprise")
    _add_field(db, doc, "address", "123 Electronic City, Phase 1, Bengaluru, Karnataka 560100", 0.93, 1, "Official Address")

    # Experience Certificate
    doc = _create_doc(db, bidder, "experience_certificate.pdf", "EXPERIENCE_CERTIFICATE", "PROCESSED", 0.93, upload_dir)
    _add_field(db, doc, "company_name", "ABC Technologies Pvt Ltd", 0.93, 1, "Contractor Name")
    _add_field(db, doc, "client_name", "South Western Railway", 0.92, 1, "Client: South Western Railway")
    _add_field(db, doc, "project_description", "Supply and installation of electrical control panels for 15 railway stations", 0.91, 1, "Work Description")
    _add_field(db, doc, "project_value", "₹4.2 Crores", 0.90, 1, "Contract Value")

    # OEM Authorization
    doc = _create_doc(db, bidder, "oem_authorization.pdf", "OEM_AUTHORIZATION", "PROCESSED", 0.95, upload_dir)
    _add_field(db, doc, "manufacturer_name", "Siemens AG", 0.96, 1, "Manufacturer: Siemens AG")
    _add_field(db, doc, "authorized_dealer", "ABC Technologies Pvt Ltd", 0.95, 1, "Authorized Dealer")
    _add_field(db, doc, "validity_date", "31 December 2025", 0.94, 1, "Valid Until: 31/12/2025", "VALID", "Validity date in future")

    # Technical Document
    doc = _create_doc(db, bidder, "technical_document.pdf", "TECHNICAL_DOCUMENT", "PROCESSED", 0.91, upload_dir)
    _add_field(db, doc, "company_name", "ABC Technologies Pvt Ltd", 0.91, 1, "Company")
    _add_field(db, doc, "product_name", "Railway Grade Switchgear Panel", 0.90, 1, "Product")


def _seed_xyz_electricals(db, bidder, requirements, upload_dir):
    doc = _create_doc(db, bidder, "gst_certificate.pdf", "GST_CERTIFICATE", "PROCESSED", 0.96, upload_dir)
    _add_field(db, doc, "gstin", "27AABCX5678B1Z3", 0.96, 1, "GSTIN: 27AABCX5678B1Z3", "VALID", "GSTIN format valid")
    _add_field(db, doc, "company_name", "XYZ Electricals Pvt Ltd", 0.95, 1, "Legal Name")
    _add_field(db, doc, "registered_address", "456 MIDC Industrial Area, Andheri East, Mumbai, Maharashtra 400093", 0.93, 1, "Address")

    doc = _create_doc(db, bidder, "pan_card.jpg", "PAN_CARD", "PROCESSED", 0.97, upload_dir, "true")
    _add_field(db, doc, "pan", "AABCX5678B", 0.97, 1, "PAN: AABCX5678B", "VALID", "PAN format valid")
    _add_field(db, doc, "name", "XYZ ELECTRICALS PVT LTD", 0.96, 1, "Name on PAN")

    doc = _create_doc(db, bidder, "udyam_certificate.pdf", "UDYAM_CERTIFICATE", "PROCESSED", 0.94, upload_dir)
    _add_field(db, doc, "udyam_number", "UDYAM-MH-02-0023456", 0.94, 1, "Udyam Number", "VALID", "Valid format")
    _add_field(db, doc, "enterprise_name", "XYZ Electricals Pvt Ltd", 0.93, 1, "Enterprise Name")
    _add_field(db, doc, "address", "456 MIDC Industrial Area, Andheri East, Mumbai, Maharashtra 400093", 0.92, 1, "Address")

    doc = _create_doc(db, bidder, "experience_certificate.pdf", "EXPERIENCE_CERTIFICATE", "PROCESSED", 0.92, upload_dir)
    _add_field(db, doc, "company_name", "XYZ Electricals Pvt Ltd", 0.92, 1, "Contractor")
    _add_field(db, doc, "client_name", "Mumbai Metro Rail Corporation", 0.91, 1, "Client")
    _add_field(db, doc, "project_description", "Supply of MV/LV switchgear for metro rail traction substations", 0.90, 1, "Work")
    _add_field(db, doc, "project_value", "₹6.8 Crores", 0.89, 1, "Value")

    doc = _create_doc(db, bidder, "oem_authorization.pdf", "OEM_AUTHORIZATION", "PROCESSED", 0.94, upload_dir)
    _add_field(db, doc, "manufacturer_name", "ABB India Ltd", 0.94, 1, "Manufacturer")
    _add_field(db, doc, "authorized_dealer", "XYZ Electricals Pvt Ltd", 0.93, 1, "Authorized For")
    _add_field(db, doc, "validity_date", "30 June 2025", 0.92, 1, "Valid Till", "VALID", "Validity date in future")

    doc = _create_doc(db, bidder, "technical_specs.pdf", "TECHNICAL_DOCUMENT", "PROCESSED", 0.90, upload_dir)
    _add_field(db, doc, "company_name", "XYZ Electricals Pvt Ltd", 0.90, 1, "Company")
    _add_field(db, doc, "product_name", "MV Switchgear 11kV", 0.89, 1, "Product")


def _seed_pqr_systems(db, bidder, requirements, upload_dir):
    # Address mismatch: GST says New Delhi, Udyam says Noida
    doc = _create_doc(db, bidder, "gst_certificate.pdf", "GST_CERTIFICATE", "PROCESSED", 0.94, upload_dir)
    _add_field(db, doc, "gstin", "07AABCP9012C1Z1", 0.94, 1, "GSTIN: 07AABCP9012C1Z1", "VALID", "GSTIN format valid")
    _add_field(db, doc, "company_name", "PQR Systems Ltd", 0.93, 1, "Legal Name")
    _add_field(db, doc, "registered_address", "789 Nehru Place, New Delhi 110019", 0.92, 1, "Address")

    doc = _create_doc(db, bidder, "pan_card.pdf", "PAN_CARD", "PROCESSED", 0.96, upload_dir)
    _add_field(db, doc, "pan", "AABCP9012C", 0.96, 1, "PAN", "VALID", "Valid")
    _add_field(db, doc, "name", "PQR SYSTEMS LIMITED", 0.95, 1, "Name")

    # NOTE: No Udyam certificate uploaded (optional requirement — no signal needed)

    doc = _create_doc(db, bidder, "experience_certificate.pdf", "EXPERIENCE_CERTIFICATE", "PROCESSED", 0.88, upload_dir)
    _add_field(db, doc, "company_name", "PQR Systems Ltd", 0.88, 1, "Company")
    _add_field(db, doc, "client_name", "Delhi Metro Rail Corporation", 0.87, 1, "Client")
    _add_field(db, doc, "project_description", "Supply of electrical control systems for DMRC Phase 3", 0.86, 1, "Work")
    _add_field(db, doc, "project_value", "₹2.1 Crores", 0.85, 1, "Value")

    # OEM Authorization — EXPIRED
    doc = _create_doc(db, bidder, "oem_authorization.pdf", "OEM_AUTHORIZATION", "PROCESSED", 0.92, upload_dir)
    _add_field(db, doc, "manufacturer_name", "Schneider Electric India", 0.92, 1, "OEM")
    _add_field(db, doc, "authorized_dealer", "PQR Systems Ltd", 0.91, 1, "Authorized For")
    _add_field(db, doc, "validity_date", "31 March 2024", 0.90, 1, "Valid Till: 31/03/2024",
               "EXPIRED", "OEM validity has expired")

    # NO Technical Document (missing mandatory requirement)

    # Inconsistency document: Udyam with different address
    doc = _create_doc(db, bidder, "udyam_registration.pdf", "UDYAM_CERTIFICATE", "NEEDS_REVIEW", 0.78, upload_dir)
    _add_field(db, doc, "udyam_number", "UDYAM-UP-33-0099123", 0.78, 1, "Udyam No", "INVALID", "Non-standard Udyam format")
    _add_field(db, doc, "enterprise_name", "PQR Systems Limited", 0.77, 1, "Enterprise",
               "VALID", "Minor name variation — review recommended")
    _add_field(db, doc, "address", "Plot 45, Sector 63, Noida, Uttar Pradesh 201301", 0.76, 1, "Address",
               "VALID", "Address differs from GST certificate — review required")


def _seed_delta_engineering(db, bidder, requirements, upload_dir):
    doc = _create_doc(db, bidder, "gst_certificate.pdf", "GST_CERTIFICATE", "PROCESSED", 0.95, upload_dir)
    _add_field(db, doc, "gstin", "33AABCD3456D1Z2", 0.95, 1, "GSTIN", "VALID", "Valid")
    _add_field(db, doc, "company_name", "Delta Engineering Solutions", 0.94, 1, "Legal Name")
    _add_field(db, doc, "registered_address", "321 Industrial Estate, Guindy, Chennai, Tamil Nadu 600032", 0.93, 1, "Address")

    doc = _create_doc(db, bidder, "pan_card.pdf", "PAN_CARD", "PROCESSED", 0.97, upload_dir)
    _add_field(db, doc, "pan", "AABCD3456D", 0.97, 1, "PAN", "VALID", "Valid")
    _add_field(db, doc, "name", "DELTA ENGINEERING SOLUTIONS", 0.96, 1, "Name")

    doc = _create_doc(db, bidder, "udyam_certificate.pdf", "UDYAM_CERTIFICATE", "PROCESSED", 0.93, upload_dir)
    _add_field(db, doc, "udyam_number", "UDYAM-TN-04-0045678", 0.93, 1, "Udyam", "VALID", "Valid")
    _add_field(db, doc, "enterprise_name", "Delta Engineering Solutions", 0.92, 1, "Enterprise")
    _add_field(db, doc, "address", "321 Industrial Estate, Guindy, Chennai, Tamil Nadu 600032", 0.91, 1, "Address")

    doc = _create_doc(db, bidder, "experience_certificate.pdf", "EXPERIENCE_CERTIFICATE", "PROCESSED", 0.91, upload_dir)
    _add_field(db, doc, "company_name", "Delta Engineering Solutions", 0.91, 1, "Company")
    _add_field(db, doc, "client_name", "Southern Railway", 0.90, 1, "Client")
    _add_field(db, doc, "project_description", "Installation of Railway signaling and electrical systems", 0.89, 1, "Work")
    _add_field(db, doc, "project_value", "₹3.5 Crores", 0.88, 1, "Value")

    doc = _create_doc(db, bidder, "oem_authorization.pdf", "OEM_AUTHORIZATION", "PROCESSED", 0.93, upload_dir)
    _add_field(db, doc, "manufacturer_name", "L&T Electrical", 0.93, 1, "OEM")
    _add_field(db, doc, "authorized_dealer", "Delta Engineering Solutions", 0.92, 1, "Authorized For")
    _add_field(db, doc, "validity_date", "31 March 2026", 0.91, 1, "Valid Till", "VALID", "Valid")

    doc = _create_doc(db, bidder, "technical_document.pdf", "TECHNICAL_DOCUMENT", "PROCESSED", 0.89, upload_dir)
    _add_field(db, doc, "company_name", "Delta Engineering Solutions", 0.89, 1, "Company")
    _add_field(db, doc, "product_name", "Railway Electrical Panel Boards", 0.88, 1, "Product")


def _seed_nova_industries(db, bidder, requirements, upload_dir):
    doc = _create_doc(db, bidder, "gst_certificate.pdf", "GST_CERTIFICATE", "PROCESSED", 0.94, upload_dir)
    _add_field(db, doc, "gstin", "24AABCN7890E1Z8", 0.94, 1, "GSTIN", "VALID", "Valid")
    _add_field(db, doc, "company_name", "Nova Industries Pvt Ltd", 0.93, 1, "Legal Name")
    _add_field(db, doc, "registered_address", "654 GIDC Vatva Industrial Estate, Ahmedabad, Gujarat 382445", 0.92, 1, "Address")

    doc = _create_doc(db, bidder, "pan_card.jpg", "PAN_CARD", "PROCESSED", 0.95, upload_dir, "true")
    _add_field(db, doc, "pan", "AABCN7890E", 0.95, 1, "PAN", "VALID", "Valid")
    _add_field(db, doc, "name", "NOVA INDUSTRIES PVT LTD", 0.94, 1, "Name")

    doc = _create_doc(db, bidder, "udyam_certificate.pdf", "UDYAM_CERTIFICATE", "PROCESSED", 0.92, upload_dir)
    _add_field(db, doc, "udyam_number", "UDYAM-GJ-05-0056789", 0.92, 1, "Udyam", "VALID", "Valid")
    _add_field(db, doc, "enterprise_name", "Nova Industries Pvt Ltd", 0.91, 1, "Enterprise")
    _add_field(db, doc, "address", "654 GIDC Vatva Industrial Estate, Ahmedabad, Gujarat 382445", 0.90, 1, "Address")

    # Experience inconsistency: Company name "Nova Industries" vs "Nova Industry"
    doc = _create_doc(db, bidder, "experience_certificate.pdf", "EXPERIENCE_CERTIFICATE", "NEEDS_REVIEW", 0.82, upload_dir)
    _add_field(db, doc, "company_name", "Nova Industry Pvt Ltd", 0.82, 1, "Company Name on Certificate",
               "VALID", "Minor variation from registered name — review recommended")
    _add_field(db, doc, "client_name", "Western Railway", 0.81, 1, "Client")
    _add_field(db, doc, "project_description", "Electrical wiring and panel installation for railway quarters", 0.80, 1, "Work")
    _add_field(db, doc, "project_value", "₹1.2 Crores", 0.79, 1, "Value")

    doc = _create_doc(db, bidder, "oem_authorization.pdf", "OEM_AUTHORIZATION", "PROCESSED", 0.91, upload_dir)
    _add_field(db, doc, "manufacturer_name", "Havells India Ltd", 0.91, 1, "OEM")
    _add_field(db, doc, "authorized_dealer", "Nova Industries Pvt Ltd", 0.90, 1, "Authorized For")
    _add_field(db, doc, "validity_date", "30 September 2025", 0.89, 1, "Valid Till", "VALID", "Valid")

    doc = _create_doc(db, bidder, "technical_document.pdf", "TECHNICAL_DOCUMENT", "PROCESSED", 0.88, upload_dir)
    _add_field(db, doc, "company_name", "Nova Industries Pvt Ltd", 0.88, 1, "Company")
    _add_field(db, doc, "product_name", "LV Distribution Panels", 0.87, 1, "Product")


def _seed_compliance(db, bidders, requirements):
    # ABC — All verified
    abc = bidders[0]
    req_map = {r.name: r for r in requirements}
    compliance_data = {
        "ABC Technologies Pvt Ltd": {
            "GST Certificate": ("VERIFIED", "GST certificate verified. GSTIN: 29AABCA1234A1Z5", "gst_certificate.pdf | GSTIN: 29AABCA1234A1Z5"),
            "PAN Card": ("VERIFIED", "PAN card verified. PAN: AABCA1234A", "pan_card.pdf | PAN: AABCA1234A"),
            "Udyam Certificate": ("VERIFIED", "Udyam certificate verified", "udyam_certificate.pdf"),
            "Experience Certificate": ("VERIFIED", "Experience with South Western Railway verified", "experience_certificate.pdf"),
            "OEM Authorization": ("VERIFIED", "Siemens OEM Authorization valid until December 2025", "oem_authorization.pdf"),
            "Technical Document": ("VERIFIED", "Technical specifications provided", "technical_document.pdf"),
        },
        "XYZ Electricals Pvt Ltd": {
            "GST Certificate": ("VERIFIED", "GST certificate verified. GSTIN: 27AABCX5678B1Z3", "gst_certificate.pdf"),
            "PAN Card": ("VERIFIED", "PAN verified via OCR scan", "pan_card.jpg"),
            "Udyam Certificate": ("VERIFIED", "Udyam verified", "udyam_certificate.pdf"),
            "Experience Certificate": ("VERIFIED", "Mumbai Metro experience verified", "experience_certificate.pdf"),
            "OEM Authorization": ("VERIFIED", "ABB OEM Authorization valid until June 2025", "oem_authorization.pdf"),
            "Technical Document": ("VERIFIED", "Technical specs provided", "technical_specs.pdf"),
        },
        "PQR Systems Ltd": {
            "GST Certificate": ("VERIFIED", "GST certificate verified. GSTIN: 07AABCP9012C1Z1", "gst_certificate.pdf"),
            "PAN Card": ("VERIFIED", "PAN verified", "pan_card.pdf"),
            "Udyam Certificate": ("REVIEW", "Udyam certificate has format issues and address discrepancy — review required", "udyam_registration.pdf"),
            "Experience Certificate": ("VERIFIED", "Delhi Metro experience verified", "experience_certificate.pdf"),
            "OEM Authorization": ("REVIEW", "OEM Authorization has expired (31 March 2024) — updated authorization required", "oem_authorization.pdf"),
            "Technical Document": ("MISSING", "No technical document uploaded", None),
        },
        "Delta Engineering Solutions": {
            "GST Certificate": ("VERIFIED", "GST certificate verified", "gst_certificate.pdf"),
            "PAN Card": ("VERIFIED", "PAN verified", "pan_card.pdf"),
            "Udyam Certificate": ("VERIFIED", "Udyam verified", "udyam_certificate.pdf"),
            "Experience Certificate": ("VERIFIED", "Southern Railway experience verified", "experience_certificate.pdf"),
            "OEM Authorization": ("VERIFIED", "L&T OEM Authorization valid until March 2026", "oem_authorization.pdf"),
            "Technical Document": ("VERIFIED", "Technical specs provided", "technical_document.pdf"),
        },
        "Nova Industries Pvt Ltd": {
            "GST Certificate": ("VERIFIED", "GST certificate verified", "gst_certificate.pdf"),
            "PAN Card": ("VERIFIED", "PAN verified via OCR", "pan_card.jpg"),
            "Udyam Certificate": ("VERIFIED", "Udyam verified", "udyam_certificate.pdf"),
            "Experience Certificate": ("REVIEW", "Company name on experience certificate differs slightly ('Nova Industry' vs 'Nova Industries') — review required", "experience_certificate.pdf"),
            "OEM Authorization": ("VERIFIED", "Havells OEM Authorization valid until September 2025", "oem_authorization.pdf"),
            "Technical Document": ("VERIFIED", "Technical specs provided", "technical_document.pdf"),
        }
    }

    for bidder in bidders:
        bidder_compliance = compliance_data.get(bidder.company_name, {})
        for req_name, (status, reason, evidence) in bidder_compliance.items():
            req = req_map.get(req_name)
            if req:
                cr = ComplianceResult(
                    bidder_id=bidder.id,
                    requirement_id=req.id,
                    status=status,
                    reason=reason,
                    evidence=evidence
                )
                db.add(cr)
    db.flush()
    print("✅ Created compliance results")


def _seed_risk_signals(db, bidders):
    bidder_map = {b.company_name: b for b in bidders}

    risk_data = [
        # PQR Systems risks
        ("PQR Systems Ltd", "EXPIRED_DOCUMENT", "OEM Authorization from Schneider Electric India expired on 31 March 2024", "HIGH", "oem_authorization.pdf", "Validity Date: 31/03/2024 — past today's date"),
        ("PQR Systems Ltd", "MISSING_DOCUMENT", "Mandatory Technical Document not uploaded", "HIGH", "Requirement: Technical Document", "Expected document type: TECHNICAL_DOCUMENT"),
        ("PQR Systems Ltd", "ADDRESS_MISMATCH", "Registered address differs between GST Certificate (New Delhi) and Udyam Certificate (Noida)", "MEDIUM", "gst_certificate.pdf vs udyam_registration.pdf", "GST Address: Nehru Place, New Delhi | Udyam Address: Sector 63, Noida"),
        ("PQR Systems Ltd", "NAME_MISMATCH", "Company name on Udyam registration shows 'PQR Systems Limited' vs registered 'PQR Systems Ltd'", "LOW", "udyam_registration.pdf", "'PQR Systems Limited' vs 'PQR Systems Ltd'"),

        # Delta Engineering risks
        ("Delta Engineering Solutions", "RELATIONSHIP_SIGNAL", "Director 'Rajesh Kumar' also appears as director in ABC Technologies Pvt Ltd — potential shared director signal", "MEDIUM", "Director database cross-check", "Rajesh Kumar (DIN: 01234567) is director in both Delta Engineering Solutions and ABC Technologies Pvt Ltd"),

        # Nova Industries risks
        ("Nova Industries Pvt Ltd", "NAME_MISMATCH", "Experience certificate issued in name 'Nova Industry Pvt Ltd' — differs from registered company name 'Nova Industries Pvt Ltd'", "MEDIUM", "experience_certificate.pdf", "Registered: 'Nova Industries Pvt Ltd' | Certificate: 'Nova Industry Pvt Ltd'"),
        ("Nova Industries Pvt Ltd", "HISTORICAL_CHANGES", "Company incorporated in 2018 — limited procurement history available for comprehensive risk assessment", "LOW", "Procurement History", "Company is relatively new — limited track record"),
    ]

    for company_name, risk_type, description, severity, source, evidence in risk_data:
        bidder = bidder_map.get(company_name)
        if bidder:
            rs = RiskSignal(
                bidder_id=bidder.id,
                risk_type=risk_type,
                description=description,
                severity=severity,
                source=source,
                evidence=evidence,
                status="OPEN"
            )
            db.add(rs)
    db.flush()
    print("✅ Created risk signals")


def _seed_procurement_history(db, bidders, tender_id):
    # ABC and XYZ have prior history
    history_data = [
        (bidders[0].id, tender_id, "ACTIVE", "PENDING", "Participating in current tender. Previously won TND-2022-RAIL-003."),
        (bidders[1].id, tender_id, "ACTIVE", "PENDING", "Participating in current tender. Previously submitted bids for 2 railway tenders."),
        (bidders[2].id, tender_id, "ACTIVE", "PENDING", "First railway sector tender for PQR Systems."),
        (bidders[3].id, tender_id, "ACTIVE", "PENDING", "Delta Engineering participated in TND-2023-ELEC-002. Address change recorded in previous tender."),
        (bidders[4].id, tender_id, "ACTIVE", "PENDING", "Nova Industries new entrant to railway procurement."),
    ]
    for bidder_id, t_id, p_status, outcome, notes in history_data:
        ph = ProcurementHistory(
            bidder_id=bidder_id,
            tender_id=t_id,
            participation_status=p_status,
            outcome=outcome,
            notes=notes
        )
        db.add(ph)
    db.flush()
    print("✅ Created procurement history")


if __name__ == "__main__":
    main()
