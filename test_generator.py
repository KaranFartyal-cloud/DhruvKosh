import os
import asyncio
from app.database import SessionLocal
from app.services.content_generator import (
    gather_source_material,
    generate_social_post,
    generate_website_article,
    generate_educational_explainer,
    generate_quiz_from_content
)

# Set your API key
os.environ["GROQ_API_KEY"] = os.getenv("GROQ_API_KEY", "your-api-key-here")

def test_gather_source_material():
    print("=" * 60)
    print("Testing Source Material Gathering")
    print("=" * 60)
    
    db = SessionLocal()
    try:
        # Test with expedition ID 1 (Antarctic)
        source = gather_source_material(1, db)
        print(f"\nGathered {len(source.split())} words of source material")
        print("\nFirst 500 characters:")
        print(source[:500])
        print("...")
        return source
    finally:
        db.close()

def test_social_posts(source_material):
    print("\n" + "=" * 60)
    print("Testing Social Media Posts")
    print("=" * 60)
    
    expedition_name = "42nd Indian Antarctic Expedition"
    
    platforms = ["twitter", "instagram", "linkedin"]
    for platform in platforms:
        print(f"\n--- {platform.upper()} ---")
        result = generate_social_post(source_material, expedition_name, platform)
        print(result)
        print(f"Character count: {len(result)}")

def test_website_article(source_material):
    print("\n" + "=" * 60)
    print("Testing Website Article Generation")
    print("=" * 60)
    
    expedition_name = "42nd Indian Antarctic Expedition"
    result = generate_website_article(source_material, expedition_name)
    
    print(f"\nHeadline: {result.get('headline', 'N/A')}")
    print(f"Subheading: {result.get('subheading', 'N/A')}")
    print(f"\nBody (first 300 chars): {result.get('body', '')[:300]}...")
    print(f"\nSuggested Tags: {result.get('suggested_tags', [])}")

def test_educational_explainer(source_material):
    print("\n" + "=" * 60)
    print("Testing Educational Explainer Generation")
    print("=" * 60)
    
    expedition_name = "42nd Indian Antarctic Expedition"
    
    for audience in ["school", "general_public"]:
        print(f"\n--- Audience: {audience.upper()} ---")
        result = generate_educational_explainer(source_material, expedition_name, audience)
        
        print(f"Title: {result.get('title', 'N/A')}")
        print(f"\nExplainer (first 300 chars): {result.get('explainer_text', '')[:300]}...")
        
        glossary = result.get('glossary', [])
        if glossary:
            print(f"\nGlossary ({len(glossary)} terms):")
            for term in glossary[:2]:  # Show first 2
                print(f"  - {term.get('term', '')}: {term.get('definition', '')}")
        
        print(f"\nFun Fact: {result.get('fun_fact', 'N/A')}")

def test_quiz(source_material):
    print("\n" + "=" * 60)
    print("Testing Quiz Generation")
    print("=" * 60)
    
    result = generate_quiz_from_content(source_material)
    
    print(f"\nGenerated {len(result)} questions")
    
    for i, question in enumerate(result[:2], 1):  # Show first 2 questions
        print(f"\nQuestion {i}:")
        print(f"  {question.get('question', 'N/A')}")
        print(f"  Options: {question.get('options', [])}")
        print(f"  Correct: {question.get('correct_index', 'N/A')}")
        print(f"  Explanation: {question.get('explanation', '')[:100]}...")

if __name__ == "__main__":
    print("AI Content Generator Test Script")
    print("=" * 60)
    
    # Check if API key is set
    if not os.getenv("GROQ_API_KEY") or os.getenv("GROQ_API_KEY") == "your-api-key-here":
        print("ERROR: GROQ_API_KEY not set!")
        print("Please set it as an environment variable or edit this script.")
        exit(1)
    
    print("API Key found. Starting tests...\n")
    
    try:
        # Test source material gathering
        source_material = test_gather_source_material()
        
        if not source_material:
            print("ERROR: No source material gathered. Make sure database is seeded.")
            exit(1)
        
        # Test social posts
        test_social_posts(source_material)
        
        # Test website article
        test_website_article(source_material)
        
        # Test educational explainers
        test_educational_explainer(source_material)
        
        # Test quiz
        test_quiz(source_material)
        
        print("\n" + "=" * 60)
        print("All tests completed!")
        print("=" * 60)
        
    except Exception as e:
        print(f"\nERROR: {str(e)}")
        import traceback
        traceback.print_exc()
