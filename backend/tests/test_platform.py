"""
ProcureAI — Core Platform Test Suite
Tests API endpoints, OCR status, validation rules, compliance logic, and chatbot.
"""
import pytest
from fastapi.testclient import TestClient
import sys
import os

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app
from database import init_db, SessionLocal
from services.ocr_service import get_tesseract_status
from services.validation_service import validate_extracted_data
from services.compliance_engine import evaluate_compliance

client = TestClient(app)


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    init_db()
    yield


def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "ProcureAI Enterprise Platform"
    assert data["status"] == "operational"
    assert "modules" in data


def test_health_diagnostics():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ["healthy", "degraded"]
    assert "components" in data
    assert "database" in data["components"]
    assert "gemini_document_ai" in data["components"]
    assert "grok_procurement_assistant" in data["components"]
    assert "tesseract_ocr" in data["components"]


def test_tesseract_status():
    status = get_tesseract_status()
    assert "available" in status
    assert "status" in status
    assert "message" in status


def test_chatbot_quick_actions():
    response = client.get("/api/chatbot/quick-actions")
    assert response.status_code == 200
    actions = response.json()
    assert len(actions) >= 4
    action_ids = [a["id"] for a in actions]
    assert "summary" in action_ids
    assert "high_risk" in action_ids


def test_chatbot_query():
    payload = {
        "message": "Which bidders have high risk flags?",
        "session_id": "test-session-001"
    }
    response = client.post("/api/chatbot/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "answer" in data
    assert len(data["answer"]) > 10
    assert data["session_id"] == "test-session-001"
    assert "model_used" in data


def test_gstin_pan_validation():
    # Valid GST Certificate data
    gst_data = {
        "legal_name": "ABC Technologies Pvt Ltd",
        "gstin": "07AABCT1234F1Z5",
        "registration_date": "2018-04-12",
        "constitution_of_business": "Private Limited Company",
        "address": "Okhla Industrial Area, New Delhi"
    }
    results = validate_extracted_data("GST_CERTIFICATE", gst_data)
    statuses = {r["field_name"]: r["validation_status"] for r in results}
    assert statuses.get("gstin") == "VALID"

    # Valid PAN Card data
    pan_data = {
        "pan": "AABCT1234F",
        "name": "ABC Technologies Pvt Ltd"
    }
    pan_results = validate_extracted_data("PAN_CARD", pan_data)
    pan_statuses = {r["field_name"]: r["validation_status"] for r in pan_results}
    assert pan_statuses.get("pan") == "VALID"

    # Invalid GSTIN (bad format)
    bad_data = {
        "legal_name": "Bad Co",
        "gstin": "INVALID_GSTIN_123"
    }
    bad_results = validate_extracted_data("GST_CERTIFICATE", bad_data)
    bad_statuses = {r["field_name"]: r["validation_status"] for r in bad_results}
    assert bad_statuses.get("gstin") == "INVALID"


def test_compliance_evaluation_rule():
    # VERIFIED case
    status, reason = evaluate_compliance(
        has_doc=True,
        doc_status="PROCESSED",
        extracted_fields={"gstin": "07AABCT1234F1Z5", "legal_name": "ABC Tech"},
        validation_errors=[],
        is_expired=False,
        mandatory=True
    )
    assert status == "VERIFIED"

    # Expired case -> REVIEW
    status_exp, reason_exp = evaluate_compliance(
        has_doc=True,
        doc_status="PROCESSED",
        extracted_fields={"validity_date": "2020-01-01"},
        validation_errors=[],
        is_expired=True,
        mandatory=True
    )
    assert status_exp == "REVIEW"

    # Missing case -> MISSING
    status_mis, reason_mis = evaluate_compliance(
        has_doc=False,
        doc_status="MISSING",
        extracted_fields={},
        validation_errors=[],
        is_expired=False,
        mandatory=True
    )
    assert status_mis == "MISSING"
