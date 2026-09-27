import os
import textwrap

# reports.py
reports_content = """from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Optional
import os
import uuid
import shutil
from app.database import get_db
from app.models import ExpeditionReport
from app.schemas import ExpeditionReportCreate, ExpeditionReportResponse
from app.utils import extract_pdf_text_safe, validate_file_type

router = APIRouter()
UPLOAD_DIR = "uploads"
ALLOWED_MIMES = ["application/pdf"]

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
    content = await file.read()
    if not validate_file_type(content, ALLOWED_MIMES):
        if file.content_type not in ALLOWED_MIMES:
            raise HTTPException(status_code=400, detail="Only actual PDF files are allowed")
    
    report_dir = os.path.join(UPLOAD_DIR, "reports", str(expedition_id))
    os.makedirs(report_dir, exist_ok=True)
    
    file_extension = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = os.path.join(report_dir, unique_filename)
    
    try:
        with open(file_path, "wb") as buffer:
            buffer.write(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
    
    extracted_text, page_count = extract_pdf_text_safe(file_path)
    
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
        raise HTTPException(status_code=500, detail=f"Failed to create report DB entry: {str(e)}")
    
    return report

@router.get("/{report_id}", response_model=ExpeditionReportResponse)
def get_report(report_id: int, db: Session = Depends(get_db)):
    report = db.query(ExpeditionReport).filter(ExpeditionReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report

@router.delete("/{report_id}")
def delete_report(report_id: int, db: Session = Depends(get_db)):
    report = db.query(ExpeditionReport).filter(ExpeditionReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    if os.path.exists(report.file_path):
        try:
            os.remove(report.file_path)
        except Exception:
            pass
            
    db.delete(report)
    db.commit()
    return {"message": "Deleted successfully"}
"""

with open("d:/planb/app/routes/reports.py", "w") as f:
    f.write(reports_content)

# datasets.py
datasets_content = """from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Optional
import os
import uuid
import shutil
from app.database import get_db
from app.models import ScientificDataset
from app.schemas import ScientificDatasetCreate, ScientificDatasetResponse, DatasetPreview
from app.utils import generate_dataset_preview_safe, validate_file_type

router = APIRouter()
UPLOAD_DIR = "uploads"

ALLOWED_FORMATS = {
    "csv": ["text/csv", "application/csv", "text/plain"],
    "excel": ["application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
    "netcdf": ["application/x-netcdf", "application/octet-stream"],
    "shapefile": ["application/zip", "application/x-zip-compressed", "application/octet-stream"]
}

@router.post("", response_model=ScientificDatasetResponse)
async def upload_dataset(
    expedition_id: Optional[int] = Form(None),
    title: str = Form(...),
    description: Optional[str] = Form(None),
    data_type: str = Form(...),
    file_format: str = Form(...),
    parameters_measured: Optional[str] = Form(None),
    collection_start_date: Optional[str] = Form(None),
    collection_end_date: Optional[str] = Form(None),
    spatial_coverage: Optional[str] = Form(None),
    license_type: str = Form("open"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    content = await file.read()
    allowed_mimes = ALLOWED_FORMATS.get(file_format, [])
    if not validate_file_type(content, allowed_mimes):
        if file.content_type not in allowed_mimes:
            raise HTTPException(status_code=400, detail=f"Invalid file type for {file_format}. Allowed: {', '.join(allowed_mimes)}")
    
    dataset_dir = os.path.join(UPLOAD_DIR, "datasets", str(expedition_id) if expedition_id else "standalone")
    os.makedirs(dataset_dir, exist_ok=True)
    
    file_extension = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = os.path.join(dataset_dir, unique_filename)
    
    try:
        with open(file_path, "wb") as buffer:
            buffer.write(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
    
    params_list = [p.strip() for p in parameters_measured.split(",")] if parameters_measured else None
    
    try:
        dataset = ScientificDataset(
            expedition_id=expedition_id,
            title=title,
            description=description,
            data_type=data_type,
            file_path=file_path,
            file_format=file_format,
            parameters_measured=params_list,
            collection_start_date=collection_start_date,
            collection_end_date=collection_end_date,
            spatial_coverage=spatial_coverage,
            license_type=license_type
        )
        db.add(dataset)
        db.commit()
        db.refresh(dataset)
    except Exception as e:
        db.rollback()
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Failed to create dataset DB entry: {str(e)}")
    
    return dataset

@router.get("", response_model=list[ScientificDatasetResponse])
def get_datasets(db: Session = Depends(get_db)):
    return db.query(ScientificDataset).all()

@router.get("/{dataset_id}", response_model=ScientificDatasetResponse)
def get_dataset(dataset_id: int, db: Session = Depends(get_db)):
    dataset = db.query(ScientificDataset).filter(ScientificDataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return dataset

@router.get("/{dataset_id}/preview", response_model=DatasetPreview)
def get_dataset_preview(dataset_id: int, db: Session = Depends(get_db)):
    dataset = db.query(ScientificDataset).filter(ScientificDataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return generate_dataset_preview_safe(dataset.file_path, dataset.file_format)

@router.delete("/{dataset_id}")
def delete_dataset(dataset_id: int, db: Session = Depends(get_db)):
    dataset = db.query(ScientificDataset).filter(ScientificDataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    if os.path.exists(dataset.file_path):
        os.remove(dataset.file_path)
            
    db.delete(dataset)
    db.commit()
    return {"message": "Deleted successfully"}
"""

with open("d:/planb/app/routes/datasets.py", "w") as f:
    f.write(datasets_content)

# media.py
media_content = """from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Optional
import os
import uuid
import shutil
from app.database import get_db
from app.models import MediaItem
from app.schemas import MediaItemCreate, MediaItemResponse
from app.utils import generate_thumbnail_safe, validate_file_type

router = APIRouter()
UPLOAD_DIR = "uploads"

ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/heic", "image/heif"]
ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"]

@router.post("/{expedition_id}/media", response_model=MediaItemResponse)
async def upload_media(
    expedition_id: int,
    title: str = Form(...),
    description: Optional[str] = Form(None),
    media_type: str = Form(...),
    capture_date: Optional[str] = Form(None),
    location_description: Optional[str] = Form(None),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    photographer_credit: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    content = await file.read()
    allowed = ALLOWED_IMAGE_TYPES if media_type == "photo" else ALLOWED_VIDEO_TYPES
    if not validate_file_type(content, allowed):
        if file.content_type not in allowed:
            raise HTTPException(status_code=400, detail=f"Invalid {media_type} type.")
    
    media_dir = os.path.join(UPLOAD_DIR, "media", str(expedition_id), media_type)
    os.makedirs(media_dir, exist_ok=True)
    
    file_extension = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = os.path.join(media_dir, unique_filename)
    
    try:
        with open(file_path, "wb") as buffer:
            buffer.write(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
    
    thumbnail_path = None
    if media_type == "photo":
        thumb_dir = os.path.join(media_dir, "thumbnails")
        os.makedirs(thumb_dir, exist_ok=True)
        thumb_filename = f"thumb_{unique_filename}.jpg"
        thumbnail_full_path = os.path.join(thumb_dir, thumb_filename)
        if generate_thumbnail_safe(file_path, thumbnail_full_path):
            thumbnail_path = thumbnail_full_path
    
    tags_list = [t.strip() for t in tags.split(",")] if tags else None
    
    try:
        media = MediaItem(
            expedition_id=expedition_id,
            title=title,
            description=description,
            media_type=media_type,
            file_path=file_path,
            thumbnail_path=thumbnail_path,
            capture_date=capture_date,
            location_description=location_description,
            latitude=latitude,
            longitude=longitude,
            photographer_credit=photographer_credit,
            tags=tags_list
        )
        db.add(media)
        db.commit()
        db.refresh(media)
    except Exception as e:
        db.rollback()
        if os.path.exists(file_path):
            os.remove(file_path)
        if thumbnail_path and os.path.exists(thumbnail_path):
            os.remove(thumbnail_path)
        raise HTTPException(status_code=500, detail=f"Failed to create media item: {str(e)}")
    
    return media

@router.get("/{media_id}", response_model=MediaItemResponse)
def get_media(media_id: int, db: Session = Depends(get_db)):
    media = db.query(MediaItem).filter(MediaItem.id == media_id).first()
    if not media:
        raise HTTPException(status_code=404, detail="Media item not found")
    return media

@router.delete("/{media_id}")
def delete_media(media_id: int, db: Session = Depends(get_db)):
    media = db.query(MediaItem).filter(MediaItem.id == media_id).first()
    if not media:
        raise HTTPException(status_code=404, detail="Media item not found")
    
    if os.path.exists(media.file_path):
        os.remove(media.file_path)
    if media.thumbnail_path and os.path.exists(media.thumbnail_path):
        os.remove(media.thumbnail_path)
            
    db.delete(media)
    db.commit()
    return {"message": "Deleted successfully"}
"""

with open("d:/planb/app/routes/media.py", "w") as f:
    f.write(media_content)

print("Done modifying routes.")
