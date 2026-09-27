from dotenv import load_dotenv
load_dotenv()
from app.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    conn.execute(text("ALTER TABLE generated_content ADD COLUMN IF NOT EXISTS language VARCHAR DEFAULT 'en'"))
    conn.commit()
    print("Migration complete.")
