from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Optional
import os
import uuid
import shutil
import pdfplumber
from app.database import get_db
from app.models import ExpeditionReport, User
from app.schemas import ExpeditionReportCreate, ExpeditionReportResponse

router = APIRouter()

UPLOAD_DIR = "uploads"

def extract_pdf_text(file_path: str) -> tuple[str, int]:
    """Extract text and page count from PDF"""
    try:
        with pdfplumber.open(file_path) as pdf:
            text = ""
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
            return text.strip(), len(pdf.pages)
    except Exception as e:
        print(f"PDF extraction error: {e}")
        return "", 0

@router.post("/{expedition_id}/reports", response_model=ExpeditionReportResponse)
async def upload_report(
    expedition_id: int,
    title: str = Form(...),
    report_type: str = Form(...),
    submission_date: Optional[str] = Form(None),
    file: UploadFile = File(...),
    submitted_by: Optional[int] = Form(1),
    db: Session = Depends(get_db)
):
    # Validate file type
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    # Create upload directory
    report_dir = os.path.join(UPLOAD_DIR, "reports", str(expedition_id))
    os.makedirs(report_dir, exist_ok=True)
    
    # Generate unique filename
    file_extension = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = os.path.join(report_dir, unique_filename)
    
    # Save file
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
    
    # Extract text
    extracted_text, page_count = extract_pdf_text(file_path)
    
    # Create database entry
    try:
        report = ExpeditionReport(
            expedition_id=expedition_id,
            title=title,
            file_path=file_path,
            report_type=report_type,
            submitted_by=submitted_by,
            submission_date=submission_date,
            extracted_text=extracted_text,
            page_count=page_count
        )
        db.add(report)
        db.commit()
        db.refresh(report)
    except Exception as e:
        db.rollback()
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Failed to create report: {str(e)}")
    
    return report

@router.get("/{report_id}", response_model=ExpeditionReportResponse)
def get_report(report_id: int, db: Session = Depends(get_db)):
    report = db.query(ExpeditionReport).filter(ExpeditionReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report
