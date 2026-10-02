from app.database import SessionLocal, init_db
from app.models import (
    User, Expedition, ExpeditionReport, ScientificDataset, 
    Publication, MediaItem, InstitutionalActivity,
    Region, ExpeditionStatus, ReportType, DataType, FileFormat,
    MediaType, ActivityType, LicenseType, Role
)
import hashlib
from datetime import date, timedelta

def simple_hash(password: str) -> str:
    """Simple SHA256 hash for hackathon demo"""
    return hashlib.sha256(password.encode()).hexdigest()

def seed_database():
    init_db()
    db = SessionLocal()
    
    try:
        # Check if expeditions already exist
        if db.query(Expedition).count() > 0:
            print("Expeditions already seeded. Skipping.")
            return
        
        # Create users if missing
        admin = db.query(User).filter(User.email == "admin@ncpor.gov.in").first()
        if not admin:
            admin = User(
                name="Admin Administrator",
                email="admin@ncpor.gov.in",
                role=Role.admin,
                password_hash=simple_hash("admin123"),
                is_approved=True,
                institution="National Centre for Polar and Ocean Research",
                designation="Chief System Administrator",
                researcher_id="ADMIN-001"
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)
        
        # Create Antarctic Expedition
        antarctic_expedition = Expedition(
            name="42nd Indian Antarctic Expedition",
            expedition_code="IAE-42",
            region=Region.antarctic,
            start_date=date(2023, 11, 15),
            end_date=date(2024, 4, 15),
            vessel_or_base_name="MV Ivan Papanin",
            team_lead="Dr. Rajesh Kumar",
            team_size=45,
            summary="The 42nd Indian Antarctic Expedition focused on climate change studies in the Antarctic Peninsula region, with emphasis on ice shelf dynamics and ocean acidification monitoring.",
            status=ExpeditionStatus.completed
        )
        db.add(antarctic_expedition)
        db.commit()
        
        # Create Arctic Expedition
        arctic_expedition = Expedition(
            name="13th Indian Arctic Expedition",
            expedition_code="IAR-13",
            region=Region.arctic,
            start_date=date(2024, 7, 1),
            end_date=date(2024, 8, 30),
            vessel_or_base_name="Himadri Research Station",
            team_lead="Dr. Priya Sharma",
            team_size=12,
            summary="The 13th Indian Arctic Expedition conducted atmospheric studies and permafrost research in the Svalbard archipelago, building on long-term climate monitoring efforts.",
            status=ExpeditionStatus.completed
        )
        db.add(arctic_expedition)
        db.commit()
        
        print("Created 2 expeditions: Antarctic and Arctic")
        
        # Antarctic Expedition Content
        # Report
        antarctic_report = ExpeditionReport(
            expedition_id=antarctic_expedition.id,
            title="Ice Shelf Dynamics Assessment - Larsen C Region",
            file_path="uploads/reports/1/sample_report.pdf",
            report_type=ReportType.final,
            submitted_by=admin.id,
            submission_date=date(2024, 5, 1),
            extracted_text="Comprehensive analysis of ice shelf dynamics in the Larsen C region shows accelerated thinning rates of approximately 2 meters per year over the past decade. Ground-penetrating radar measurements indicate substantial basal melting. Satellite imagery analysis reveals increased calving events along the northern margin.",
            page_count=45
        )
        db.add(antarctic_report)
        
        # Dataset
        antarctic_dataset = ScientificDataset(
            expedition_id=antarctic_expedition.id,
            title="Southern Ocean Temperature and Salinity Profiles",
            description="CTD measurements collected during the 42nd IAE along the Antarctic Peninsula transect",
            data_type=DataType.oceanographic,
            file_path="uploads/datasets/1/ctd_data.csv",
            file_format=FileFormat.csv,
            parameters_measured=["temperature", "salinity", "depth", "dissolved_oxygen"],
            collection_start_date=date(2023, 11, 20),
            collection_end_date=date(2024, 3, 15),
            spatial_coverage="Antarctic Peninsula coastal waters, 60°S to 65°S, 55°W to 65°W",
            license_type=LicenseType.open
        )
        db.add(antarctic_dataset)
        
        # Publication
        antarctic_publication = Publication(
            expedition_id=antarctic_expedition.id,
            title="Rapid ice shelf thinning in the Antarctic Peninsula: implications for sea level rise",
            authors=["Kumar, R.", "Sharma, P.", "Patel, A."],
            abstract="This study presents comprehensive analysis of ice shelf dynamics in the Antarctic Peninsula region using satellite altimetry and ground-based radar measurements.",
            journal_or_venue="Journal of Glaciology",
            publication_date=date(2024, 6, 15),
            doi="10.3189/2024JoG123456",
            file_path="uploads/publications/1/ice_shelf_paper.pdf",
            citation_text="Kumar, R., Sharma, P., Patel, A. (2024). Rapid ice shelf thinning in the Antarctic Peninsula: implications for sea level rise. Journal of Glaciology. DOI: 10.3189/2024JoG123456",
            keywords=["ice shelf", "Antarctic Peninsula", "climate change", "sea level rise"]
        )
        db.add(antarctic_publication)
        
        # Media Items (3 items)
        antarctic_media_1 = MediaItem(
            expedition_id=antarctic_expedition.id,
            title="Penguin Colony at Biscoe Point",
            description="Gentoo penguin colony photographed during coastal survey",
            media_type=MediaType.photo,
            file_path="uploads/media/1/photo/penguins.jpg",
            thumbnail_path="uploads/media/1/photo/thumbnails/thumb_penguins.jpg",
            capture_date=date(2024, 1, 15),
            location_description="Biscoe Point, Anvers Island",
            latitude=-64.85,
            longitude=-63.75,
            photographer_credit="Dr. Rajesh Kumar",
            tags=["penguins", "wildlife", "Antarctica", "coastal survey"]
        )
        db.add(antarctic_media_1)
        
        antarctic_media_2 = MediaItem(
            expedition_id=antarctic_expedition.id,
            title="MV Ivan Papanin in Antarctic Waters",
            description="Research vessel navigating through sea ice",
            media_type=MediaType.photo,
            file_path="uploads/media/1/photo/vessel.jpg",
            thumbnail_path="uploads/media/1/photo/thumbnails/thumb_vessel.jpg",
            capture_date=date(2023, 12, 10),
            location_description="Southern Ocean, 62°S 58°W",
            photographer_credit="Dr. Priya Sharma",
            tags=["vessel", "sea ice", "logistics", "Antarctic waters"]
        )
        db.add(antarctic_media_2)
        
        antarctic_media_3 = MediaItem(
            expedition_id=antarctic_expedition.id,
            title="Ice Core Drilling Operations",
            description="Documentary video of ice core extraction process",
            media_type=MediaType.video,
            file_path="uploads/media/1/video/ice_core_drilling.mp4",
            capture_date=date(2024, 2, 5),
            location_description="Larsen C ice shelf camp",
            photographer_credit="NCPOR Media Team",
            tags=["ice core", "drilling", "fieldwork", "research methods"]
        )
        db.add(antarctic_media_3)
        
        # Activity
        antarctic_activity = InstitutionalActivity(
            title="Antarctic Climate Research Workshop",
            description="International workshop sharing findings from the 42nd IAE with partner institutions",
            activity_type=ActivityType.workshop,
            activity_date=date(2024, 5, 20),
            location="NCPOR Headquarters, Goa",
            participants_count=35,
            related_expedition_id=antarctic_expedition.id,
            related_content=[{"type": "report", "id": antarctic_report.id}]
        )
        db.add(antarctic_activity)
        
        db.commit()
        
        # Arctic Expedition Content
        # Report
        arctic_report = ExpeditionReport(
            expedition_id=arctic_expedition.id,
            title="Permafrost Thaw Monitoring - Svalbard 2024",
            file_path="uploads/reports/2/arctic_report.pdf",
            report_type=ReportType.final,
            submitted_by=admin.id,
            submission_date=date(2024, 9, 15),
            extracted_text="Permafrost monitoring in Ny-Ålesund shows increased active layer thickness of 15cm compared to 2023 measurements. Ground temperature sensors at 1m depth show 2.5°C warming trend over the past decade. Vegetation changes indicate earlier spring phenology.",
            page_count=32
        )
        db.add(arctic_report)
        
        # Dataset
        arctic_dataset = ScientificDataset(
            expedition_id=arctic_expedition.id,
            title="Arctic Atmospheric Aerosol Measurements",
            description="Continuous aerosol monitoring at Himadri station during summer 2024",
            data_type=DataType.atmospheric,
            file_path="uploads/datasets/2/aerosol_data.csv",
            file_format=FileFormat.csv,
            parameters_measured=["PM2.5", "PM10", "black_carbon", "sulfate"],
            collection_start_date=date(2024, 7, 1),
            collection_end_date=date(2024, 8, 30),
            spatial_coverage="Ny-Ålesund, Svalbard (78.9°N, 11.9°E)",
            license_type=LicenseType.open
        )
        db.add(arctic_dataset)
        
        # Publication
        arctic_publication = Publication(
            expedition_id=arctic_expedition.id,
            title="Accelerated permafrost degradation in the High Arctic: 2024 observations",
            authors=["Sharma, P.", "Singh, R.", "Gupta, M."],
            abstract="Long-term permafrost monitoring in Svalbard reveals accelerated degradation patterns with implications for global carbon cycle feedbacks.",
            journal_or_venue="Arctic, Antarctic, and Alpine Research",
            publication_date=date(2024, 10, 1),
            doi="10.1657/AAAR001234",
            citation_text="Sharma, P., Singh, R., Gupta, M. (2024). Accelerated permafrost degradation in the High Arctic: 2024 observations. Arctic, Antarctic, and Alpine Research. DOI: 10.1657/AAAR001234",
            keywords=["permafrost", "Arctic", "climate change", "carbon cycle"]
        )
        db.add(arctic_publication)
        
        # Media Items (3 items)
        arctic_media_1 = MediaItem(
            expedition_id=arctic_expedition.id,
            title="Himadri Research Station at Midnight",
            description="Research station during Arctic summer midnight sun",
            media_type=MediaType.photo,
            file_path="uploads/media/2/photo/himadri.jpg",
            thumbnail_path="uploads/media/2/photo/thumbnails/thumb_himadri.jpg",
            capture_date=date(2024, 7, 15),
            location_description="Ny-Ålesund, Svalbard",
            latitude=78.92,
            longitude=11.93,
            photographer_credit="Dr. Priya Sharma",
            tags=["research station", "midnight sun", "Arctic", "infrastructure"]
        )
        db.add(arctic_media_1)
        
        arctic_media_2 = MediaItem(
            expedition_id=arctic_expedition.id,
            title="Glacier Front Retreat Monitoring",
            description="Aerial photography of glacier front position",
            media_type=MediaType.photo,
            file_path="uploads/media/2/photo/glacier.jpg",
            thumbnail_path="uploads/media/2/photo/thumbnails/thumb_glacier.jpg",
            capture_date=date(2024, 7, 25),
            location_description="Kongsfjorden, Svalbard",
            latitude=79.0,
            longitude=12.5,
            photographer_credit="Dr. Rajesh Kumar",
            tags=["glacier", "retreat", "aerial survey", "climate monitoring"]
        )
        db.add(arctic_media_2)
        
        arctic_media_3 = MediaItem(
            expedition_id=arctic_expedition.id,
            title="Atmospheric Sampling Equipment Setup",
            description="Time-lapse video of aerosol monitoring station installation",
            media_type=MediaType.video,
            file_path="uploads/media/2/video/sampling_setup.mp4",
            capture_date=date(2024, 7, 5),
            location_description="Himadri Station grounds",
            photographer_credit="NCPOR Media Team",
            tags=["aerosol", "monitoring", "equipment", "field methods"]
        )
        db.add(arctic_media_3)
        
        # Activity
        arctic_activity = InstitutionalActivity(
            title="Arctic Research Outreach Program",
            description="School outreach program sharing Arctic research with local students",
            activity_type=ActivityType.school_program,
            activity_date=date(2024, 9, 10),
            location="Kendriya Vidyalaya, Goa",
            participants_count=120,
            related_expedition_id=arctic_expedition.id,
            related_content=[{"type": "media", "id": arctic_media_1.id}]
        )
        db.add(arctic_activity)
        
        db.commit()
        
        print("Created sample content for both expeditions:")
        print("- 2 expedition reports")
        print("- 2 scientific datasets")
        print("- 2 publications")
        print("- 6 media items (3 per expedition)")
        print("- 2 institutional activities")
        
        print("\nSeed data successfully added!")
        print("\nLogin credentials:")
        print("Admin: admin@ncpor.gov.in / admin123")
        print("Editor: editor@ncpor.gov.in / editor123")
        print("Viewer: viewer@ncpor.gov.in / viewer123")
        
    except Exception as e:
        print(f"Error seeding database: {str(e)}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
