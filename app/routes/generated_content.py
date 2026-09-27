from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import GeneratedContent, Expedition, ContentCategory, Platform, GeneratedStatus
from app.schemas import GeneratedContentCreate, GeneratedContentResponse, GeneratedContentUpdate, AllGeneratedContent
from app.services.content_generator import generate_all_content
import asyncio

router = APIRouter()

@router.post("/generate/{expedition_id}")
async def generate_content_for_expedition(expedition_id: int, db: Session = Depends(get_db)):
    """Generate all content types for an expedition."""
    
    # Check if expedition exists
    expedition = db.query(Expedition).filter(Expedition.id == expedition_id).first()
    if not expedition:
        raise HTTPException(status_code=404, detail="Expedition not found")
    
    # Generate all content
    try:
        generated = await generate_all_content(expedition_id, db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Content generation failed: {str(e)}")
    
    # Save to database
    saved_content = []
    
    # Save social posts
    for platform, text in generated["social_posts"].items():
        if text and not text.startswith("Error"):
            content = GeneratedContent(
                expedition_id=expedition_id,
                source_type="expedition",
                source_id=expedition_id,
                content_category=ContentCategory.social_post,
                platform=Platform(platform),
                generated_text=text,
                status=GeneratedStatus.draft
            )
            db.add(content)
            saved_content.append(content)
    
    # Save website article
    website_article = generated["website_article"]
    if not website_article.get("error"):
        body = website_article.get("body", "")
        content = GeneratedContent(
            expedition_id=expedition_id,
            source_type="expedition",
            source_id=expedition_id,
            content_category=ContentCategory.website_article,
            platform=Platform.website,
            generated_text=body,
            generated_title=website_article.get("headline", ""),
            status=GeneratedStatus.draft
        )
        db.add(content)
        saved_content.append(content)
    
    # Save educational explainer
    explainer = generated["educational_explainer"]
    if not explainer.get("error"):
        explainer_text = explainer.get("explainer_text", "")
        # Add glossary and fun fact to the text
        glossary = explainer.get("glossary", [])
        fun_fact = explainer.get("fun_fact", "")
        
        full_text = explainer_text
        if glossary:
            full_text += "\n\nGlossary:\n"
            for term in glossary:
                full_text += f"- {term.get('term', '')}: {term.get('definition', '')}\n"
        if fun_fact:
            full_text += f"\n\nFun Fact: {fun_fact}"
        
        content = GeneratedContent(
            expedition_id=expedition_id,
            source_type="expedition",
            source_id=expedition_id,
            content_category=ContentCategory.educational_explainer,
            platform=None,
            generated_text=full_text,
            generated_title=explainer.get("title", ""),
            status=GeneratedStatus.draft
        )
        db.add(content)
        saved_content.append(content)
    
    # Save quiz (as educational content for now)
    quiz = generated["quiz"]
    if quiz:
        import json
        quiz_text = json.dumps(quiz)
        content = GeneratedContent(
            expedition_id=expedition_id,
            source_type="expedition",
            source_id=expedition_id,
            content_category=ContentCategory.educational_explainer,
            platform=None,
            generated_text=quiz_text,
            generated_title="Quiz: Test Your Polar Science Knowledge",
            status=GeneratedStatus.draft
        )
        db.add(content)
        saved_content.append(content)
    
    db.commit()
    
    for content in saved_content:
        db.refresh(content)
    
    return generated

@router.get("/expedition/{expedition_id}/content")
def get_generated_content(expedition_id: int, db: Session = Depends(get_db)):
    """Get all generated content for an expedition."""
    
    content = db.query(GeneratedContent).filter(
        GeneratedContent.expedition_id == expedition_id
    ).order_by(GeneratedContent.created_at.desc()).all()
    
    # Group by content category
    grouped = {
        "social_posts": [],
        "website_articles": [],
        "educational_explainers": []
    }
    
    for item in content:
        if item.content_category == ContentCategory.social_post:
            grouped["social_posts"].append(item)
        elif item.content_category == ContentCategory.website_article:
            grouped["website_articles"].append(item)
        elif item.content_category == ContentCategory.educational_explainer:
            grouped["educational_explainers"].append(item)
    
    return grouped

@router.get("/generated-content/{content_id}", response_model=GeneratedContentResponse)
def get_generated_content_item(content_id: int, db: Session = Depends(get_db)):
    content = db.query(GeneratedContent).filter(GeneratedContent.id == content_id).first()
    if not content:
        raise HTTPException(status_code=404, detail="Generated content not found")
    return content

@router.patch("/generated-content/{content_id}", response_model=GeneratedContentResponse)
def update_generated_content(content_id: int, update: GeneratedContentUpdate, db: Session = Depends(get_db)):
    content = db.query(GeneratedContent).filter(GeneratedContent.id == content_id).first()
    if not content:
        raise HTTPException(status_code=404, detail="Generated content not found")
    
    if update.generated_text is not None:
        content.generated_text = update.generated_text
    if update.generated_title is not None:
        content.generated_title = update.generated_title
    if update.status is not None:
        content.status = update.status
        if update.status == GeneratedStatus.published:
            from datetime import datetime
            content.published_at = datetime.utcnow()
    
    db.commit()
    db.refresh(content)
    return content

@router.patch("/generated-content/{content_id}/status", response_model=GeneratedContentResponse)
def update_content_status(content_id: int, status: str, db: Session = Depends(get_db)):
    content = db.query(GeneratedContent).filter(GeneratedContent.id == content_id).first()
    if not content:
        raise HTTPException(status_code=404, detail="Generated content not found")
    
    try:
        content.status = GeneratedStatus(status)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid status value")
    
    if content.status == GeneratedStatus.published:
        from datetime import datetime
        content.published_at = datetime.utcnow()
    
    db.commit()
    db.refresh(content)
    return content

@router.get("/public")
def get_public_generated_content(
    content_category: ContentCategory = None,
    db: Session = Depends(get_db)
):
    """Get published content for public website (no auth required)."""
    
    query = db.query(GeneratedContent).filter(
        GeneratedContent.status == GeneratedStatus.published
    )
    
    if content_category:
        query = query.filter(GeneratedContent.content_category == content_category)
    
    return query.order_by(GeneratedContent.published_at.desc()).all()
