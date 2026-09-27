from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum, Date, Float, JSON, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

Base = declarative_base()

# Enums
class Region(str, enum.Enum):
    antarctic = "antarctic"
    arctic = "arctic"
    himalaya = "himalaya"
    southern_ocean = "southern_ocean"

class ExpeditionStatus(str, enum.Enum):
    planned = "planned"
    ongoing = "ongoing"
    completed = "completed"

class ReportType(str, enum.Enum):
    preliminary = "preliminary"
    final = "final"
    cruise_report = "cruise_report"
    technical = "technical"

class DataType(str, enum.Enum):
    oceanographic = "oceanographic"
    glaciological = "glaciological"
    atmospheric = "atmospheric"
    biological = "biological"
    geospatial = "geospatial"

class FileFormat(str, enum.Enum):
    csv = "csv"
    netcdf = "netcdf"
    shapefile = "shapefile"
    excel = "excel"
    other = "other"

class LicenseType(str, enum.Enum):
    open = "open"
    restricted = "restricted"
    embargo = "embargo"

class MediaType(str, enum.Enum):
    photo = "photo"
    video = "video"

class ActivityType(str, enum.Enum):
    workshop = "workshop"
    conference = "conference"
    expedition_launch = "expedition_launch"
    outreach_event = "outreach_event"
    school_program = "school_program"
    press_release = "press_release"
    award = "award"

class ContentCategory(str, enum.Enum):
    social_post = "social_post"
    website_article = "website_article"
    educational_explainer = "educational_explainer"

class Platform(str, enum.Enum):
    twitter = "twitter"
    instagram = "instagram"
    linkedin = "linkedin"
    website = "website"

class GeneratedStatus(str, enum.Enum):
    draft = "draft"
    approved = "approved"
    published = "published"

class Role(str, enum.Enum):
    admin = "admin"
    editor = "editor"
    viewer = "viewer"
    public = "public"

# Models
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    role = Column(Enum(Role), nullable=False, default=Role.viewer)
    password_hash = Column(String, nullable=False)

class Expedition(Base):
    __tablename__ = "expeditions"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    expedition_code = Column(String, nullable=False, unique=True, index=True)
    region = Column(Enum(Region), nullable=False)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    vessel_or_base_name = Column(String, nullable=True)
    team_lead = Column(String, nullable=True)
    team_size = Column(Integer, nullable=True)
    summary = Column(Text, nullable=True)
    status = Column(Enum(ExpeditionStatus), default=ExpeditionStatus.planned)
    
    # Relationships
    reports = relationship("ExpeditionReport", back_populates="expedition", cascade="all, delete-orphan")
    datasets = relationship("ScientificDataset", back_populates="expedition", cascade="all, delete-orphan")
    publications = relationship("Publication", back_populates="expedition", cascade="all, delete-orphan")
    media_items = relationship("MediaItem", back_populates="expedition", cascade="all, delete-orphan")
    activities = relationship("InstitutionalActivity", back_populates="expedition", cascade="all, delete-orphan")
    generated_content = relationship("GeneratedContent", back_populates="expedition", cascade="all, delete-orphan")

class ExpeditionReport(Base):
    __tablename__ = "expedition_reports"
    
    id = Column(Integer, primary_key=True, index=True)
    expedition_id = Column(Integer, ForeignKey("expeditions.id"), nullable=False)
    title = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    report_type = Column(Enum(ReportType), nullable=False)
    submitted_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    submission_date = Column(Date, nullable=True)
    extracted_text = Column(Text, nullable=True)
    page_count = Column(Integer, nullable=True)
    
    # Relationships
    expedition = relationship("Expedition", back_populates="reports")
    submitter = relationship("User")

class ScientificDataset(Base):
    __tablename__ = "scientific_datasets"
    
    id = Column(Integer, primary_key=True, index=True)
    expedition_id = Column(Integer, ForeignKey("expeditions.id"), nullable=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    data_type = Column(Enum(DataType), nullable=False)
    file_path = Column(String, nullable=False)
    file_format = Column(Enum(FileFormat), nullable=False)
    parameters_measured = Column(JSON, nullable=True)
    collection_start_date = Column(Date, nullable=True)
    collection_end_date = Column(Date, nullable=True)
    spatial_coverage = Column(Text, nullable=True)
    license_type = Column(Enum(LicenseType), default=LicenseType.open)
    
    # Relationships
    expedition = relationship("Expedition", back_populates="datasets")

class Publication(Base):
    __tablename__ = "publications"
    
    id = Column(Integer, primary_key=True, index=True)
    expedition_id = Column(Integer, ForeignKey("expeditions.id"), nullable=True)
    title = Column(String, nullable=False)
    authors = Column(JSON, nullable=True)
    abstract = Column(Text, nullable=True)
    journal_or_venue = Column(String, nullable=True)
    publication_date = Column(Date, nullable=True)
    doi = Column(String, nullable=True)
    file_path = Column(String, nullable=True)
    citation_text = Column(Text, nullable=True)
    keywords = Column(JSON, nullable=True)
    
    # Relationships
    expedition = relationship("Expedition", back_populates="publications")

class MediaItem(Base):
    __tablename__ = "media_items"
    
    id = Column(Integer, primary_key=True, index=True)
    expedition_id = Column(Integer, ForeignKey("expeditions.id"), nullable=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    media_type = Column(Enum(MediaType), nullable=False)
    file_path = Column(String, nullable=False)
    thumbnail_path = Column(String, nullable=True)
    capture_date = Column(Date, nullable=True)
    location_description = Column(Text, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    photographer_credit = Column(String, nullable=True)
    tags = Column(JSON, nullable=True)
    
    # Relationships
    expedition = relationship("Expedition", back_populates="media_items")

class InstitutionalActivity(Base):
    __tablename__ = "institutional_activities"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    activity_type = Column(Enum(ActivityType), nullable=False)
    activity_date = Column(Date, nullable=True)
    location = Column(String, nullable=True)
    participants_count = Column(Integer, nullable=True)
    related_expedition_id = Column(Integer, ForeignKey("expeditions.id"), nullable=True)
    related_content = Column(JSON, nullable=True)
    
    # Relationships
    expedition = relationship("Expedition", back_populates="activities")

class GeneratedContent(Base):
    __tablename__ = "generated_content"
    
    id = Column(Integer, primary_key=True, index=True)
    expedition_id = Column(Integer, ForeignKey("expeditions.id"), nullable=True)
    source_type = Column(String, nullable=False)  # expedition_report, dataset, publication, media_item, activity
    source_id = Column(Integer, nullable=True)
    content_category = Column(Enum(ContentCategory), nullable=False)
    platform = Column(Enum(Platform), nullable=True)
    generated_text = Column(Text, nullable=False)
    generated_title = Column(String, nullable=True)
    status = Column(Enum(GeneratedStatus), default=GeneratedStatus.draft)
    created_at = Column(DateTime, default=datetime.utcnow)
    published_at = Column(DateTime, nullable=True)
    
    # Relationships
    expedition = relationship("Expedition", back_populates="generated_content")
