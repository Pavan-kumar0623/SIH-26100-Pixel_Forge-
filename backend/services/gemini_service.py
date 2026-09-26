"""
Gemini Service
- Document Classification
- Structured Data Extraction per document type
API key is loaded from .env — never exposed to frontend
"""
import json
import re
import logging
import warnings
from typing import Optional

with warnings.catch_warnings():
    warnings.simplefilter("ignore")
    import google.generativeai as genai

from config import get_settings

logger = logging.getLogger("procure_ai.gemini")
settings = get_settings()

def get_gemini_model():
    get_settings.cache_clear()
    current_settings = get_settings()
    key = current_settings.active_gemini_key
    has_key = bool(
        key
        and key != "your_gemini_api_key_here"
        and len(key) > 10
    )
    if has_key:
        try:
            genai.configure(api_key=key)
            model = genai.GenerativeModel("gemini-1.5-flash")
            # Quick check that the model object was created
            return model
        except Exception as e:
            logger.warning(f"Gemini model init failed: {e}. Using rule-based fallback.")
            return None
    return None

SUPPORTED_DOCUMENT_TYPES = [
    "GST_CERTIFICATE",
    "PAN_CARD",
    "UDYAM_CERTIFICATE",
    "INCORPORATION_CERTIFICATE",
    "EXPERIENCE_CERTIFICATE",
    "OEM_AUTHORIZATION",
    "TECHNICAL_DOCUMENT",
    "FINANCIAL_DOCUMENT"
]


def classify_document(text: str) -> dict:
    """
    Use Gemini to classify the document type from extracted text.
    Returns: {document_type, is_supported, confidence}
    """
    if not text or len(text.strip()) < 10:
        return {
            "document_type": "UNKNOWN",
            "is_supported": False,
            "confidence": 0.0,
            "error": "Insufficient text for classification"
        }

    prompt = f"""You are a procurement document classifier. Analyze the following document text and classify it.

Supported document types:
- GST_CERTIFICATE: GST registration certificate from Indian tax authority
- PAN_CARD: Permanent Account Number card issued by Income Tax Department
- UDYAM_CERTIFICATE: MSME/Udyam registration certificate
- INCORPORATION_CERTIFICATE: Certificate of Incorporation from ROC/MCA
- EXPERIENCE_CERTIFICATE: Work experience certificate or completion certificate
- OEM_AUTHORIZATION: Original Equipment Manufacturer authorization letter
- TECHNICAL_DOCUMENT: Technical specification document, brochure, or data sheet
- FINANCIAL_DOCUMENT: Financial statements, audit report, or balance sheet

Return ONLY a valid JSON object with no markdown:
{{
  "document_type": "<type from list above or UNKNOWN>",
  "is_supported": true or false,
  "confidence": 0.0 to 1.0
}}

Document text:
{text[:3000]}"""

    model = get_gemini_model()
    if not model:
        # Keyword-based fallback classification when GEMINI_API_KEY is not configured
        upper_text = text.upper()
        doc_type = "TECHNICAL_DOCUMENT"
        if "GSTIN" in upper_text or "GOODS AND SERVICES TAX" in upper_text:
            doc_type = "GST_CERTIFICATE"
        elif "INCOME TAX DEPARTMENT" in upper_text or "PERMANENT ACCOUNT NUMBER" in upper_text:
            doc_type = "PAN_CARD"
        elif "UDYAM" in upper_text or "MSME" in upper_text:
            doc_type = "UDYAM_CERTIFICATE"
        elif "CERTIFICATE OF INCORPORATION" in upper_text or "REGISTRAR OF COMPANIES" in upper_text:
            doc_type = "INCORPORATION_CERTIFICATE"
        elif "AUTHORIZATION" in upper_text or "AUTHORISED DISTRIBUTOR" in upper_text:
            doc_type = "OEM_AUTHORIZATION"
        elif "EXPERIENCE" in upper_text or "COMPLETION CERTIFICATE" in upper_text:
            doc_type = "EXPERIENCE_CERTIFICATE"

        return {
            "document_type": doc_type,
            "is_supported": doc_type in SUPPORTED_DOCUMENT_TYPES,
            "confidence": 0.85
        }

    try:
        response = model.generate_content(prompt)
        raw = response.text.strip()
        # Strip markdown code fences if present
        raw = re.sub(r"```json\s*", "", raw)
        raw = re.sub(r"```\s*", "", raw)
        result = json.loads(raw)
        result["is_supported"] = result.get("document_type") in SUPPORTED_DOCUMENT_TYPES
        return result
    except Exception as e:
        logger.warning(f"Gemini classification failed ({e}). Falling back to keyword classification.")
        upper_text = text.upper()
        doc_type = "TECHNICAL_DOCUMENT"
        if "GSTIN" in upper_text or "GOODS AND SERVICES TAX" in upper_text:
            doc_type = "GST_CERTIFICATE"
        elif "INCOME TAX DEPARTMENT" in upper_text or "PERMANENT ACCOUNT NUMBER" in upper_text:
            doc_type = "PAN_CARD"
        elif "UDYAM" in upper_text or "MSME" in upper_text:
            doc_type = "UDYAM_CERTIFICATE"
        elif "CERTIFICATE OF INCORPORATION" in upper_text or "REGISTRAR OF COMPANIES" in upper_text:
            doc_type = "INCORPORATION_CERTIFICATE"
        elif "AUTHORIZATION" in upper_text or "AUTHORISED DISTRIBUTOR" in upper_text:
            doc_type = "OEM_AUTHORIZATION"
        elif "EXPERIENCE" in upper_text or "COMPLETION CERTIFICATE" in upper_text:
            doc_type = "EXPERIENCE_CERTIFICATE"
        elif "BALANCE SHEET" in upper_text or "PROFIT" in upper_text or "AUDIT" in upper_text:
            doc_type = "FINANCIAL_DOCUMENT"

        return {
            "document_type": doc_type,
            "is_supported": doc_type in SUPPORTED_DOCUMENT_TYPES,
            "confidence": 0.80,
            "note": f"Keyword classification used (Gemini error: {e})"
        }


def extract_structured_data(text: str, document_type: str) -> dict:
    """
    Use Gemini to extract structured fields from document text.
    Uses document-type-specific schemas.
    Rule: Return null for any field not explicitly found in the text.
    """
    schema = _get_extraction_schema(document_type)
    if not schema:
        return {"error": f"No extraction schema for document type: {document_type}"}

    model = get_gemini_model()
    if not model:
        # Regex-based fallback extraction when GEMINI_API_KEY is not configured
        res = {"document_type": document_type}
        gst_match = re.search(r"\b\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z0-9]{1}Z[A-Z0-9]{1}\b", text)
        pan_match = re.search(r"\b[A-Z]{5}\d{4}[A-Z]{1}\b", text)
        udyam_match = re.search(r"\bUDYAM-[A-Z]{2}-\d{2}-\d{7}\b", text)
        cin_match = re.search(r"\b[LU]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6}\b", text)

        if gst_match: res["gstin"] = gst_match.group(0)
        if pan_match: res["pan"] = pan_match.group(0)
        if udyam_match: res["udyam_number"] = udyam_match.group(0)
        if cin_match: res["cin"] = cin_match.group(0)

        return res

    prompt = f"""You are a precise procurement document data extractor.

CRITICAL RULES:
- Extract ONLY information explicitly present in the document text
- Return null for any field you cannot find clearly stated
- NEVER invent, guess, or hallucinate: GSTIN, PAN, Udyam number, CIN, company names, addresses, dates, amounts, or names
- Return ONLY valid JSON, no markdown, no explanation

Document type: {document_type}

Required JSON output schema:
{json.dumps(schema, indent=2)}

Document text:
{text[:4000]}

Return the completed JSON object:"""

    try:
        response = model.generate_content(prompt)
        raw = response.text.strip()
        raw = re.sub(r"```json\s*", "", raw)
        raw = re.sub(r"```\s*", "", raw)
        result = json.loads(raw)
        result["document_type"] = document_type
        return result
    except Exception as e:
        logger.warning(f"Gemini extraction failed ({e}). Falling back to regex extraction.")
        res = {"document_type": document_type, "note": f"Regex extraction used (Gemini error: {e})"}
        gst_match = re.search(r"\b\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z0-9]{1}Z[A-Z0-9]{1}\b", text)
        pan_match = re.search(r"\b[A-Z]{5}\d{4}[A-Z]{1}\b", text)
        udyam_match = re.search(r"\bUDYAM-[A-Z]{2}-\d{2}-\d{7}\b", text)
        cin_match = re.search(r"\b[LU]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6}\b", text)

        if gst_match: res["gstin"] = gst_match.group(0)
        if pan_match: res["pan"] = pan_match.group(0)
        if udyam_match: res["udyam_number"] = udyam_match.group(0)
        if cin_match: res["cin"] = cin_match.group(0)

        # Basic company name detection
        comp_match = re.search(r"(?:M/s\.?|Name(?:\s+of\s+Taxpayer)?[:\s]+)([A-Z0-9\s.,&'-]+(?:PRIVATE\s+LIMITED|PVT\s+LTD|LIMITED|LLP|CORP))", text, re.I)
        if comp_match:
            res["company_name"] = comp_match.group(1).strip()

        return res


def _get_extraction_schema(document_type: str) -> Optional[dict]:
    """Return the extraction schema for each document type."""
    schemas = {
        "GST_CERTIFICATE": {
            "document_type": "GST_CERTIFICATE",
            "company_name": None,
            "gstin": None,
            "registered_address": None,
            "registration_date": None,
            "trade_name": None,
            "constitution_of_business": None,
            "evidence": []
        },
        "PAN_CARD": {
            "document_type": "PAN_CARD",
            "pan": None,
            "name": None,
            "father_name": None,
            "date_of_birth": None,
            "evidence": []
        },
        "UDYAM_CERTIFICATE": {
            "document_type": "UDYAM_CERTIFICATE",
            "udyam_number": None,
            "enterprise_name": None,
            "address": None,
            "date_of_registration": None,
            "major_activity": None,
            "nic_code": None,
            "evidence": []
        },
        "INCORPORATION_CERTIFICATE": {
            "document_type": "INCORPORATION_CERTIFICATE",
            "company_name": None,
            "cin": None,
            "incorporation_date": None,
            "registered_address": None,
            "company_type": None,
            "evidence": []
        },
        "EXPERIENCE_CERTIFICATE": {
            "document_type": "EXPERIENCE_CERTIFICATE",
            "company_name": None,
            "client_name": None,
            "project_description": None,
            "project_value": None,
            "start_date": None,
            "end_date": None,
            "certificate_date": None,
            "evidence": []
        },
        "OEM_AUTHORIZATION": {
            "document_type": "OEM_AUTHORIZATION",
            "manufacturer_name": None,
            "authorized_dealer": None,
            "product_scope": None,
            "validity_date": None,
            "authorization_number": None,
            "evidence": []
        },
        "TECHNICAL_DOCUMENT": {
            "document_type": "TECHNICAL_DOCUMENT",
            "company_name": None,
            "product_name": None,
            "technical_specs": None,
            "certifications": [],
            "standards_compliance": None,
            "evidence": []
        },
        "FINANCIAL_DOCUMENT": {
            "document_type": "FINANCIAL_DOCUMENT",
            "company_name": None,
            "financial_year": None,
            "annual_turnover": None,
            "net_worth": None,
            "profit_loss": None,
            "auditor_name": None,
            "evidence": []
        }
    }
    return schemas.get(document_type)


def detect_cross_document_inconsistencies(extracted_data_list: list) -> list:
    """
    Use Gemini to find semantic inconsistencies across multiple extracted documents.
    Returns list of inconsistency findings.
    """
    if len(extracted_data_list) < 2:
        return []

    prompt = f"""You are a procurement compliance analyst checking for inconsistencies.

Analyze the following extracted data from multiple documents for the SAME company and identify any inconsistencies.

Check for:
- Company name variations (e.g., "ABC Technologies" vs "ABC Technology")
- Address mismatches across documents
- GSTIN appearing in one doc but not matching another
- PAN inconsistencies
- Udyam number inconsistencies
- Incorporation date conflicts
- Director name variations

Return ONLY a JSON array of findings (empty array if no inconsistencies):
[
  {{
    "field": "company_name",
    "doc1_source": "GST_CERTIFICATE",
    "doc1_value": "...",
    "doc2_source": "UDYAM_CERTIFICATE",
    "doc2_value": "...",
    "description": "Potential company name inconsistency",
    "severity": "MEDIUM"
  }}
]

Extracted data:
{json.dumps(extracted_data_list, indent=2)[:3000]}"""

    model = get_gemini_model()
    if not model:
        # Rule-based fallback cross-check
        findings = []
        company_names = {}
        for doc in extracted_data_list:
            dt = doc.get("document_type") or doc.get("doc_type") or "UNKNOWN"
            data = doc.get("data") or doc
            c_name = data.get("company_name") or data.get("legal_name") or data.get("enterprise_name")
            if c_name:
                company_names[dt] = c_name

        # If different documents have noticeably different names
        names = list(company_names.values())
        if len(names) >= 2:
            import difflib
            for dt1, n1 in company_names.items():
                for dt2, n2 in company_names.items():
                    if dt1 < dt2:
                        ratio = difflib.SequenceMatcher(None, n1.lower(), n2.lower()).ratio()
                        if ratio < 0.85:
                            findings.append({
                                "field": "company_name",
                                "doc1_source": dt1,
                                "doc1_value": n1,
                                "doc2_source": dt2,
                                "doc2_value": n2,
                                "description": f"Company name discrepancy between {dt1} and {dt2} ({n1} vs {n2})",
                                "severity": "MEDIUM"
                            })
        return findings

    try:
        response = model.generate_content(prompt)
        raw = response.text.strip()
        raw = re.sub(r"```json\s*", "", raw)
        raw = re.sub(r"```\s*", "", raw)
        return json.loads(raw)
    except Exception:
        return []
