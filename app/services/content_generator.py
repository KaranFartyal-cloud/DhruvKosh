from groq import Groq
import os
import asyncio
from typing import Dict, List
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def gather_source_material(expedition_id: int, db_session) -> str:
    """Gather all related content for an expedition into a structured text block."""
    from app.models import Expedition, ExpeditionReport, ScientificDataset, Publication, MediaItem
    
    expedition = db_session.query(Expedition).filter(Expedition.id == expedition_id).first()
    if not expedition:
        return ""
    
    sections = []
    
    # Expedition Info
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
    
    # Reports
    reports = db_session.query(ExpeditionReport).filter(ExpeditionReport.expedition_id == expedition_id).all()
    if reports:
        report_section = "\nREPORT EXCERPTS\n"
        for report in reports:
            if report.extracted_text:
                # Truncate to ~500 words per report
                words = report.extracted_text.split()
                truncated = " ".join(words[:500])
                report_section += f"\n{report.title} ({report.report_type.value}):\n{truncated}\n"
        sections.append(report_section)
    
    # Datasets
    datasets = db_session.query(ScientificDataset).filter(ScientificDataset.expedition_id == expedition_id).all()
    if datasets:
        dataset_section = "\nDATASETS\n"
        for dataset in datasets:
            params = ", ".join(dataset.parameters_measured) if dataset.parameters_measured else "N/A"
            dataset_section += f"\n{dataset.title}\nType: {dataset.data_type.value}\nParameters: {params}\nDescription: {dataset.description or 'N/A'}\n"
        sections.append(dataset_section)
    
    # Publications
    publications = db_session.query(Publication).filter(Publication.expedition_id == expedition_id).all()
    if publications:
        pub_section = "\nPUBLICATIONS\n"
        for pub in publications:
            authors = ", ".join(pub.authors) if pub.authors else "N/A"
            pub_section += f"\n{pub.title}\nAuthors: {authors}\nJournal: {pub.journal_or_venue or 'N/A'}\nAbstract: {pub.abstract or 'N/A'}\n"
        sections.append(pub_section)
    
    # Media
    media_items = db_session.query(MediaItem).filter(MediaItem.expedition_id == expedition_id).all()
    if media_items:
        media_section = "\nMEDIA DESCRIPTIONS\n"
        for media in media_items:
            media_section += f"\n{media.title} ({media.media_type.value})\nDescription: {media.description or 'N/A'}\nLocation: {media.location_description or 'N/A'}\n"
        sections.append(media_section)
    
    # Combine and truncate total to ~4000 words
    full_text = "\n".join(sections)
    words = full_text.split()
    if len(words) > 4000:
        full_text = " ".join(words[:4000])
    
    return full_text

def generate_social_post(source_material: str, expedition_name: str, platform: str) -> str:
    """Generate social media post for a specific platform."""
    
    client = Groq(api_key=os.getenv("GROQ_API_KEY"))
    
    platform_prompts = {
        "twitter": """You are a social media manager for NCPOR (National Centre for Polar and Ocean Research), an Indian government polar research institute under the Ministry of Earth Sciences.

Generate a Twitter post (max 280 characters) about the provided expedition content. Requirements:
- Punchy and engaging
- 2-3 relevant hashtags (e.g., #PolarScience #NCPOR #IndianAntarcticExpedition)
- No jargon
- Use ONLY facts present in the provided source material
- Do not invent expedition details, dates, locations, or findings
- If source material is limited, keep the post general rather than fabricating specifics

Return ONLY the post text, no preamble.""",
        
        "instagram": """You are a social media manager for NCPOR (National Centre for Polar and Ocean Research), an Indian government polar research institute.

Generate an Instagram post about the provided expedition content. Requirements:
- Casual, friendly tone
- 1-2 emojis allowed
- 2-3 sentences
- 4-5 hashtags at the end
- Use ONLY facts present in the provided source material
- Do not invent expedition details, dates, locations, or findings
- If source material is limited, keep the post general rather than fabricating specifics

Return ONLY the post text, no preamble.""",
        
        "linkedin": """You are a communications officer for NCPOR (National Centre for Polar and Ocean Research), an Indian government polar research institute.

Generate a LinkedIn post about the provided expedition content. Requirements:
- Professional, authoritative tone
- 3-4 sentences
- Position NCPOR's institutional credibility
- 1-2 hashtags maximum
- No emojis
- Use ONLY facts present in the provided source material
- Do not invent expedition details, dates, locations, or findings
- If source material is limited, keep the post general rather than fabricating specifics

Return ONLY the post text, no preamble."""
    }
    
    max_tokens = {
        "twitter": 100,
        "instagram": 200,
        "linkedin": 300
    }
    
    system_prompt = platform_prompts.get(platform, platform_prompts["twitter"])
    
    user_message = f"""Expedition: {expedition_name}

Source Material:
{source_material}

Generate the {platform} post."""
    
    try:
        response = client.chat.completions.create(
            model="openai/gpt-oss-120b",
            max_tokens=max_tokens.get(platform, 200),
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ],
            temperature=0.7
        )
        
        generated_text = response.choices[0].message.content.strip()
        
        # Remove any preamble
        if ":" in generated_text and len(generated_text.split(":")[0]) < 50:
            generated_text = generated_text.split(":", 1)[1].strip()
        
        return generated_text
    except Exception as e:
        logger.error(f"Failed to generate {platform} post: {str(e)}")
        return f"Error generating {platform} post: {str(e)}"

def generate_website_article(source_material: str, expedition_name: str) -> Dict:
    """Generate a website article for NCPOR's news section."""
    
    client = Groq(api_key=os.getenv("GROQ_API_KEY"))
    
    system_prompt = """You are a science communications writer for NCPOR (National Centre for Polar and Ocean Research), an Indian government polar research institute under the Ministry of Earth Sciences.

Generate a website news article about the provided expedition content. Requirements:
- Third-person, journalistic tone suitable for a government science website
- 250-400 words
- Return as JSON with these exact keys: "headline", "subheading", "body", "suggested_tags"
- Structure: strong opening paragraph (what/where/why this matters), then details from findings, then closing about NCPOR's broader mission
- Use ONLY facts present in the provided source material
- Do not invent expedition details, dates, locations, or findings
- Should read like something that could genuinely appear on ncpor.gov.in
- suggested_tags should be 3-5 relevant hashtags for the website

Return ONLY valid JSON, no preamble."""

    user_message = f"""Expedition: {expedition_name}

Source Material:
{source_material}

Generate a website article in JSON format with headline, subheading, body, and suggested_tags."""

    try:
        response = client.chat.completions.create(
            model="openai/gpt-oss-120b",
            max_tokens=2000,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ],
            temperature=0.7
        )
        
        import json
        content = response.choices[0].message.content
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0]
        elif "```" in content:
            content = content.split("```")[1].split("```")[0]
        result = json.loads(content.strip())
        return result
    except Exception as e:
        logger.error(f"Failed to generate website article: {str(e)}")
        return {
            "headline": "Error generating article",
            "subheading": "Please try again",
            "body": f"Error: {str(e)}",
            "suggested_tags": []
        }

def generate_educational_explainer(source_material: str, expedition_name: str, audience_level: str) -> Dict:
    """Generate an educational explainer for students or general public."""
    
    client = Groq(api_key=os.getenv("GROQ_API_KEY"))
    
    audience_instructions = {
        "school": "Age 12-16, simple language, use analogies, wonder/curiosity tone, explain WHY this matters for people in India",
        "general_public": "Adult layperson, still accessible but more nuanced, explain the broader significance"
    }
    
    system_prompt = f"""You are an educator for NCPOR (National Centre for Polar and Ocean Research), creating educational content about polar science.

Generate an educational explainer about the provided expedition content. Requirements:
- Target audience: {audience_instructions.get(audience_level, audience_instructions['general_public'])}
- Return as JSON with these exact keys: "title", "explainer_text", "glossary", "fun_fact"
- explainer_text should explain WHY this research matters in plain language
- glossary should pull out 3-5 technical terms actually present in the source material and define them simply
- fun_fact should be one interesting fact from the source material
- Use ONLY facts present in the provided source material
- Do not invent expedition details, dates, locations, or findings
- This directly serves the "Smart Education" theme - make it engaging and accessible

Return ONLY valid JSON, no preamble."""

    user_message = f"""Expedition: {expedition_name}
Audience Level: {audience_level}

Source Material:
{source_material}

Generate an educational explainer in JSON format with title, explainer_text, glossary (array of {{"term": "...", "definition": "..."}}), and fun_fact."""

    try:
        response = client.chat.completions.create(
            model="openai/gpt-oss-120b",
            max_tokens=2000,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ],
            temperature=0.7
        )
        
        import json
        content = response.choices[0].message.content
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0]
        elif "```" in content:
            content = content.split("```")[1].split("```")[0]
        result = json.loads(content.strip())
        return result
    except Exception as e:
        logger.error(f"Failed to generate educational explainer: {str(e)}")
        return {
            "title": "Error generating explainer",
            "explainer_text": f"Error: {str(e)}",
            "glossary": [],
            "fun_fact": "Please try again"
        }

def generate_quiz_from_content(source_material: str) -> List[Dict]:
    """Generate multiple-choice quiz questions based on the content."""
    
    client = Groq(api_key=os.getenv("GROQ_API_KEY"))
    
    system_prompt = """You are an educator creating quiz content for NCPOR's polar science education program.

Generate 3 multiple-choice quiz questions based on facts in the provided source material. Requirements:
- Each question should have 4 options
- Return as JSON array with these exact keys per question: "question", "options" (array of 4 strings), "correct_index" (0-3), "explanation"
- Questions should test understanding of key facts from the source material
- Use ONLY facts present in the provided source material
- Do not invent details not in the source
- Make questions educational but not overly difficult

Return ONLY valid JSON array, no preamble."""

    user_message = f"""Source Material:
{source_material}

Generate 3 multiple-choice quiz questions in JSON array format."""

    try:
        response = client.chat.completions.create(
            model="openai/gpt-oss-120b",
            max_tokens=2000,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ],
            temperature=0.7
        )
        
        import json
        content = response.choices[0].message.content
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0]
        elif "```" in content:
            content = content.split("```")[1].split("```")[0]
        result = json.loads(content.strip())
        return result if isinstance(result, list) else result.get("questions", [])
    except Exception as e:
        logger.error(f"Failed to generate quiz: {str(e)}")
        return []

async def _run_with_timeout(coro, timeout=30):
    try:
        return await asyncio.wait_for(coro, timeout)
    except asyncio.TimeoutError:
        return Exception(f"Generation timed out after {timeout} seconds")
    except Exception as e:
        return Exception(str(e))

async def generate_all_content(expedition_id: int, db_session) -> Dict:
    """Orchestrate all content generation concurrently."""
    
    # Gather source material once
    source_material = gather_source_material(expedition_id, db_session)
    
    if not source_material:
        return {"error": "No source material found for this expedition"}
        
    # Log the source material for transparency/debugging
    with open(f"source_material_{expedition_id}.log", "w", encoding="utf-8") as f:
        f.write(source_material)
    
    # Get expedition name
    from app.models import Expedition
    expedition = db_session.query(Expedition).filter(Expedition.id == expedition_id).first()
    expedition_name = expedition.name if expedition else "Unknown Expedition"
    
    # Run all generations concurrently
    tasks = [
        _run_with_timeout(asyncio.to_thread(generate_social_post, source_material, expedition_name, "twitter")),
        _run_with_timeout(asyncio.to_thread(generate_social_post, source_material, expedition_name, "instagram")),
        _run_with_timeout(asyncio.to_thread(generate_social_post, source_material, expedition_name, "linkedin")),
        _run_with_timeout(asyncio.to_thread(generate_website_article, source_material, expedition_name)),
        _run_with_timeout(asyncio.to_thread(generate_educational_explainer, source_material, expedition_name, "school")),
        _run_with_timeout(asyncio.to_thread(generate_quiz_from_content, source_material))
    ]
    
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    generation_errors = []
    for i, r in enumerate(results):
        if isinstance(r, Exception):
            generation_errors.append(f"Task {i} failed: {str(r)}")
            
    response = {
        "social_posts": {
            "twitter": results[0] if not isinstance(results[0], Exception) else "Error: " + str(results[0]),
            "instagram": results[1] if not isinstance(results[1], Exception) else "Error: " + str(results[1]),
            "linkedin": results[2] if not isinstance(results[2], Exception) else "Error: " + str(results[2])
        },
        "website_article": results[3] if not isinstance(results[3], Exception) else {"error": str(results[3])},
        "educational_explainer": results[4] if not isinstance(results[4], Exception) else {"error": str(results[4])},
        "quiz": results[5] if not isinstance(results[5], Exception) else [],
        "generation_errors": generation_errors
    }
    
    return response
