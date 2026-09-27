from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Optional
import os
import uuid
import shutil
from app.database import get_db
from app.models import Publication
from app.schemas import PublicationCreate, PublicationResponse

router = APIRouter()

UPLOAD_DIR = "uploads"

def format_citation(authors: list, year: str, title: str, journal: str, doi: str) -> str:
    """Format citation in standard format"""
    authors_str = ", ".join(authors) if authors else "Unknown Author"
    year_str = year or "n.d."
    journal_str = journal or "Unknown Venue"
    doi_str = f"DOI: {doi}" if doi else ""
    
    citation = f"{authors_str} ({year_str}). {title}. {journal_str}."
    if doi_str:
        citation += f" {doi_str}"
    
    return citation

@router.post("", response_model=PublicationResponse)
async def upload_publication(
    expedition_id: Optional[int] = Form(None),
    title: str = Form(...),
    authors: Optional[str] = Form(None),
    abstract: Optional[str] = Form(None),
    journal_or_venue: Optional[str] = Form(None),
    publication_date: Optional[str] = Form(None),
    doi: Optional[str] = Form(None),
    keywords: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    file_path = None
    
    # Handle file upload if provided
    if file:
        if file.content_type != "application/pdf":
            raise HTTPException(status_code=400, detail="Only PDF files are allowed")
        
        # Create upload directory
        pub_dir = os.path.join(UPLOAD_DIR, "publications", str(expedition_id) if expedition_id else "standalone")
        os.makedirs(pub_dir, exist_ok=True)
        
        # Generate unique filename
        file_extension = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = os.path.join(pub_dir, unique_filename)
        
        # Save file
        try:
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
    
    # Parse authors and keywords
    authors_list = [a.strip() for a in authors.split(",")] if authors else None
    keywords_list = [k.strip() for k in keywords.split(",")] if keywords else None
    
    # Generate citation
    citation = format_citation(authors_list, publication_date, title, journal_or_venue, doi)
    
    # Create database entry
    try:
        publication = Publication(
            expedition_id=expedition_id,
            title=title,
            authors=authors_list,
            abstract=abstract,
            journal_or_venue=journal_or_venue,
            publication_date=publication_date,
            doi=doi,
            file_path=file_path,
            citation_text=citation,
            keywords=keywords_list
        )
        db.add(publication)
        db.commit()
        db.refresh(publication)
    except Exception as e:
        db.rollback()
        if file_path and os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Failed to create publication: {str(e)}")
    
    return publication

@router.get("/{publication_id}", response_model=PublicationResponse)
def get_publication(publication_id: int, db: Session = Depends(get_db)):
    publication = db.query(Publication).filter(Publication.id == publication_id).first()
    if not publication:
        raise HTTPException(status_code=404, detail="Publication not found")
    return publication
