import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add project root to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models import Expedition, ExpeditionReport, ScientificDataset, Publication, MediaItem, GeneratedContent

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def main():
    print("=== NCPOR Data Integrity Verification ===")
    
    db = SessionLocal()
    try:
        # Check Expeditions and Files
        expeditions = db.query(Expedition).all()
        print(f"Found {len(expeditions)} total expeditions in database.\n")
        
        total_files = 0
        missing_files = []
        empty_files = []
        
        print("Checking physical files via /full endpoint...")
        for exp in expeditions:
            response = client.get(f"/api/expeditions/{exp.id}/full")
            if response.status_code == 200:
                data = response.json()
                
                # Check Reports
                for report in data.get("reports", []):
                    if report.get("file_path"):
                        total_files += 1
                        fp = report["file_path"]
                        if not os.path.exists(fp):
                            missing_files.append(("Report", report["id"], fp))
                        elif os.path.getsize(fp) == 0:
                            empty_files.append(("Report", report["id"], fp))
                            
                # Check Datasets
                for dataset in data.get("datasets", []):
                    if dataset.get("file_path"):
                        total_files += 1
                        fp = dataset["file_path"]
                        if not os.path.exists(fp):
                            missing_files.append(("Dataset", dataset["id"], fp))
                        elif os.path.getsize(fp) == 0:
                            empty_files.append(("Dataset", dataset["id"], fp))
                            
                # Check Publications
                for pub in data.get("publications", []):
                    if pub.get("file_path"):
                        total_files += 1
                        fp = pub["file_path"]
                        if not os.path.exists(fp):
                            missing_files.append(("Publication", pub["id"], fp))
                        elif os.path.getsize(fp) == 0:
                            empty_files.append(("Publication", pub["id"], fp))
                            
                # Check Media
                for media in data.get("media_items", []):
                    if media.get("file_path"):
                        total_files += 1
                        fp = media["file_path"]
                        if not os.path.exists(fp):
                            missing_files.append(("Media", media["id"], fp))
                        elif os.path.getsize(fp) == 0:
                            empty_files.append(("Media", media["id"], fp))
        
        print(f"Total files referenced in /full responses: {total_files}")
        if missing_files:
            print(f"❌ FOUND {len(missing_files)} BROKEN FILE REFERENCES:")
            for m in missing_files:
                print(f"   - {m[0]} ID {m[1]}: Path not found -> {m[2]}")
        else:
            print("✅ All file references point to existing physical files.")
            
        if empty_files:
            print(f"⚠️ FOUND {len(empty_files)} ZERO-BYTE FILES:")
            for e in empty_files:
                print(f"   - {e[0]} ID {e[1]}: Empty file -> {e[2]}")
        else:
            print("✅ All physical files have >0 bytes.\n")
            
        # Check Generated Content
        print("Checking generated content...")
        contents = db.query(GeneratedContent).all()
        print(f"Found {len(contents)} generated content items.")
        
        suspicious_content = []
        for item in contents:
            text = item.generated_text
            if not text:
                suspicious_content.append((item.id, "Empty text"))
                continue
                
            text_lower = text.lower().strip()
            if text_lower == "none" or text_lower == "null":
                suspicious_content.append((item.id, "Contains literal 'None'/'null'"))
            elif "error" in text_lower[:50]:
                suspicious_content.append((item.id, "Likely leaked error message"))
                
        if suspicious_content:
            print(f"❌ FOUND {len(suspicious_content)} SUSPICIOUS GENERATED CONTENTS:")
            for s in suspicious_content:
                print(f"   - ID {s[0]}: {s[1]}")
        else:
            print("✅ All generated content looks healthy (non-empty, no leaked errors).")
            
        print("\n=== Verification Complete ===")
        
    finally:
        db.close()

if __name__ == "__main__":
    main()
