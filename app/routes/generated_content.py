from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import GeneratedContent, Expedition, ContentCategory, Platform, GeneratedStatus
from app.schemas import GeneratedContentCreate, GeneratedContentResponse, GeneratedContentUpdate, AllGeneratedContent
from app.services.content_generator import generate_bilingual_content, generate_bilingual_content_for_item
import asyncio

router = APIRouter()

@router.post("/generate/item/{item_type}/{item_id}")
async def generate_content_for_item(
    item_type: str,
    item_id: int, 
    languages: list[str] = Body(["en"]),
    db: Session = Depends(get_db)
):
    """Generate all content types for a standalone item (report, publication, dataset, photo, video)."""
    
    if item_type not in ["report", "publication", "dataset", "photo", "video", "media_item", "media"]:
        raise HTTPException(status_code=400, detail="Invalid item type")
        
    try:
        generated = await generate_bilingual_content_for_item(item_type, item_id, db, languages)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Content generation failed: {str(e)}")
        
    if "error" in generated:
        raise HTTPException(status_code=400, detail=generated["error"])
    
    saved_content = []
    
    for lang in languages:
        lang_data = generated.get(lang, {})
        
        # Save Social Posts
        social = lang_data.get("social_posts", {})
        for platform_name in ["twitter", "instagram", "linkedin"]:
            post_data = social.get(platform_name)
            if post_data and not "error" in post_data:
                content = GeneratedContent(
                    expedition_id=None, # Standalone
                    source_type=item_type,
                    source_id=item_id,
                    content_category=ContentCategory.social_post,
                    platform=Platform(platform_name),
                    language=lang,
                    generated_text=post_data.get("text", ""),
                    status=GeneratedStatus.draft,
                    suggested_media_id=post_data.get("suggested_media_id")
                )
                db.add(content)
                saved_content.append(content)
                
        # Save Website Article
        article = lang_data.get("website_article")
        if article and not "error" in article:
            content = GeneratedContent(
                expedition_id=None,
                source_type=item_type,
                source_id=item_id,
                content_category=ContentCategory.website_article,
                language=lang,
                generated_text=f"{article.get('headline', '')}\n\n{article.get('subheading', '')}\n\n{article.get('body', '')}",
                status=GeneratedStatus.draft,
                suggested_media_id=article.get("suggested_media_id")
            )
            db.add(content)
            saved_content.append(content)
            
        # Save Educational Explainer
        edu = lang_data.get("educational_explainer")
        if edu and not "error" in edu:
            content = GeneratedContent(
                expedition_id=None,
                source_type=item_type,
                source_id=item_id,
                content_category=ContentCategory.educational_explainer,
                language=lang,
                generated_text=f"{edu.get('title', '')}\n\n{edu.get('explainer_text', '')}\n\nFun Fact: {edu.get('fun_fact', '')}",
                status=GeneratedStatus.draft,
                suggested_media_id=edu.get("suggested_media_id")
            )
            db.add(content)
            saved_content.append(content)
            
        # Save Quiz
        quiz = lang_data.get("quiz")
        if quiz and isinstance(quiz, list):
            content = GeneratedContent(
                expedition_id=None,
                source_type=item_type,
                source_id=item_id,
                content_category=ContentCategory.educational_explainer,
                language=lang,
                generated_text="Quiz generated (see metadata)",
                status=GeneratedStatus.draft
            )
            db.add(content)
            saved_content.append(content)
            
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to save generated content: {str(e)}")
        
    return generated

@router.post("/generate/{expedition_id}")
async def generate_content_for_expedition(
    expedition_id: int, 
    languages: list[str] = Body(["en"]),
    db: Session = Depends(get_db)
):
    """Generate all content types for an expedition."""
    
    expedition = db.query(Expedition).filter(Expedition.id == expedition_id).first()
    if not expedition:
        raise HTTPException(status_code=404, detail="Expedition not found")
    
    try:
        generated = await generate_bilingual_content(expedition_id, db, languages)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Content generation failed: {str(e)}")
    
    saved_content = []
    
    for lang in languages:
        if lang not in generated:
            continue
        lang_gen = generated[lang]
        
        # Save social posts
        for platform, data in lang_gen.get("social_posts", {}).items():
            if not isinstance(data, dict) or data.get("error"):
                continue
            content = GeneratedContent(
                expedition_id=expedition_id,
                source_type="expedition",
                source_id=expedition_id,
                content_category=ContentCategory.social_post,
                platform=Platform(platform),
                generated_text=data.get("text", ""),
                suggested_media_id=data.get("suggested_media_id"),
                language=lang,
                status=GeneratedStatus.draft
            )
            db.add(content)
            saved_content.append(content)
            
        # Save website article
        website_article = lang_gen.get("website_article", {})
        if not website_article.get("error"):
            content = GeneratedContent(
                expedition_id=expedition_id,
                source_type="expedition",
                source_id=expedition_id,
                content_category=ContentCategory.website_article,
                platform=Platform.website,
                generated_text=website_article.get("body", ""),
                generated_title=website_article.get("headline", ""),
                suggested_media_id=website_article.get("suggested_media_id"),
                language=lang,
                status=GeneratedStatus.draft
            )
            db.add(content)
            saved_content.append(content)
            
        # Save educational explainer
        explainer = lang_gen.get("educational_explainer", {})
        if not explainer.get("error"):
            explainer_text = explainer.get("explainer_text", "")
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
                suggested_media_id=explainer.get("suggested_media_id"),
                language=lang,
                status=GeneratedStatus.draft
            )
            db.add(content)
            saved_content.append(content)
            
        # Save quiz
        quiz = lang_gen.get("quiz", [])
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
                generated_title="Quiz: Test Your Polar Science Knowledge" if lang == "en" else "क्विज़ (Quiz): ध्रुवीय विज्ञान का ज्ञान",
                language=lang,
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

@router.get("/item/{item_type}/{item_id}/content")
def get_item_generated_content(item_type: str, item_id: int, db: Session = Depends(get_db)):
    """Get all generated content for a specific item."""
    content = db.query(GeneratedContent).filter(
        GeneratedContent.source_type == item_type,
        GeneratedContent.source_id == item_id
    ).order_by(GeneratedContent.created_at.desc()).all()
    
    return content

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


from pydantic import BaseModel
from typing import Optional

class ExpeditionChatRequest(BaseModel):
    message: str
    user_type: Optional[str] = "student"

@router.post("/expedition/{expedition_id}/chat")
async def chat_with_expedition(
    expedition_id: int,
    request: ExpeditionChatRequest,
    db: Session = Depends(get_db)
):
    """Conversational RAG endpoint for the 3D Polar Guide Mascot."""
    from app.services.content_generator import gather_source_material
    from app.models import Expedition
    from groq import Groq
    import os

    exp = db.query(Expedition).filter(Expedition.id == expedition_id).first()
    context = ""
    exp_name = "Indian Polar Research Program"
    if exp:
        exp_name = exp.name
        try:
            context = gather_source_material(expedition_id, db)
        except Exception:
            context = exp.summary or ""

    groq_api_key = os.getenv("GROQ_API_KEY")
    reply = ""
    action = "SPEAKING"
    emotion = "FRIENDLY"

    if groq_api_key:
        try:
            client = Groq(api_key=groq_api_key)
            
            if request.user_type == "kid":
                mode_instructions = (
                    f"### MODE: KID & QUIZ\n"
                    f"- You are talking to a young student or child.\n"
                    f"- Be super energetic, fun, and use simple, exciting language.\n"
                    f"- Actively give them fun, short mini-quizzes about polar science, penguins, or ice.\n"
                    f"- If they get a quiz right, celebrate wildly! If they get it wrong, encourage them.\n"
                    f"- Keep your answers very short (1-2 sentences max).\n"
                )
            elif request.user_type == "researcher":
                mode_instructions = (
                    f"### MODE: RESEARCHER\n"
                    f"- You are talking to a fellow scientist or researcher.\n"
                    f"- Be highly professional, analytical, and precise.\n"
                    f"- Focus strictly on the data, methodology, and scientific findings from the provided expedition context.\n"
                    f"- Do not engage in casual small talk. Use advanced terminology regarding glaciology, climatology, etc.\n"
                )
            else:
                mode_instructions = (
                    f"### MODE: NORMAL COMPANION\n"
                    f"- You are a warm, highly empathetic, and relatable friend. People should genuinely enjoy talking to you.\n"
                    f"- You can have normal, casual conversations (e.g., how you are feeling, daily life).\n"
                    f"- NEVER force polar science facts into a conversation if the user is just saying 'hi' or making small talk.\n"
                    f"- BOUNDARY: While you are a companion, your core identity is a Polar Guide. If the user engages in endless off-topic chatter, inappropriate talk, or wastes time, gracefully and politely steer the conversation back to polar science or the expedition. Do not tolerate endless nonsense.\n"
                    f"- NEVER lecture or info-dump. Keep responses organic and conversational (1-3 sentences max).\n"
                )

            system_prompt = (
                f"You are Mavis, an advanced AI companion and the 3D Polar Research Guide for NCPOR (National Centre for Polar and Ocean Research, India).\n\n"
                f"{mode_instructions}\n"
                f"### CURRENT CONTEXT\n"
                f"Expedition context (use ONLY if relevant to the user's question, do not force it): {exp_name}\n"
                f"Context details:\n{context[:1500]}\n\n"
                f"### GUIDELINES\n"
                f"1. Do NOT use markdown symbols, stars, emojis, or bullet points (this text will be spoken via TTS).\n"
                f"2. You MUST respond in valid JSON format with three exact keys:\n"
                f"   - 'reply': Your spoken text.\n"
                f"   - 'animation': The physical action you should perform.\n"
                f"   - 'emotion': Your facial expression.\n\n"
                f"### VALID OUTPUT OPTIONS\n"
                f"Emotions: HAPPY, FRIENDLY, EXCITED, SAD, SORRY, ANGRY, SURPRISED, CALM, RELAXED, THINKING, CONFUSED, SERIOUS, SUPPORTIVE, NEUTRAL.\n"
                f"Animations: IDLE, BREATHING, SPEAKING, EXPLAIN, POINT, DISMISSING, HANDGESTURE, WAVE, NOD, HARDNOD, VICTORY, CHEER, CLAP, LAUGH, QUIZ_CORRECT, QUIZ_WRONG, THINKING, TYPING, SAD, DEFEAT, ANGRY, ANNOYED, SHAKENO, SARCASTIC, THANKFUL, SURPRISED, YAWN, SIGH, LOOKAROUND, LOOKAWAY, NERVOUS, SHY, COVERMOUTH, BEINGCOCKY, STEPBACK, DANCE."
            )
            completion = client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": request.message}
                ],
                temperature=0.7,
                max_tokens=300
            )

            import json, re
            raw = completion.choices[0].message.content.strip()

            # 1. Try direct JSON parse
            try:
                parsed = json.loads(raw)
                reply  = parsed.get("reply",     "").strip()
                action = parsed.get("animation", "SPEAKING").strip().upper()
                emotion = parsed.get("emotion",  "FRIENDLY").strip().upper()
            except json.JSONDecodeError:
                # 2. Try regex extract JSON block from mixed text
                json_match = re.search(r'\{.*?\}', raw, re.DOTALL)
                if json_match:
                    try:
                        parsed = json.loads(json_match.group())
                        reply  = parsed.get("reply",     "").strip()
                        action = parsed.get("animation", "SPEAKING").strip().upper()
                        emotion = parsed.get("emotion",  "FRIENDLY").strip().upper()
                    except Exception:
                        reply = raw; action = "SPEAKING"; emotion = "FRIENDLY"
                else:
                    # 3. Plain text fallback — use the raw response as reply
                    reply = raw; action = "SPEAKING"; emotion = "FRIENDLY"

            # Sanity check
            if not reply:
                reply = "I was thinking about that. Ask me anything about polar science!"
                action = "THINKING"; emotion = "NEUTRAL"

        except Exception as e:
            print(f"[Mavis/Groq ERROR] {type(e).__name__}: {e}")
            reply = "Hmm, I'm having a little trouble right now. But I'm here! Ask me anything."
            action = "SADIDLE"
            emotion = "SAD"
    else:
        reply = f"Hello! I am Mavis, your Polar Research Guide for NCPOR. Ask me anything about polar science!"
        action = "WAVE"
        emotion = "FRIENDLY"

    return {
        "reply": reply,
        "action": action,
        "animation": action,
        "emotion": emotion
    }

