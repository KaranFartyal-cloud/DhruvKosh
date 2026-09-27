import os
import asyncio
from typing import Dict, List, Tuple
import logging
import json
from groq import Groq

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def truncate_words(text: str, max_words: int = 500) -> str:
    if not text: return ""
    words = text.split()
    if len(words) <= max_words:
        return text
    return " ".join(words[:max_words]) + "... [TRUNCATED]"

def gather_source_material(expedition_id: int, db_session) -> str:
    """Gather all related content for an expedition into a structured text block."""
    from app.models import Expedition, ExpeditionReport, ScientificDataset, Publication, MediaItem
    
    expedition = db_session.query(Expedition).filter(Expedition.id == expedition_id).first()
    if not expedition:
        return ""
    
    sections = []
    
    expedition_info = f"""EXPEDITION INFO
Name: {expedition.name}
Code: {expedition.expedition_code}
Region: {expedition.region.value}
Dates: {expedition.start_date} to {expedition.end_date}
Vessel/Base: {expedition.vessel_or_base_name or 'N/A'}
Team Lead: {expedition.team_lead or 'N/A'}
Summary: {expedition.summary or 'No summary available'}
"""
    sections.append(expedition_info)
    
    reports = db_session.query(ExpeditionReport).filter(ExpeditionReport.expedition_id == expedition_id).all()
    if reports:
        report_section = "\nREPORT EXCERPTS\n"
        for report in reports:
            if not report.extracted_text or report.extracted_text.strip() == "":
                report_section += f"\n- {report.title} ({report.report_type.value}): Report text unavailable.\n"
            else:
                truncated = truncate_words(report.extracted_text, 600)
                report_section += f"\n- {report.title} ({report.report_type.value}):\n{truncated}\n"
        sections.append(report_section)
    else:
        sections.append("\nREPORT EXCERPTS\nNo reports currently archived for this expedition.")
    
    datasets = db_session.query(ScientificDataset).filter(ScientificDataset.expedition_id == expedition_id).all()
    if datasets:
        dataset_section = "\nDATASETS\n"
        for dataset in datasets:
            params = ", ".join(dataset.parameters_measured) if dataset.parameters_measured else "N/A"
            dataset_section += f"\n- {dataset.title}\nType: {dataset.data_type.value}\nParameters: {params}\nDescription: {dataset.description or 'N/A'}\n"
        sections.append(dataset_section)
    else:
        sections.append("\nDATASETS\nNo datasets currently archived for this expedition.")
    
    publications = db_session.query(Publication).filter(Publication.expedition_id == expedition_id).all()
    if publications:
        pub_section = "\nPUBLICATIONS\n"
        for pub in publications:
            authors = ", ".join(pub.authors) if pub.authors else "N/A"
            pub_section += f"\n- {pub.title}\nAuthors: {authors}\nJournal: {pub.journal_or_venue or 'N/A'}\nAbstract: {pub.abstract or 'N/A'}\n"
        sections.append(pub_section)
    else:
        sections.append("\nPUBLICATIONS\nNo publications currently archived for this expedition.")
    
    media_items = db_session.query(MediaItem).filter(MediaItem.expedition_id == expedition_id).all()
    if media_items:
        media_section = "\nMEDIA DESCRIPTIONS\n"
        for media in media_items:
            media_section += f"\n- {media.title} ({media.media_type.value})\nDescription: {media.description or 'N/A'}\nLocation: {media.location_description or 'N/A'}\n"
        sections.append(media_section)
    else:
        sections.append("\nMEDIA DESCRIPTIONS\nNo media currently archived for this expedition.")
    
    full_text = "\n".join(sections)
    return truncate_words(full_text, 4000)

ANTI_HALLUCINATION_INSTRUCTION = """
You must ONLY state facts that appear in the provided source material below. Do not invent dates, locations, findings, names, or statistics. If the source material lacks a specific detail (e.g. exact team size, precise findings), write around it generally rather than making up a specific-sounding but false detail. If asked to write about something with genuinely no relevant source material, explicitly generate a shorter, more general piece rather than fabricating specifics to fill length.
"""

def validate_grounding(generated_text: str, source_material: str, expedition_name: str, is_social: bool = False, max_len: int = None) -> Tuple[bool, str]:
    if not generated_text:
        return False, "Empty generated text"
        
    text_lower = generated_text.lower()
    
    if is_social and max_len:
        if len(generated_text) > max_len:
            return False, f"Exceeded length limit ({len(generated_text)} > {max_len})"
            
    if not is_social:
        sig_words = [w.lower() for w in expedition_name.split() if len(w) > 3 and w.lower() not in ['indian', 'expedition', 'the', 'and']]
        if sig_words:
            found_any = any(w in text_lower for w in sig_words)
            if not found_any and expedition_name.lower() not in text_lower:
                return False, f"Expedition name/keywords not found in long-form text"
                
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

def generate_social_post(source_material: str, expedition_name: str, platform: str) -> str:
    """Generate social media post for a specific platform."""
    platform_prompts = {
        "twitter": f"""You are a social media manager for NCPOR.
Generate a Twitter post (max 280 characters) about the provided expedition.
{ANTI_HALLUCINATION_INSTRUCTION}
Requirements:
- Punchy and engaging
- 2-3 relevant hashtags
- No jargon
Return ONLY the post text, no preamble.""",
        "instagram": f"""You are a social media manager for NCPOR.
Generate an Instagram post about the provided expedition.
{ANTI_HALLUCINATION_INSTRUCTION}
Requirements:
- Casual, friendly tone
- 1-2 emojis allowed
- 2-3 sentences
- 4-5 hashtags
Return ONLY the post text, no preamble.""",
        "linkedin": f"""You are a communications officer for NCPOR.
Generate a LinkedIn post about the provided expedition.
{ANTI_HALLUCINATION_INSTRUCTION}
Requirements:
- Professional, authoritative tone
- 3-4 sentences
- Position NCPOR's institutional credibility
- No emojis
Return ONLY the post text, no preamble."""
    }
    
    max_tokens_map = {"twitter": 100, "instagram": 200, "linkedin": 300}
    max_lens = {"twitter": 280, "instagram": 2200, "linkedin": 3000}
    
    system_prompt = platform_prompts.get(platform, platform_prompts["twitter"])
    user_message = f"Expedition: {expedition_name}\n\nSource Material:\n{source_material}\n\nGenerate the {platform} post."
    
    try:
        content = call_groq_with_retry([
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message}
        ], max_tokens=max_tokens_map.get(platform, 200))
        
        generated_text = content.strip()
        if ":" in generated_text and len(generated_text.split(":")[0]) < 20:
            generated_text = generated_text.split(":", 1)[1].strip()
            
        is_valid, reason = validate_grounding(generated_text, source_material, expedition_name, is_social=True, max_len=max_lens.get(platform))
        if not is_valid:
            # Retry once with stricter length requirement for Twitter
            if platform == "twitter" and "length" in reason:
                content = call_groq_with_retry([
                    {"role": "system", "content": system_prompt + "\nSTRICT LIMIT: MUST BE UNDER 280 CHARS."},
                    {"role": "user", "content": user_message}
                ], max_tokens=100)
                generated_text = content.strip()
                is_valid2, _ = validate_grounding(generated_text, source_material, expedition_name, is_social=True, max_len=280)
                if not is_valid2:
                    return f"[LOW CONFIDENCE - Needs Editing] {generated_text}"
            else:
                return f"[LOW CONFIDENCE - {reason}] {generated_text}"
                
        return generated_text
    except Exception as e:
        logger.error(f"Failed to generate {platform} post: {str(e)}")
        raise e

def generate_website_article(source_material: str, expedition_name: str) -> Dict:
    system_prompt = f"""You are a science communications writer for NCPOR.
Generate a website news article about the provided expedition.
{ANTI_HALLUCINATION_INSTRUCTION}
Requirements:
- Third-person, journalistic tone
- 250-400 words
- Structure: strong opening paragraph, details from findings, closing about broader mission
- Return as JSON with keys: "headline", "subheading", "body", "suggested_tags" (3-5 items array)
Return ONLY valid JSON, no preamble."""

    user_message = f"Expedition: {expedition_name}\n\nSource Material:\n{source_material}\n\nGenerate a website article in JSON format."
    try:
        content = call_groq_with_retry([
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message}
        ], max_tokens=2000)
        
        result = _extract_json(content)
        
        body_text = result.get("body", "")
        is_valid, reason = validate_grounding(body_text, source_material, expedition_name, is_social=False)
        if not is_valid:
            result["low_confidence"] = True
            result["validation_warning"] = reason
            
        return result
    except Exception as e:
        logger.error(f"Failed to generate article: {str(e)}")
        raise e

def generate_educational_explainer(source_material: str, expedition_name: str, audience_level: str) -> Dict:
    audience_instructions = {
        "school": "Age 12-16, simple language, use analogies, wonder/curiosity tone",
        "general_public": "Adult layperson, accessible but more nuanced"
    }
    system_prompt = f"""You are an educator for NCPOR.
Generate an educational explainer about the provided expedition.
{ANTI_HALLUCINATION_INSTRUCTION}
Requirements:
- Target audience: {audience_instructions.get(audience_level, audience_instructions['general_public'])}
- Return as JSON with keys: "title", "explainer_text", "glossary" (array of {{"term": "...", "definition": "..."}}), "fun_fact"
- Glossary must ONLY use terms actually in the source material.
Return ONLY valid JSON, no preamble."""

    user_message = f"Expedition: {expedition_name}\nAudience Level: {audience_level}\n\nSource Material:\n{source_material}\n\nGenerate explainer in JSON format."
    try:
        content = call_groq_with_retry([
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message}
        ], max_tokens=2000)
        
        result = _extract_json(content)
        
        body_text = result.get("explainer_text", "")
        is_valid, reason = validate_grounding(body_text, source_material, expedition_name, is_social=False)
        if not is_valid:
            result["low_confidence"] = True
            result["validation_warning"] = reason
            
        return result
    except Exception as e:
        logger.error(f"Failed to generate explainer: {str(e)}")
        raise e

def generate_quiz_from_content(source_material: str) -> List[Dict]:
    system_prompt = f"""You are an educator creating a quiz for NCPOR.
Generate UP TO 3 multiple-choice quiz questions based on facts in the source material.
If the source material is very thin, generate fewer questions (even just 1) rather than making up unanswerable questions.
{ANTI_HALLUCINATION_INSTRUCTION}
Requirements:
- 4 options per question
- Return as JSON array of objects with keys: "question", "options" (array of 4), "correct_index" (0-3), "explanation"
Return ONLY valid JSON array, no preamble."""

    user_message = f"Source Material:\n{source_material}\n\nGenerate quiz questions in JSON array format."
    try:
        content = call_groq_with_retry([
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message}
        ], max_tokens=2000)
        
        result = _extract_json(content)
        return result if isinstance(result, list) else result.get("questions", [])
    except Exception as e:
        logger.error(f"Failed to generate quiz: {str(e)}")
        raise e

async def _run_with_timeout(coro, timeout=45):
    try:
        return await asyncio.wait_for(coro, timeout)
    except asyncio.TimeoutError:
        return Exception(f"Generation timed out after {timeout} seconds")
    except Exception as e:
        return Exception(str(e))

async def generate_all_content(expedition_id: int, db_session) -> Dict:
    source_material = gather_source_material(expedition_id, db_session)
    if not source_material:
        return {"error": "No source material found for this expedition"}
        
    with open(f"source_material_{expedition_id}.log", "w", encoding="utf-8") as f:
        f.write(source_material)
        
    from app.models import Expedition
    expedition = db_session.query(Expedition).filter(Expedition.id == expedition_id).first()
    expedition_name = expedition.name if expedition else "Unknown Expedition"
    
    tasks = [
        _run_with_timeout(asyncio.to_thread(generate_social_post, source_material, expedition_name, "twitter")),
        _run_with_timeout(asyncio.to_thread(generate_social_post, source_material, expedition_name, "instagram")),
        _run_with_timeout(asyncio.to_thread(generate_social_post, source_material, expedition_name, "linkedin")),
        _run_with_timeout(asyncio.to_thread(generate_website_article, source_material, expedition_name)),
        _run_with_timeout(asyncio.to_thread(generate_educational_explainer, source_material, expedition_name, "school")),
        _run_with_timeout(asyncio.to_thread(generate_quiz_from_content, source_material))
    ]
    
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    generation_errors = {}
    for i, r in enumerate(results):
        if isinstance(r, Exception):
            names = ["twitter", "instagram", "linkedin", "website_article", "educational_explainer", "quiz"]
            generation_errors[names[i]] = str(r)
            
    response = {
        "social_posts": {
            "twitter": results[0] if not isinstance(results[0], Exception) else f"Error: {str(results[0])}",
            "instagram": results[1] if not isinstance(results[1], Exception) else f"Error: {str(results[1])}",
            "linkedin": results[2] if not isinstance(results[2], Exception) else f"Error: {str(results[2])}"
        },
        "website_article": results[3] if not isinstance(results[3], Exception) else {"error": str(results[3])},
        "educational_explainer": results[4] if not isinstance(results[4], Exception) else {"error": str(results[4])},
        "quiz": results[5] if not isinstance(results[5], Exception) else [],
        "generation_errors": generation_errors
    }
    
    return response
