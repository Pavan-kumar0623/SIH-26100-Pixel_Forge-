"""
ProcureAI — OCR & Text Extraction Service
- PyMuPDF: Native vector text extraction from digital PDFs (fast & high fidelity)
- Pytesseract: Native Tesseract OCR for scanned PDFs and raster image documents (PNG, JPG)
- Auto-detects Tesseract binary on Windows, Linux, and macOS
"""
import os
import shutil
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional
from PIL import Image, ImageOps
try:
    import pymupdf as fitz  # newer pymupdf alias
except ImportError:
    import fitz  # fallback for older installations
import pytesseract

from config import get_settings

logger = logging.getLogger("procure_ai.ocr")
settings = get_settings()

TEXT_QUALITY_THRESHOLD = 80  # minimum characters to consider digital text extraction sufficient


def find_tesseract_binary() -> Optional[str]:
    """
    Locate Tesseract executable on the host system.
    Searches:
    1. Config settings / environment variable TESSERACT_CMD
    2. System PATH (via shutil.which)
    3. Common Windows installation directories
    4. Common Linux / macOS paths
    """
    custom_cmd = settings.tesseract_cmd or os.environ.get("TESSERACT_CMD", "").strip()
    if custom_cmd and os.path.isfile(custom_cmd):
        return custom_cmd

    # Check system PATH
    which_path = shutil.which("tesseract")
    if which_path:
        return which_path

    # Common Windows paths
    windows_paths = [
        r"C:\Program Files\Tesseract-OCR\tesseract.exe",
        r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
        os.path.expandvars(r"%LOCALAPPDATA%\Programs\Tesseract-OCR\tesseract.exe"),
        os.path.expanduser(r"~\AppData\Local\Programs\Tesseract-OCR\tesseract.exe"),
    ]
    for p in windows_paths:
        if os.path.isfile(p):
            return p

    # Common Unix paths
    unix_paths = [
        "/usr/bin/tesseract",
        "/usr/local/bin/tesseract",
        "/opt/homebrew/bin/tesseract",
    ]
    for p in unix_paths:
        if os.path.isfile(p):
            return p

    return None


def configure_pytesseract() -> Optional[str]:
    """Configure pytesseract with the found binary path."""
    binary = find_tesseract_binary()
    if binary:
        pytesseract.pytesseract.tesseract_cmd = binary
    return binary


# Initialize at module load
_tesseract_bin = configure_pytesseract()


def get_tesseract_status() -> Dict[str, Any]:
    """Return health & diagnostic information about the Tesseract OCR installation."""
    bin_path = find_tesseract_binary()
    if not bin_path:
        return {
            "available": False,
            "status": "not_installed",
            "executable_path": None,
            "message": "Tesseract OCR executable not detected. Digital PDFs will still extract text via PyMuPDF. Install Tesseract to enable OCR for scanned documents."
        }

    try:
        configure_pytesseract()
        ver = str(pytesseract.get_tesseract_version()).strip()
        return {
            "available": True,
            "status": "ready",
            "executable_path": bin_path,
            "version": ver,
            "message": f"Tesseract OCR v{ver} ready."
        }
    except Exception as e:
        return {
            "available": False,
            "status": "error",
            "executable_path": bin_path,
            "error": str(e),
            "message": f"Tesseract binary found at {bin_path} but failed to execute: {str(e)}"
        }


def extract_text_from_pdf(file_path: str) -> Dict[str, Any]:
    """
    Extract text from PDF using PyMuPDF.
    If text quality is below threshold (scanned PDF), renders pages as images and runs Tesseract OCR.
    """
    try:
        doc = fitz.open(file_path)
        full_text = ""
        pages_data = []

        for page_num in range(len(doc)):
            page = doc[page_num]
            page_text = page.get_text("text").strip()
            pages_data.append({
                "page_number": page_num + 1,
                "text": page_text,
                "text_length": len(page_text)
            })
            full_text += page_text + "\n"

        doc.close()
        total_text = full_text.strip()

        # If digital text exists in reasonable quantity, return PyMuPDF result
        if len(total_text) >= TEXT_QUALITY_THRESHOLD:
            return {
                "text": total_text,
                "ocr_used": False,
                "pages": pages_data,
                "method": "pymupdf_text"
            }

        # Insufficient embedded text: attempt OCR
        return _ocr_pdf_pages(file_path, existing_pages=pages_data)

    except Exception as e:
        # Check if file is readable text (e.g. mock/seeded files or plain text with pdf extension)
        try:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read().strip()
            if len(content) > 5:
                return {
                    "text": content,
                    "ocr_used": False,
                    "pages": [{"page_number": 1, "text": content, "text_length": len(content)}],
                    "method": "text_fallback"
                }
        except Exception:
            pass

        logger.error(f"Failed to extract text from PDF {file_path}: {e}")
        return {
            "text": "",
            "ocr_used": False,
            "pages": [],
            "method": "failed",
            "error": str(e)
        }


def _ocr_pdf_pages(file_path: str, existing_pages: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
    """Render PDF pages as images and run native Tesseract OCR via pytesseract."""
    status = get_tesseract_status()
    if not status["available"]:
        # Fall back to whatever PyMuPDF found
        fallback_text = "\n".join(p["text"] for p in (existing_pages or []))
        return {
            "text": fallback_text.strip(),
            "ocr_used": False,
            "pages": existing_pages or [],
            "method": "pymupdf_fallback",
            "note": "Document appears to be scanned, but Tesseract OCR is not installed on the system."
        }

    try:
        configure_pytesseract()
        doc = fitz.open(file_path)
        full_text = ""
        pages_data = []

        for page_num in range(len(doc)):
            page = doc[page_num]
            # Render page at 2.0x resolution for sharp OCR
            mat = fitz.Matrix(2.0, 2.0)
            pix = page.get_pixmap(matrix=mat)
            
            # Convert PyMuPDF pixmap to PIL Image
            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
            
            # Preprocess image
            img = ImageOps.grayscale(img)

            # Perform OCR
            page_text = pytesseract.image_to_string(img, config="--psm 1").strip()
            
            # If psm 1 returned empty, retry default
            if not page_text:
                page_text = pytesseract.image_to_string(img).strip()

            pages_data.append({
                "page_number": page_num + 1,
                "text": page_text,
                "text_length": len(page_text)
            })
            full_text += page_text + "\n"

        doc.close()
        return {
            "text": full_text.strip(),
            "ocr_used": True,
            "pages": pages_data,
            "method": "native_tesseract_ocr"
        }

    except Exception as e:
        logger.error(f"OCR failed for {file_path}: {e}")
        fallback_text = "\n".join(p["text"] for p in (existing_pages or []))
        return {
            "text": fallback_text.strip(),
            "ocr_used": True,
            "pages": existing_pages or [],
            "method": "ocr_failed",
            "error": str(e)
        }


def extract_text_from_image(file_path: str) -> Dict[str, Any]:
    """Extract text from an image file using native Tesseract OCR."""
    status = get_tesseract_status()
    if not status["available"]:
        return {
            "text": "",
            "ocr_used": False,
            "pages": [],
            "method": "unsupported",
            "error": "Tesseract OCR executable is not available on this server to process image files."
        }

    try:
        configure_pytesseract()
        with Image.open(file_path) as img:
            img = ImageOps.exif_transpose(img)
            img = ImageOps.grayscale(img)
            text = pytesseract.image_to_string(img).strip()

        return {
            "text": text,
            "ocr_used": True,
            "pages": [{"page_number": 1, "text": text, "text_length": len(text)}],
            "method": "native_tesseract_ocr"
        }
    except Exception as e:
        logger.error(f"Image OCR error for {file_path}: {e}")
        return {
            "text": "",
            "ocr_used": True,
            "pages": [],
            "method": "ocr_failed",
            "error": str(e)
        }


def extract_text(file_path: str) -> Dict[str, Any]:
    """
    Main extraction entry point:
    Inspects file extension and delegates to appropriate text extractor.
    """
    ext = Path(file_path).suffix.lower()
    if ext == ".pdf":
        return extract_text_from_pdf(file_path)
    elif ext in [".png", ".jpg", ".jpeg", ".tiff", ".bmp", ".webp"]:
        return extract_text_from_image(file_path)
    else:
        return {
            "text": "",
            "ocr_used": False,
            "pages": [],
            "method": "unsupported_format",
            "error": f"Unsupported file format: {ext}"
        }
