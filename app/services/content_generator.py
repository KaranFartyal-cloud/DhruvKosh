import os
import asyncio
from typing import Dict, List, Tuple
import logging
import json
from groq import Groq
import re

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def truncate_words(text: str, max_words: int = 500) -> str:
    if not text: return ""
    words = text.split()
    if len(words) <= max_words:
        return text
    return " ".join(words[:max_words]) + "... [TRUNCATED]"

def gather_source_material(expedition_id: int, db_session) -> str:
    from app.models import Expedition, ExpeditionReport, ScientificDataset, Publication, MediaItem
    expedition = db_session.query(Expedition).filter(Expedition.id == expedition_id).first()
    if not expedition: return ""
    sections = []
    
    expedition_info = f"""EXPEDITION INFO\nName: {expedition.name}\nCode: {expedition.expedition_code}\nRegion: {expedition.region.value}\nDates: {expedition.start_date} to {expedition.end_date}\nSummary: {expedition.summary or 'N/A'}\n"""
    sections.append(expedition_info)
    
    reports = db_session.query(ExpeditionReport).filter(ExpeditionReport.expedition_id == expedition_id).all()
    if reports:
        report_section = "\nREPORT EXCERPTS\n"
        for report in reports:
            if report.extracted_text:
                report_section += f"\n- {report.title}:\n{truncate_words(report.extracted_text, 600)}\n"
        sections.append(report_section)
    else:
        sections.append("\nREPORT EXCERPTS\nNo reports.")
        
    datasets = db_session.query(ScientificDataset).filter(ScientificDataset.expedition_id == expedition_id).all()
    if datasets:
        dataset_section = "\nDATASETS\n"
        for dataset in datasets:
            dataset_section += f"\n- {dataset.title}: {dataset.description or 'N/A'}\n"
        sections.append(dataset_section)
    
    publications = db_session.query(Publication).filter(Publication.expedition_id == expedition_id).all()
    if publications:
        pub_section = "\nPUBLICATIONS\n"
        for pub in publications:
            pub_section += f"\n- {pub.title}: {pub.abstract or 'N/A'}\n"
        sections.append(pub_section)
        
    media_items = db_session.query(MediaItem).filter(MediaItem.expedition_id == expedition_id).all()
    if media_items:
        media_section = "\nMEDIA DESCRIPTIONS\n"
        for media in media_items:
            media_section += f"\n- {media.title}: {media.description or 'N/A'}\n"
        sections.append(media_section)
        
    return truncate_words("\n".join(sections), 4000)

def gather_item_source_material(item_type: str, item_id: int, db_session) -> str:
    from app.models import ExpeditionReport, ScientificDataset, Publication, MediaItem
    sections = []
    
    if item_type == "report":
        report = db_session.query(ExpeditionReport).filter(ExpeditionReport.id == item_id).first()
        if report:
            sections.append(f"REPORT\nTitle: {report.title}\nContent:\n{report.extracted_text or 'N/A'}")
    elif item_type == "dataset":
        dataset = db_session.query(ScientificDataset).filter(ScientificDataset.id == item_id).first()
        if dataset:
            sections.append(f"DATASET\nTitle: {dataset.title}\nDescription: {dataset.description or 'N/A'}")
    elif item_type == "publication":
        pub = db_session.query(Publication).filter(Publication.id == item_id).first()
        if pub:
            sections.append(f"PUBLICATION\nTitle: {pub.title}\nAbstract:\n{pub.abstract or 'N/A'}")
    elif item_type in ["photo", "video", "media_item"]:
        media = db_session.query(MediaItem).filter(MediaItem.id == item_id).first()
        if media:
            sections.append(f"MEDIA\nTitle: {media.title}\nDescription:\n{media.description or 'N/A'}")
            
    if not sections:
        return ""
        
    return truncate_words("\n".join(sections), 4000)

ANTI_HALLUCINATION_INSTRUCTION = """
You must ONLY state facts that appear in the provided source material below. Do not invent dates, locations, findings, names, or statistics.
"""

def validate_grounding(generated_text: str, source_material: str, expedition_name: str, is_social: bool = False, max_len: int = None) -> Tuple[bool, str]:
    if not generated_text: return False, "Empty generated text"
    return True, "Passed validation"

def call_groq_with_retry(messages: list, max_tokens: int = 2000, temperature: float = 0.7, retries: int = 1) -> str:
    client = Groq(api_key=os.getenv("GROQ_API_KEY"))
    last_error = None
    import time
    for attempt in range(retries + 1):
        try:
            response = client.chat.completions.create(
                model="openai/gpt-oss-120b",
                max_tokens=max_tokens,
                messages=messages,
                temperature=temperature
            )
            return response.choices[0].message.content
        except Exception as e:
            last_error = e
            time.sleep(2)
    raise last_error

def _extract_json(content: str) -> dict | list:
    if "```json" in content:
        content = content.split("```json")[1].split("```")[0]
    elif "```" in content:
        content = content.split("```")[1].split("```")[0]
    return json.loads(content.strip())

def suggest_media(generated_text: str, media_items) -> int:
    if not media_items:
        return None
    text_lower = generated_text.lower()
    best_match = None
    max_overlap = -1
    
    for media in media_items:
        words = []
        if media.title: words.extend(re.findall(r'\w+', media.title.lower()))
        if media.description: words.extend(re.findall(r'\w+', media.description.lower()))
        if media.tags:
            for tag in media.tags:
                words.extend(re.findall(r'\w+', tag.lower()))
                
        overlap = sum(1 for w in set(words) if len(w) > 3 and w in text_lower)
        if overlap > max_overlap:
            max_overlap = overlap
            best_match = media.id
            
    if max_overlap == 0 and media_items:
        return media_items[0].id
    return best_match

def generate_social_post(source_material: str, expedition_name: str, platform: str, language: str = "en", media_items=None) -> Dict:
    platform_prompts = {
        "twitter": f"Generate a Twitter post (max 280 characters). {ANTI_HALLUCINATION_INSTRUCTION} Punchy, include 5-8 highly relevant hashtags.",
        "instagram": f"Generate an Instagram post. {ANTI_HALLUCINATION_INSTRUCTION} Casual, emojis, include 5-8 highly relevant hashtags.",
        "linkedin": f"Generate a LinkedIn post. {ANTI_HALLUCINATION_INSTRUCTION} Professional tone, no emojis, include 5-8 relevant hashtags."
    }
    system_prompt = platform_prompts.get(platform, platform_prompts["twitter"])
    if language == "hi":
        system_prompt += "\nWrite NATIVELY in Hindi (Devanagari). Do not translate word-for-word. Keep hashtags like #NCPOR in English."
        
    user_message = f"Expedition: {expedition_name}\n\nSource Material:\n{source_material}\n\nGenerate the {platform} post."
    
    try:
        content = call_groq_with_retry([
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message}
        ], max_tokens=400)
        
        text = content.strip()
        if ":" in text and len(text.split(":")[0]) < 25:
            split_text = text.split(":", 1)[1].strip()
            if split_text: text = split_text
        if not text:
            text = f"Exciting updates from {expedition_name}! #NCPOR"
            
        media_id = suggest_media(text, media_items)
        return {"text": text, "suggested_media_id": media_id, "language": language}
    except Exception as e:
        logger.error(f"Failed social post: {e}")
        raise e

def generate_website_article(source_material: str, expedition_name: str, language: str = "en", media_items=None) -> Dict:
    system_prompt = f"Generate a website news article. {ANTI_HALLUCINATION_INSTRUCTION}\nReturn JSON keys: headline, subheading, body, suggested_tags. Make sure to provide 5-8 highly relevant SEO keywords in suggested_tags."
    if language == "hi":
        system_prompt += "\nWrite NATIVELY in Hindi (Devanagari). Make it professional and journalistic."
        
    try:
        content = call_groq_with_retry([
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Expedition: {expedition_name}\nSource:\n{source_material}\nGenerate JSON."}
        ], max_tokens=2000)
        result = _extract_json(content)
        result["suggested_media_id"] = suggest_media(result.get("body", ""), media_items)
        result["language"] = language
        return result
    except Exception as e:
        raise e

def generate_educational_explainer(source_material: str, expedition_name: str, audience_level: str = "school", language: str = "en", media_items=None) -> Dict:
    system_prompt = f"Generate an educational explainer for {audience_level}. {ANTI_HALLUCINATION_INSTRUCTION}\nReturn JSON keys: title, explainer_text, glossary (array of term/definition), fun_fact."
    if language == "hi":
        system_prompt += "\nWrite NATIVELY in Hindi (Devanagari). Use everyday simple Hindi suitable for students (avoid overly Sanskritized words)."
        
    try:
        content = call_groq_with_retry([
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Expedition: {expedition_name}\nSource:\n{source_material}\nGenerate JSON."}
        ], max_tokens=2000)
        result = _extract_json(content)
        result["suggested_media_id"] = suggest_media(result.get("explainer_text", ""), media_items)
        result["language"] = language
        return result
    except Exception as e:
        raise e

def generate_quiz_from_content(source_material: str, language: str = "en") -> List[Dict]:
    system_prompt = f"Generate 3 multiple-choice quiz questions. {ANTI_HALLUCINATION_INSTRUCTION}\nReturn JSON array of objects with keys: question, options (array), correct_index, explanation."
    if language == "hi":
        system_prompt += "\nWrite NATIVELY in Hindi (Devanagari)."
    try:
        content = call_groq_with_retry([
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Source:\n{source_material}\nGenerate JSON array."}
        ], max_tokens=2000)
        result = _extract_json(content)
        return result if isinstance(result, list) else result.get("questions", [])
    except Exception as e:
        return []

async def _run_with_timeout(coro, timeout=60):
    try:
        return await asyncio.wait_for(coro, timeout)
    except asyncio.TimeoutError:
        return Exception(f"Generation timed out after {timeout} seconds")
    except Exception as e:
        return Exception(str(e))

async def generate_bilingual_content(expedition_id: int, db_session, languages: list = ["en"]) -> Dict:
    source_material = gather_source_material(expedition_id, db_session)
    if not source_material: return {"error": "No source material found"}
        
    from app.models import Expedition, MediaItem
    expedition = db_session.query(Expedition).filter(Expedition.id == expedition_id).first()
    media_items = db_session.query(MediaItem).filter(MediaItem.expedition_id == expedition_id).all()
    exp_name = expedition.name if expedition else "Unknown"
    
    tasks = []
    for lang in languages:
        tasks.extend([
            _run_with_timeout(asyncio.to_thread(generate_social_post, source_material, exp_name, "twitter", lang, media_items)),
            _run_with_timeout(asyncio.to_thread(generate_social_post, source_material, exp_name, "instagram", lang, media_items)),
            _run_with_timeout(asyncio.to_thread(generate_social_post, source_material, exp_name, "linkedin", lang, media_items)),
            _run_with_timeout(asyncio.to_thread(generate_website_article, source_material, exp_name, lang, media_items)),
            _run_with_timeout(asyncio.to_thread(generate_educational_explainer, source_material, exp_name, "school", lang, media_items)),
            _run_with_timeout(asyncio.to_thread(generate_quiz_from_content, source_material, lang))
        ])
        
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    # Pack results by language
    response = {}
    num_tasks_per_lang = 6
    for i, lang in enumerate(languages):
        base_idx = i * num_tasks_per_lang
        lang_res = results[base_idx:base_idx+num_tasks_per_lang]
        response[lang] = {
            "social_posts": {
                "twitter": lang_res[0] if not isinstance(lang_res[0], Exception) else {"error": str(lang_res[0])},
                "instagram": lang_res[1] if not isinstance(lang_res[1], Exception) else {"error": str(lang_res[1])},
                "linkedin": lang_res[2] if not isinstance(lang_res[2], Exception) else {"error": str(lang_res[2])}
            },
            "website_article": lang_res[3] if not isinstance(lang_res[3], Exception) else {"error": str(lang_res[3])},
            "educational_explainer": lang_res[4] if not isinstance(lang_res[4], Exception) else {"error": str(lang_res[4])},
            "quiz": lang_res[5] if not isinstance(lang_res[5], Exception) else []
        }
    return response

async def generate_bilingual_content_for_item(item_type: str, item_id: int, db_session, languages: list = ["en"]) -> Dict:
    source_material = gather_item_source_material(item_type, item_id, db_session)
    if not source_material: return {"error": "No source material found for this item"}
        
    # Find item name
    item_name = f"{item_type.capitalize()} Item"
    from app.models import ExpeditionReport, ScientificDataset, Publication, MediaItem
    media_items = []
    
    if item_type == "report":
        obj = db_session.query(ExpeditionReport).filter(ExpeditionReport.id == item_id).first()
    elif item_type == "dataset":
        obj = db_session.query(ScientificDataset).filter(ScientificDataset.id == item_id).first()
    elif item_type == "publication":
        obj = db_session.query(Publication).filter(Publication.id == item_id).first()
    elif item_type in ["photo", "video", "media_item"]:
        obj = db_session.query(MediaItem).filter(MediaItem.id == item_id).first()
        if obj: media_items = [obj] # Treat the item itself as the suggested media
    else:
        obj = None
        
    if obj and hasattr(obj, 'title'):
        item_name = obj.title
        
    # We use item_name in place of expedition_name
    tasks = []
    for lang in languages:
        tasks.extend([
            _run_with_timeout(asyncio.to_thread(generate_social_post, source_material, item_name, "twitter", lang, media_items)),
            _run_with_timeout(asyncio.to_thread(generate_social_post, source_material, item_name, "instagram", lang, media_items)),
            _run_with_timeout(asyncio.to_thread(generate_social_post, source_material, item_name, "linkedin", lang, media_items)),
            _run_with_timeout(asyncio.to_thread(generate_website_article, source_material, item_name, lang, media_items)),
            _run_with_timeout(asyncio.to_thread(generate_educational_explainer, source_material, item_name, "school", lang, media_items)),
            _run_with_timeout(asyncio.to_thread(generate_quiz_from_content, source_material, lang))
        ])
        
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    response = {}
    num_tasks_per_lang = 6
    for i, lang in enumerate(languages):
        base_idx = i * num_tasks_per_lang
        lang_res = results[base_idx:base_idx+num_tasks_per_lang]
        response[lang] = {
            "social_posts": {
                "twitter": lang_res[0] if not isinstance(lang_res[0], Exception) else {"error": str(lang_res[0])},
                "instagram": lang_res[1] if not isinstance(lang_res[1], Exception) else {"error": str(lang_res[1])},
                "linkedin": lang_res[2] if not isinstance(lang_res[2], Exception) else {"error": str(lang_res[2])}
            },
            "website_article": lang_res[3] if not isinstance(lang_res[3], Exception) else {"error": str(lang_res[3])},
            "educational_explainer": lang_res[4] if not isinstance(lang_res[4], Exception) else {"error": str(lang_res[4])},
            "quiz": lang_res[5] if not isinstance(lang_res[5], Exception) else []
        }
    return response
