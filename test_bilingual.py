import asyncio
from dotenv import load_dotenv
load_dotenv()
from app.database import SessionLocal
from app.models import Expedition
from app.services.content_generator import generate_bilingual_content
import json

async def test_bilingual():
    db = SessionLocal()
    exp = db.query(Expedition).first()
    print(f"Testing for Expedition: {exp.name} (ID: {exp.id})")
    try:
        res = await generate_bilingual_content(exp.id, db, ["en", "hi"])
        
        with open("bilingual_output.json", "w", encoding="utf-8") as f:
            json.dump(res, f, ensure_ascii=False, indent=2)
        print("Successfully wrote to bilingual_output.json")
        
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(test_bilingual())
