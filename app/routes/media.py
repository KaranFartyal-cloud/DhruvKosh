from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Optional
import os
import uuid
import shutil
from PIL import Image
from app.database import get_db
from app.models import MediaItem
from app.schemas import MediaItemCreate, MediaItemResponse

router = APIRouter()

UPLOAD_DIR = "uploads"

ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"]
ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"]

def generate_thumbnail(image_path: str, thumbnail_path: str) -> bool:
    """Generate thumbnail for images"""
    try:
        with Image.open(image_path) as img:
            # Resize to 300px width maintaining aspect ratio
            width = 300
            aspect_ratio = width / img.width
            height = int(img.height * aspect_ratio)
            
            img_resized = img.resize((width, height), Image.Resampling.LANCZOS)
            img_resized.save(thumbnail_path, "JPEG", quality=85)
        return True
    except Exception as e:
        print(f"Thumbnail generation error: {e}")
        return False

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
    # Validate file type
    if media_type == "photo" and file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid image type. Allowed: {', '.join(ALLOWED_IMAGE_TYPES)}"
        )
    elif media_type == "video" and file.content_type not in ALLOWED_VIDEO_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid video type. Allowed: {', '.join(ALLOWED_VIDEO_TYPES)}"
        )
    
    # Create upload directory
    media_dir = os.path.join(UPLOAD_DIR, "media", str(expedition_id), media_type)
    os.makedirs(media_dir, exist_ok=True)
    
    # Generate unique filename
    file_extension = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = os.path.join(media_dir, unique_filename)
    
    # Save file
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
    
    # Generate thumbnail for images
    thumbnail_path = None
    if media_type == "photo":
        thumb_dir = os.path.join(media_dir, "thumbnails")
        os.makedirs(thumb_dir, exist_ok=True)
        thumb_filename = f"thumb_{unique_filename}.jpg"
        thumbnail_full_path = os.path.join(thumb_dir, thumb_filename)
        
        if generate_thumbnail(file_path, thumbnail_full_path):
            thumbnail_path = thumbnail_full_path
    
    # Parse tags
    tags_list = [t.strip() for t in tags.split(",")] if tags else None
    
    # Create database entry
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
    # Validate file type
    if media_type == "photo" and file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid image type. Allowed: {', '.join(ALLOWED_IMAGE_TYPES)}"
        )
    elif media_type == "video" and file.content_type not in ALLOWED_VIDEO_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid video type. Allowed: {', '.join(ALLOWED_VIDEO_TYPES)}"
        )
    
    # Create upload directory
    media_dir = os.path.join(UPLOAD_DIR, "media", str(expedition_id) if expedition_id else "standalone", media_type)
    os.makedirs(media_dir, exist_ok=True)
    
    # Generate unique filename
    file_extension = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = os.path.join(media_dir, unique_filename)
    
    # Save file
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
    
    # Generate thumbnail for images
    thumbnail_path = None
    if media_type == "photo":
        thumb_dir = os.path.join(media_dir, "thumbnails")
        os.makedirs(thumb_dir, exist_ok=True)
        thumb_filename = f"thumb_{unique_filename}.jpg"
        thumbnail_full_path = os.path.join(thumb_dir, thumb_filename)
        
        if generate_thumbnail(file_path, thumbnail_full_path):
            thumbnail_path = thumbnail_full_path
    
    # Parse tags
    tags_list = [t.strip() for t in tags.split(",")] if tags else None
    
    # Create database entry
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
