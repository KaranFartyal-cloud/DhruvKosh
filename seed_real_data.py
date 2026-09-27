import os
import csv
import shutil
import uuid
import pandas as pd
from datetime import datetime
from app.database import SessionLocal, init_db
from app.models import (
    User, Expedition, ExpeditionReport, ScientificDataset, 
    Publication, MediaItem, InstitutionalActivity,
    Region, ExpeditionStatus, ReportType, DataType, FileFormat,
    MediaType, ActivityType, LicenseType, Role
)
import hashlib

def simple_hash(password: str) -> str:
    """Simple SHA256 hash for hackathon demo"""
    return hashlib.sha256(password.encode()).hexdigest()

def read_csv_safe(filepath, required_columns):
    """Read CSV file with validation"""
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"Required file not found: {filepath}")
    
    with open(filepath, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        rows = list(reader)
        
        # Validate required columns
        if not all(col in reader.fieldnames for col in required_columns):
            missing = set(required_columns) - set(reader.fieldnames)
            raise ValueError(f"Missing required columns in {filepath}: {missing}")
        
        return rows

def create_real_data_directories():
    """Create directory structure for real data"""
    directories = [
        'real_data/datasets',
        'real_data/reports',
        'real_data/media/photos',
        'real_data/media/videos',
        'real_data/media/thumbnails'
    ]
    
    for directory in directories:
        os.makedirs(directory, exist_ok=True)
        print(f"Created directory: {directory}")

def seed_expeditions(db):
    """Seed expeditions from CSV file"""
    print("\n" + "="*60)
    print("Seeding Expeditions")
    print("="*60)
    
    try:
        rows = read_csv_safe('real_data/expeditions_template.csv', [
            'expedition_name', 'expedition_code', 'region', 'start_date', 
            'end_date', 'vessel_or_base_name', 'team_lead', 'team_size', 
            'summary', 'status'
        ])
    except Exception as e:
        print(f"ERROR reading expeditions CSV: {e}")
        print("Please ensure real_data/expeditions_template.csv exists with proper format")
        return
    
    seeded_count = 0
    for row in rows:
        # Check if expedition already exists (by code)
        existing = db.query(Expedition).filter(
            Expedition.expedition_code == row['expedition_code']
        ).first()
        
        if existing:
            print(f"Skipping duplicate expedition: {row['expedition_code']}")
            continue
        
        # Validate required fields
        if not row['expedition_name'] or not row['expedition_code']:
            print(f"ERROR: Missing required fields in row: {row}")
            continue
        
        try:
            expedition = Expedition(
                name=row['expedition_name'],
                expedition_code=row['expedition_code'],
                region=Region(row['region'].lower()),
                start_date=datetime.strptime(row['start_date'], '%Y-%m-%d').date() if row['start_date'] else None,
                end_date=datetime.strptime(row['end_date'], '%Y-%m-%d').date() if row['end_date'] else None,
                vessel_or_base_name=row['vessel_or_base_name'],
                team_lead=row['team_lead'],
                team_size=int(row['team_size']) if row['team_size'] else None,
                summary=row['summary'],
                status=ExpeditionStatus(row['status'].lower())
            )
            db.add(expedition)
            db.commit()
            db.refresh(expedition)
            print(f"✓ Seeded expedition: {row['expedition_code']}")
            seeded_count += 1
        except Exception as e:
            db.rollback()
            print(f"ERROR seeding expedition {row['expedition_code']}: {e}")
    
    print(f"\nSeeded {seeded_count} expeditions")

def seed_publications(db):
    """Seed publications from CSV file"""
    print("\n" + "="*60)
    print("Seeding Publications")
    print("="*60)
    
    try:
        rows = read_csv_safe('real_data/publications_template.csv', [
            'title', 'authors', 'abstract', 'journal_or_venue', 
            'publication_date', 'doi', 'keywords', 'expedition_code_link'
        ])
    except Exception as e:
        print(f"ERROR reading publications CSV: {e}")
        print("Please ensure real_data/publications_template.csv exists with proper format")
        return
    
    seeded_count = 0
    for row in rows:
        # Check if publication already exists (by title)
        existing = db.query(Publication).filter(
            Publication.title == row['title']
        ).first()
        
        if existing:
            print(f"Skipping duplicate publication: {row['title'][:50]}...")
            continue
        
        # Validate required fields
        if not row['title'] or not row['authors']:
            print(f"ERROR: Missing required fields in publication: {row['title']}")
            continue
        
        # Find expedition by code
        expedition = None
        if row['expedition_code_link']:
            expedition = db.query(Expedition).filter(
                Expedition.expedition_code == row['expedition_code_link']
            ).first()
        
        try:
            # Parse authors and keywords
            authors_list = [a.strip() for a in row['authors'].split(',')]
            keywords_list = [k.strip() for k in row['keywords'].split(',')] if row['keywords'] else []
            
            # Generate citation
            year = row['publication_date'][:4] if row['publication_date'] else "n.d."
            citation = f"{', '.join(authors_list[:3])} ({year}). {row['title']}. {row['journal_or_venue']}."
            if row['doi']:
                citation += f" DOI: {row['doi']}"
            
            publication = Publication(
                expedition_id=expedition.id if expedition else None,
                title=row['title'],
                authors=authors_list,
                abstract=row['abstract'],
                journal_or_venue=row['journal_or_venue'],
                publication_date=datetime.strptime(row['publication_date'], '%Y-%m-%d').date() if row['publication_date'] else None,
                doi=row['doi'],
                citation_text=citation,
                keywords=keywords_list
            )
            db.add(publication)
            db.commit()
            db.refresh(publication)
            print(f"✓ Seeded publication: {row['title'][:50]}...")
            seeded_count += 1
        except Exception as e:
            db.rollback()
            print(f"ERROR seeding publication: {e}")
    
    print(f"\nSeeded {seeded_count} publications")

def seed_datasets(db):
    """Seed datasets from real CSV files"""
    print("\n" + "="*60)
    print("Seeding Scientific Datasets")
    print("="*60)
    
    # Check for datasets metadata file
    metadata_file = 'real_data/datasets_metadata.csv'
    if not os.path.exists(metadata_file):
        print(f"WARNING: {metadata_file} not found. Skipping dataset seeding.")
        print("Please create datasets_metadata.csv based on DATASET_SOURCES.md")
        return
    
    try:
        rows = read_csv_safe(metadata_file, [
            'filename', 'title', 'description', 'data_type', 'file_format',
            'parameters_measured', 'collection_start_date', 'collection_end_date',
            'spatial_coverage', 'license_type', 'expedition_code_link'
        ])
    except Exception as e:
        print(f"ERROR reading datasets metadata CSV: {e}")
        return
    
    seeded_count = 0
    for row in rows:
        # Check if dataset file exists
        file_path = f"real_data/datasets/{row['filename']}"
        if not os.path.exists(file_path):
            print(f"WARNING: Dataset file not found: {file_path}")
            continue
        
        # Check if dataset already exists
        existing = db.query(ScientificDataset).filter(
            ScientificDataset.title == row['title']
        ).first()
        
        if existing:
            print(f"Skipping duplicate dataset: {row['title']}")
            continue
        
        # Validate required fields
        if not row['title'] or not row['data_type']:
            print(f"ERROR: Missing required fields in dataset: {row['title']}")
            continue
        
        # Find expedition by code
        expedition = None
        if row['expedition_code_link']:
            expedition = db.query(Expedition).filter(
                Expedition.expedition_code == row['expedition_code_link']
            ).first()
        
        try:
            # Parse parameters
            params_list = [p.strip() for p in row['parameters_measured'].split(',')] if row['parameters_measured'] else []
            
            # Copy file to uploads directory
            upload_dir = f"uploads/datasets/{expedition.id if expedition else 'standalone'}"
            os.makedirs(upload_dir, exist_ok=True)
            
            unique_filename = f"{uuid.uuid4()}_{row['filename']}"
            dest_path = os.path.join(upload_dir, unique_filename)
            shutil.copy2(file_path, dest_path)
            
            dataset = ScientificDataset(
                expedition_id=expedition.id if expedition else None,
                title=row['title'],
                description=row['description'],
                data_type=DataType(row['data_type'].lower()),
                file_path=dest_path,
                file_format=FileFormat(row['file_format'].lower()),
                parameters_measured=params_list,
                collection_start_date=datetime.strptime(row['collection_start_date'], '%Y-%m-%d').date() if row['collection_start_date'] else None,
                collection_end_date=datetime.strptime(row['collection_end_date'], '%Y-%m-%d').date() if row['collection_end_date'] else None,
                spatial_coverage=row['spatial_coverage'],
                license_type=LicenseType(row['license_type'].lower())
            )
            db.add(dataset)
            db.commit()
            db.refresh(dataset)
            print(f"✓ Seeded dataset: {row['title']}")
            seeded_count += 1
        except Exception as e:
            db.rollback()
            print(f"ERROR seeding dataset: {e}")
    
    print(f"\nSeeded {seeded_count} datasets")

def seed_media(db):
    """Seed media items from real images"""
    print("\n" + "="*60)
    print("Seeding Media Items")
    print("="*60)
    
    # Check for media metadata file
    metadata_file = 'real_data/media_metadata.csv'
    if not os.path.exists(metadata_file):
        print(f"WARNING: {metadata_file} not found. Skipping media seeding.")
        print("Please create media_metadata.csv based on MEDIA_SOURCES.md")
        return
    
    try:
        rows = read_csv_safe(metadata_file, [
            'filename', 'title', 'description', 'media_type', 'capture_date',
            'location_description', 'latitude', 'longitude', 'photographer_credit',
            'source_url', 'license', 'expedition_code_link'
        ])
    except Exception as e:
        print(f"ERROR reading media metadata CSV: {e}")
        return
    
    seeded_count = 0
    for row in rows:
        # Check if media file exists
        file_path = f"real_data/media/photos/{row['filename']}"
        if not os.path.exists(file_path):
            print(f"WARNING: Media file not found: {file_path}")
            continue
        
        # Check if media already exists
        existing = db.query(MediaItem).filter(
            MediaItem.title == row['title']
        ).first()
        
        if existing:
            print(f"Skipping duplicate media: {row['title']}")
            continue
        
        # Validate required fields
        if not row['title'] or not row['media_type']:
            print(f"ERROR: Missing required fields in media: {row['title']}")
            continue
        
        # Find expedition by code
        expedition = None
        if row['expedition_code_link']:
            expedition = db.query(Expedition).filter(
                Expedition.expedition_code == row['expedition_code_link']
            ).first()
        
        try:
            # Copy file to uploads directory
            upload_dir = f"uploads/media/{expedition.id if expedition else 'standalone'}/photos"
            os.makedirs(upload_dir, exist_ok=True)
            
            unique_filename = f"{uuid.uuid4()}_{row['filename']}"
            dest_path = os.path.join(upload_dir, unique_filename)
            shutil.copy2(file_path, dest_path)
            
            # Generate thumbnail for photos
            thumbnail_path = None
            if row['media_type'].lower() == 'photo':
                try:
                    from PIL import Image
                    thumb_dir = os.path.join(upload_dir, "thumbnails")
                    os.makedirs(thumb_dir, exist_ok=True)
                    thumb_filename = f"thumb_{unique_filename}.jpg"
                    thumb_full_path = os.path.join(thumb_dir, thumb_filename)
                    
                    with Image.open(dest_path) as img:
                        width = 300
                        aspect_ratio = width / img.width
                        height = int(img.height * aspect_ratio)
                        img_resized = img.resize((width, height), Image.Resampling.LANCZOS)
                        img_resized.save(thumb_full_path, "JPEG", quality=85)
                    
                    thumbnail_path = thumb_full_path
                except Exception as e:
                    print(f"Warning: Failed to generate thumbnail: {e}")
            
            # Parse tags from description or create default
            tags = ["polar", "research"]  # Default tags
            
            media = MediaItem(
                expedition_id=expedition.id if expedition else None,
                title=row['title'],
                description=row['description'],
                media_type=MediaType(row['media_type'].lower()),
                file_path=dest_path,
                thumbnail_path=thumbnail_path,
                capture_date=datetime.strptime(row['capture_date'], '%Y-%m-%d').date() if row['capture_date'] else None,
                location_description=row['location_description'],
                latitude=float(row['latitude']) if row['latitude'] else None,
                longitude=float(row['longitude']) if row['longitude'] else None,
                photographer_credit=row['photographer_credit'],
                tags=tags
            )
            db.add(media)
            db.commit()
            db.refresh(media)
            print(f"✓ Seeded media: {row['title']}")
            seeded_count += 1
        except Exception as e:
            db.rollback()
            print(f"ERROR seeding media: {e}")
    
    print(f"\nSeeded {seeded_count} media items")

def seed_reports(db):
    """Seed expedition reports from PDF files"""
    print("\n" + "="*60)
    print("Seeding Expedition Reports")
    print("="*60)
    
    reports_dir = 'real_data/reports'
    if not os.path.exists(reports_dir):
        print(f"WARNING: {reports_dir} not found. Skipping report seeding.")
        print("Please create reports based on EXPEDITION_REPORTS_GUIDANCE.md")
        return
    
    pdf_files = [f for f in os.listdir(reports_dir) if f.endswith('.pdf')]
    
    if not pdf_files:
        print("No PDF files found in reports directory")
        return
    
    seeded_count = 0
    for pdf_file in pdf_files:
        # Parse expedition code from filename
        # Expected format: IAE-42_report_final.pdf
        parts = pdf_file.replace('.pdf', '').split('_')
        if len(parts) < 2:
            print(f"WARNING: Invalid filename format: {pdf_file}")
            continue
        
        expedition_code = parts[0]
        report_type = parts[2] if len(parts) > 2 else 'final'
        
        # Find expedition
        expedition = db.query(Expedition).filter(
            Expedition.expedition_code == expedition_code
        ).first()
        
        if not expedition:
            print(f"WARNING: Expedition not found for code: {expedition_code}")
            continue
        
        # Check if report already exists
        existing = db.query(ExpeditionReport).filter(
            ExpeditionReport.expedition_id == expedition.id,
            ExpeditionReport.report_type == report_type
        ).first()
        
        if existing:
            print(f"Skipping duplicate report for {expedition_code}")
            continue
        
        try:
            # Copy file to uploads directory
            upload_dir = f"uploads/reports/{expedition.id}"
            os.makedirs(upload_dir, exist_ok=True)
            
            unique_filename = f"{uuid.uuid4()}_{pdf_file}"
            dest_path = os.path.join(upload_dir, unique_filename)
            shutil.copy2(os.path.join(reports_dir, pdf_file), dest_path)
            
            # Extract text from PDF
            import pdfplumber
            extracted_text = ""
            page_count = 0
            try:
                with pdfplumber.open(dest_path) as pdf:
                    for page in pdf.pages:
                        page_text = page.extract_text()
                        if page_text:
                            extracted_text += page_text + "\n"
                    page_count = len(pdf.pages)
            except Exception as e:
                print(f"Warning: Failed to extract text from PDF: {e}")
            
            report = ExpeditionReport(
                expedition_id=expedition.id,
                title=f"{expedition.name} - {report_type.capitalize()} Report",
                file_path=dest_path,
                report_type=ReportType(report_type.lower()),
                submitted_by=1,  # Admin user
                submission_date=datetime.now().date(),
                extracted_text=extracted_text,
                page_count=page_count
            )
            db.add(report)
            db.commit()
            db.refresh(report)
            print(f"✓ Seeded report: {pdf_file}")
            seeded_count += 1
        except Exception as e:
            db.rollback()
            print(f"ERROR seeding report: {e}")
    
    print(f"\nSeeded {seeded_count} reports")

def seed_real_database():
    """Main function to seed real data"""
    print("="*60)
    print("NCPOR Portal - Real Data Seeding")
    print("="*60)
    
    # Initialize database
    init_db()
    db = SessionLocal()
    
    try:
        # Create data directories
        create_real_data_directories()
        
        # Seed users (if not exists)
        if db.query(User).count() == 0:
            print("\nSeeding default users...")
            admin = User(
                name="Admin User",
                email="admin@ncpor.gov.in",
                role=Role.admin,
                password_hash=simple_hash("admin123")
            )
            editor = User(
                name="Editor User",
                email="editor@ncpor.gov.in",
                role=Role.editor,
                password_hash=simple_hash("editor123")
            )
            viewer = User(
                name="Viewer User",
                email="viewer@ncpor.gov.in",
                role=Role.viewer,
                password_hash=simple_hash("viewer123")
            )
            db.add_all([admin, editor, viewer])
            db.commit()
            print("✓ Seeded default users")
        
        # Seed data in order
        seed_expeditions(db)
        seed_publications(db)
        seed_datasets(db)
        seed_media(db)
        seed_reports(db)
        
        print("\n" + "="*60)
        print("Real Data Seeding Complete!")
        print("="*60)
        print("\nLogin credentials:")
        print("Admin: admin@ncpor.gov.in / admin123")
        print("Editor: editor@ncpor.gov.in / editor123")
        print("Viewer: viewer@ncpor.gov.in / viewer123")
        
    except Exception as e:
        print(f"\nERROR during seeding: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_real_database()
