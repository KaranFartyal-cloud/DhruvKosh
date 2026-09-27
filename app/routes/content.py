from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import Optional, List
import os
import uuid
import shutil
from app.database import get_db
from app.models import ContentItem, GeneratedPost, ContentType, Category
from app.schemas import ContentItemCreate, ContentItem, ContentItemWithPosts, GeneratedPost, GeneratedPostUpdate, ContentUpload
from app.services.content_generator import generate_all_platforms, extract_text_from_pdf

router = APIRouter()

UPLOAD_DIR = "uploads"

ALLOWED_MIME_TYPES = {
    ContentType.photo: ["image/jpeg", "image/png", "image/gif"],
    ContentType.video: ["video/mp4", "video/webm"],
    ContentType.report: ["application/pdf"],
    ContentType.publication: ["application/pdf"],
    ContentType.dataset: ["application/json", "text/csv", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]
}

@router.post("/upload", response_model=ContentItem)
async def upload_content(
    file: UploadFile = File(...),
    title: str = Form(...),
    description: Optional[str] = Form(None),
    content_type: ContentType = Form(...),
    expedition_name: Optional[str] = Form(None),
    year: Optional[int] = Form(None),
    category: Category = Form(...),
    tags: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    # Validate file type
    if file.content_type not in ALLOWED_MIME_TYPES.get(content_type, []):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type for {content_type}. Allowed: {', '.join(ALLOWED_MIME_TYPES.get(content_type, []))}"
        )
    
    # Create upload directory if it doesn't exist
    content_upload_dir = os.path.join(UPLOAD_DIR, content_type.value)
    os.makedirs(content_upload_dir, exist_ok=True)
    
    # Generate unique filename
    file_extension = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = os.path.join(content_upload_dir, unique_filename)
    
    # Save file
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
    
    # Parse tags
    tags_list = [tag.strip() for tag in tags.split(",")] if tags else None
    
    # Create database entry
    try:
        content_item = ContentItem(
            title=title,
            description=description,
            content_type=content_type,
            file_path=file_path,
            expedition_name=expedition_name,
            year=year,
            category=category,
            tags=tags_list,
            uploaded_by=1  # Default to admin user for now
        )
        db.add(content_item)
        db.commit()
        db.refresh(content_item)
    except Exception as e:
        # Rollback DB and delete file if DB insert fails
        db.rollback()
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Failed to create content item: {str(e)}")
    
    return content_item

@router.get("", response_model=List[ContentItem])
def get_content(
    category: Optional[Category] = None,
    year: Optional[int] = None,
    content_type: Optional[ContentType] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    query = db.query(ContentItem)
    
    if category:
        query = query.filter(ContentItem.category == category)
    if year:
        query = query.filter(ContentItem.year == year)
    if content_type:
        query = query.filter(ContentItem.content_type == content_type)
    if search:
        query = query.filter(
            (ContentItem.title.ilike(f"%{search}%")) |
            (ContentItem.description.ilike(f"%{search}%"))
        )
    
    query = query.order_by(ContentItem.uploaded_at.desc())
    
    offset = (page - 1) * page_size
    content_items = query.offset(offset).limit(page_size).all()
    
    return content_items

@router.get("/{content_id}", response_model=ContentItemWithPosts)
def get_content_item(content_id: int, db: Session = Depends(get_db)):
    content_item = db.query(ContentItem).filter(ContentItem.id == content_id).first()
    if not content_item:
        raise HTTPException(status_code=404, detail="Content item not found")
    return content_item

@router.delete("/{content_id}")
def delete_content_item(
    content_id: int,
    role: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    # Simple role check for now (will be replaced with proper auth)
    if role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can delete content")
    
    content_item = db.query(ContentItem).filter(ContentItem.id == content_id).first()
    if not content_item:
        raise HTTPException(status_code=404, detail="Content item not found")
    
    # Delete file from disk
    file_path = content_item.file_path
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
        except Exception as e:
            print(f"Warning: Failed to delete file {file_path}: {str(e)}")
    
    # Delete from database
    db.delete(content_item)
    db.commit()
    
    return {"message": "Content item deleted successfully"}

@router.get("/{content_id}/file")
def get_content_file(content_id: int, db: Session = Depends(get_db)):
    content_item = db.query(ContentItem).filter(ContentItem.id == content_id).first()
    if not content_item:
        raise HTTPException(status_code=404, detail="Content item not found")
    
    file_path = content_item.file_path
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")
    
    # Determine media type
    media_type = "application/octet-stream"
    if content_item.content_type == ContentType.photo:
        media_type = "image/jpeg"
    elif content_item.content_type == ContentType.video:
        media_type = "video/mp4"
    elif content_item.content_type in [ContentType.report, ContentType.publication]:
        media_type = "application/pdf"
    
    return FileResponse(
        path=file_path,
        media_type=media_type,
        filename=os.path.basename(file_path)
    )

@router.post("/{content_id}/generate", response_model=List[GeneratedPost])
def generate_social_posts(content_id: int, db: Session = Depends(get_db)):
    content_item = db.query(ContentItem).filter(ContentItem.id == content_id).first()
    if not content_item:
        raise HTTPException(status_code=404, detail="Content item not found")
    
    # Extract source text
    if content_item.content_type in [ContentType.report, ContentType.publication]:
        content_text = extract_text_from_pdf(content_item.file_path)
        if not content_text:
            content_text = f"{content_item.title}. {content_item.description or ''}"
    else:
        content_text = f"{content_item.title}. {content_item.description or ''}"
    
    # Generate posts for all platforms
    generated_posts_dict = generate_all_platforms(
        content_text=content_text,
        content_title=content_item.title,
        category=content_item.category.value
    )
    
    # Save to database
    created_posts = []
    for platform, text in generated_posts_dict.items():
        post = GeneratedPost(
            content_item_id=content_id,
            platform=platform,
            generated_text=text,
            status="draft"
        )
        db.add(post)
        created_posts.append(post)
    
    db.commit()
    
    for post in created_posts:
        db.refresh(post)
    
    return created_posts

@router.patch("/posts/{post_id}", response_model=GeneratedPost)
def update_post(post_id: int, post_update: GeneratedPostUpdate, db: Session = Depends(get_db)):
    post = db.query(GeneratedPost).filter(GeneratedPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    if post_update.generated_text is not None:
        post.generated_text = post_update.generated_text
    if post_update.status is not None:
        post.status = post_update.status
    
    db.commit()
    db.refresh(post)
    
    return post

@router.patch("/posts/{post_id}/status", response_model=GeneratedPost)
def update_post_status(post_id: int, status: str, db: Session = Depends(get_db)):
    post = db.query(GeneratedPost).filter(GeneratedPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    post.status = status
    db.commit()
    db.refresh(post)
    
    return post
