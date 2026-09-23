"""
Pydantic Validation Service
Deterministic validation of extracted procurement data.
Separates AI extraction from verified compliance data.
"""
import re
from typing import Optional, Tuple
from datetime import datetime, date
from dateutil import parser as date_parser


# ─── Format Validators ────────────────────────────────────────────────────────

GSTIN_PATTERN = re.compile(
    r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$"
)
PAN_PATTERN = re.compile(r"^[A-Z]{5}[0-9]{4}[A-Z]{1}$")
UDYAM_PATTERN = re.compile(r"^UDYAM-[A-Z]{2}-\d{2}-\d{7}$")
CIN_PATTERN = re.compile(r"^[UL]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6}$")


def validate_gstin(value: Optional[str]) -> Tuple[str, str]:
    """Returns (status, message). status: VALID, INVALID, MISSING"""
    if not value:
        return "MISSING", "GSTIN not found in document"
    cleaned = value.strip().upper().replace(" ", "")
    if GSTIN_PATTERN.match(cleaned):
        return "VALID", f"GSTIN format valid: {cleaned}"
    return "INVALID", f"GSTIN format invalid: '{value}' does not match expected 15-character pattern"


def validate_pan(value: Optional[str]) -> Tuple[str, str]:
    if not value:
        return "MISSING", "PAN not found in document"
    cleaned = value.strip().upper().replace(" ", "")
    if PAN_PATTERN.match(cleaned):
        return "VALID", f"PAN format valid: {cleaned}"
    return "INVALID", f"PAN format invalid: '{value}' does not match AAAAA9999A pattern"


def validate_udyam(value: Optional[str]) -> Tuple[str, str]:
    if not value:
        return "MISSING", "Udyam number not found in document"
    cleaned = value.strip().upper().replace(" ", "")
    if UDYAM_PATTERN.match(cleaned):
        return "VALID", f"Udyam number format valid: {cleaned}"
    return "INVALID", f"Udyam format invalid: '{value}' should be UDYAM-XX-00-0000000"


def validate_cin(value: Optional[str]) -> Tuple[str, str]:
    if not value:
        return "MISSING", "CIN not found in document"
    cleaned = value.strip().upper().replace(" ", "")
    if CIN_PATTERN.match(cleaned):
        return "VALID", f"CIN format valid: {cleaned}"
    return "INVALID", f"CIN format invalid: '{value}'"


def validate_date(value: Optional[str], field_name: str = "Date") -> Tuple[str, str]:
    if not value:
        return "MISSING", f"{field_name} not found in document"
    try:
        parsed = date_parser.parse(value, dayfirst=True)
        return "VALID", f"{field_name} parsed: {parsed.strftime('%d %b %Y')}"
    except Exception:
        return "INVALID", f"{field_name} format unrecognized: '{value}'"


def validate_expiry_date(value: Optional[str], field_name: str = "Validity") -> Tuple[str, str]:
    status, msg = validate_date(value, field_name)
    if status == "VALID":
        try:
            parsed = date_parser.parse(value, dayfirst=True)
            if parsed.date() < date.today():
                return "EXPIRED", f"{field_name} has expired: {parsed.strftime('%d %b %Y')}"
        except Exception:
            pass
    return status, msg


# ─── Per-Document Validators ───────────────────────────────────────────────────

def validate_gst_certificate(data: dict) -> list:
    results = []
    gstin_status, gstin_msg = validate_gstin(data.get("gstin"))
    results.append({
        "field_name": "gstin",
        "field_value": data.get("gstin"),
        "validation_status": gstin_status,
        "validation_message": gstin_msg,
        "confidence": data.get("_confidence", 0.85)
    })
    if data.get("company_name"):
        results.append({
            "field_name": "company_name",
            "field_value": data.get("company_name"),
            "validation_status": "VALID",
            "validation_message": "Company name extracted",
            "confidence": data.get("_confidence", 0.85)
        })
    if data.get("registered_address"):
        results.append({
            "field_name": "registered_address",
            "field_value": data.get("registered_address"),
            "validation_status": "VALID",
            "validation_message": "Address extracted",
            "confidence": data.get("_confidence", 0.85)
        })
    if data.get("registration_date"):
        d_status, d_msg = validate_date(data.get("registration_date"), "Registration date")
        results.append({
            "field_name": "registration_date",
            "field_value": data.get("registration_date"),
            "validation_status": d_status,
            "validation_message": d_msg,
            "confidence": data.get("_confidence", 0.85)
        })
    return results


def validate_pan_card(data: dict) -> list:
    results = []
    pan_status, pan_msg = validate_pan(data.get("pan"))
    results.append({
        "field_name": "pan",
        "field_value": data.get("pan"),
        "validation_status": pan_status,
        "validation_message": pan_msg,
        "confidence": data.get("_confidence", 0.85)
    })
    if data.get("name"):
        results.append({
            "field_name": "name",
            "field_value": data.get("name"),
            "validation_status": "VALID",
            "validation_message": "Name extracted",
            "confidence": data.get("_confidence", 0.85)
        })
    return results


def validate_udyam_certificate(data: dict) -> list:
    results = []
    u_status, u_msg = validate_udyam(data.get("udyam_number"))
    results.append({
        "field_name": "udyam_number",
        "field_value": data.get("udyam_number"),
        "validation_status": u_status,
        "validation_message": u_msg,
        "confidence": data.get("_confidence", 0.85)
    })
    if data.get("enterprise_name"):
        results.append({
            "field_name": "enterprise_name",
            "field_value": data.get("enterprise_name"),
            "validation_status": "VALID",
            "validation_message": "Enterprise name extracted",
            "confidence": data.get("_confidence", 0.85)
        })
    if data.get("address"):
        results.append({
            "field_name": "address",
            "field_value": data.get("address"),
            "validation_status": "VALID",
            "validation_message": "Address extracted",
            "confidence": data.get("_confidence", 0.85)
        })
    return results


def validate_incorporation_certificate(data: dict) -> list:
    results = []
    cin_status, cin_msg = validate_cin(data.get("cin"))
    results.append({
        "field_name": "cin",
        "field_value": data.get("cin"),
        "validation_status": cin_status,
        "validation_message": cin_msg,
        "confidence": data.get("_confidence", 0.85)
    })
    if data.get("incorporation_date"):
        d_status, d_msg = validate_date(data.get("incorporation_date"), "Incorporation date")
        results.append({
            "field_name": "incorporation_date",
            "field_value": data.get("incorporation_date"),
            "validation_status": d_status,
            "validation_message": d_msg,
            "confidence": data.get("_confidence", 0.85)
        })
    return results


def validate_oem_authorization(data: dict) -> list:
    results = []
    if data.get("validity_date"):
        exp_status, exp_msg = validate_expiry_date(data.get("validity_date"), "OEM validity")
        results.append({
            "field_name": "validity_date",
            "field_value": data.get("validity_date"),
            "validation_status": exp_status,
            "validation_message": exp_msg,
            "confidence": data.get("_confidence", 0.85)
        })
    if data.get("manufacturer_name"):
        results.append({
            "field_name": "manufacturer_name",
            "field_value": data.get("manufacturer_name"),
            "validation_status": "VALID",
            "validation_message": "Manufacturer name extracted",
            "confidence": data.get("_confidence", 0.85)
        })
    if data.get("authorized_dealer"):
        results.append({
            "field_name": "authorized_dealer",
            "field_value": data.get("authorized_dealer"),
            "validation_status": "VALID",
            "validation_message": "Authorized dealer extracted",
            "confidence": data.get("_confidence", 0.85)
        })
    return results


def validate_experience_certificate(data: dict) -> list:
    results = []
    for f in ["company_name", "client_name", "project_description", "project_value"]:
        if data.get(f):
            results.append({
                "field_name": f,
                "field_value": str(data.get(f)),
                "validation_status": "VALID",
                "validation_message": f"{f.replace('_', ' ').title()} extracted",
                "confidence": data.get("_confidence", 0.85)
            })
    return results


def validate_financial_document(data: dict) -> list:
    results = []
    for f in ["company_name", "financial_year", "annual_turnover", "net_worth"]:
        if data.get(f):
            results.append({
                "field_name": f,
                "field_value": str(data.get(f)),
                "validation_status": "VALID",
                "validation_message": f"{f.replace('_', ' ').title()} extracted",
                "confidence": data.get("_confidence", 0.85)
            })
    return results


def validate_technical_document(data: dict) -> list:
    results = []
    for f in ["company_name", "product_name", "technical_specs"]:
        if data.get(f):
            results.append({
                "field_name": f,
                "field_value": str(data.get(f)),
                "validation_status": "VALID",
                "validation_message": f"{f.replace('_', ' ').title()} extracted",
                "confidence": data.get("_confidence", 0.85)
            })
    return results


VALIDATORS = {
    "GST_CERTIFICATE": validate_gst_certificate,
    "PAN_CARD": validate_pan_card,
    "UDYAM_CERTIFICATE": validate_udyam_certificate,
    "INCORPORATION_CERTIFICATE": validate_incorporation_certificate,
    "OEM_AUTHORIZATION": validate_oem_authorization,
    "EXPERIENCE_CERTIFICATE": validate_experience_certificate,
    "FINANCIAL_DOCUMENT": validate_financial_document,
    "TECHNICAL_DOCUMENT": validate_technical_document,
}


def validate_extracted_data(document_type: str, data: dict) -> list:
    """Main entry: validate extracted data and return field-level validation results."""
    validator = VALIDATORS.get(document_type)
    if not validator:
        return []
    return validator(data)
