from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session
from database import get_db
from services.export_service import export_csv, export_excel

router = APIRouter(tags=["Export"])


@router.get("/api/tenders/{tender_id}/export/csv")
@router.get("/api/export/csv/{tender_id}")
def export_tender_csv(tender_id: int, db: Session = Depends(get_db)):
    """Export tender comparison as CSV."""
    csv_bytes = export_csv(tender_id, db)
    return Response(
        content=csv_bytes,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=tender_{tender_id}_comparison.csv"}
    )


@router.get("/api/tenders/{tender_id}/export/excel")
@router.get("/api/export/excel/{tender_id}")
def export_tender_excel(tender_id: int, db: Session = Depends(get_db)):
    """Export tender comparison as Excel workbook."""
    excel_bytes = export_excel(tender_id, db)
    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=tender_{tender_id}_report.xlsx"}
    )
