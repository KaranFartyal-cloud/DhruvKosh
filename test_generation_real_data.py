import os
import sys
import asyncio
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add project root to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models import Expedition
from app.services.content_generator import gather_source_material, generate_all_content, validate_grounding

async def main():
    print("=== NCPOR AI Content Generation Verification ===")
    
    db = SessionLocal()
    try:
        expeditions = db.query(Expedition).all()
        print(f"Found {len(expeditions)} total expeditions in database.\n")
        
        for exp in expeditions:
            print("="*60)
            print(f"TESTING EXPEDITION: {exp.name}")
            print("="*60)
            
            # 1. Gather Source Material
            print("\n--- 1. SOURCE MATERIAL ---")
            source_material = gather_source_material(exp.id, db)
            print(source_material[:800] + "\n... [TRUNCATED FOR DISPLAY]" if len(source_material) > 800 else source_material)
            
            if "No reports currently archived" in source_material:
                print("\n[NOTE] Correctly handled empty reports section.")
            if "Report text unavailable" in source_material:
                print("\n[NOTE] Correctly handled unextractable report PDF.")
                
            # 2. Generate Content
            print("\n--- 2. GENERATING CONTENT ---")
            print("Calling Groq APIs concurrently... (this may take up to 45s)")
            results = await generate_all_content(exp.id, db)
            
            if "error" in results and len(results) == 1:
                print(f"Generation failed entirely: {results['error']}")
                continue
                
            errors = results.get("generation_errors", {})
            if errors:
                print(f"⚠️ Partial Generation Errors Occurred: {errors}")
            else:
                print("✅ All generations completed without API/Timeout exceptions.")
                
            # 3. Validation Checks
            print("\n--- 3. VALIDATION CHECKS ---")
            
            # Twitter
            twitter_text = results["social_posts"]["twitter"]
            print(f"\n[Twitter] {twitter_text}")
            if "Error:" not in twitter_text and "[LOW CONFIDENCE" not in twitter_text:
                valid, reason = validate_grounding(twitter_text, source_material, exp.name, is_social=True, max_len=280)
                if valid:
                    print("✅ PASS: Grounded and within length limit.")
                else:
                    print(f"❌ FAIL: {reason}")
            else:
                print("⚠️ FAIL: Pre-validation flagged it as low confidence or error.")
                
            # LinkedIn
            linkedin_text = results["social_posts"]["linkedin"]
            print(f"\n[LinkedIn] {linkedin_text}")
            if "Error:" not in linkedin_text and "[LOW CONFIDENCE" not in linkedin_text:
                valid, reason = validate_grounding(linkedin_text, source_material, exp.name, is_social=True, max_len=3000)
                if valid:
                    print("✅ PASS: Valid.")
                else:
                    print(f"❌ FAIL: {reason}")
                    
            # Website Article
            article = results["website_article"]
            print(f"\n[Article Headline] {article.get('headline')}")
            if article.get("low_confidence"):
                print(f"❌ FAIL: Validation Warning -> {article.get('validation_warning')}")
            elif not article.get("error"):
                print("✅ PASS: Valid structure and grounded.")
                
            # Explainer
            explainer = results["educational_explainer"]
            print(f"\n[Explainer Title] {explainer.get('title')}")
            if explainer.get("low_confidence"):
                print(f"❌ FAIL: Validation Warning -> {explainer.get('validation_warning')}")
            elif not explainer.get("error"):
                print("✅ PASS: Valid structure and grounded.")
                
            # Quiz
            quiz = results["quiz"]
            print(f"\n[Quiz] Generated {len(quiz)} questions.")
            if len(quiz) > 0 and len(quiz) <= 3:
                print("✅ PASS: Quiz question count is sane.")
            else:
                print("⚠️ WARNING: Quiz question count is 0 or >3.")
                
            print("\n")
            
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(main())
