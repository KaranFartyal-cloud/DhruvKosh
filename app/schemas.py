from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date
from enum import Enum

# Enums matching the models
class Region(str, Enum):
    antarctic = "antarctic"
    arctic = "arctic"
    himalaya = "himalaya"
    southern_ocean = "southern_ocean"

class ExpeditionStatus(str, Enum):
    planned = "planned"
    ongoing = "ongoing"
    completed = "completed"

class ReportType(str, Enum):
    preliminary = "preliminary"
    final = "final"
    cruise_report = "cruise_report"
    technical = "technical"

class DataType(str, Enum):
    oceanographic = "oceanographic"
    glaciological = "glaciological"
    atmospheric = "atmospheric"
    biological = "biological"
    geospatial = "geospatial"

class FileFormat(str, Enum):
    csv = "csv"
    netcdf = "netcdf"
    shapefile = "shapefile"
    excel = "excel"
    other = "other"

class LicenseType(str, Enum):
    open = "open"
    restricted = "restricted"
    embargo = "embargo"

class MediaType(str, Enum):
    photo = "photo"
    video = "video"

class ActivityType(str, Enum):
    workshop = "workshop"
    conference = "conference"
    expedition_launch = "expedition_launch"
    outreach_event = "outreach_event"
    school_program = "school_program"
    press_release = "press_release"
    award = "award"

class ContentCategory(str, Enum):
    social_post = "social_post"
    website_article = "website_article"
    educational_explainer = "educational_explainer"

class Platform(str, Enum):
    twitter = "twitter"
    instagram = "instagram"
    linkedin = "linkedin"
    website = "website"

class GeneratedStatus(str, Enum):
    draft = "draft"
    approved = "approved"
    published = "published"

class Role(str, Enum):
    admin = "admin"
    editor = "editor"
    viewer = "viewer"
    public = "public"

# Preview schema (define before it's used)
class DatasetPreview(BaseModel):
    columns: List[str]
    rows: List[List[str]]
    total_rows: int

# User Schemas
class UserBase(BaseModel):
    name: str
    email: str
    role: Role

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    
    class Config:
        from_attributes = True

# Expedition Schemas
class ExpeditionBase(BaseModel):
    name: str
    expedition_code: str
    region: Region
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    vessel_or_base_name: Optional[str] = None
    team_lead: Optional[str] = None
    team_size: Optional[int] = None
    summary: Optional[str] = None
    status: ExpeditionStatus = ExpeditionStatus.planned

class ExpeditionCreate(ExpeditionBase):
    pass

class ExpeditionUpdate(BaseModel):
    name: Optional[str] = None
    expedition_code: Optional[str] = None
    region: Optional[Region] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    vessel_or_base_name: Optional[str] = None
    team_lead: Optional[str] = None
    team_size: Optional[int] = None
    summary: Optional[str] = None
    status: Optional[ExpeditionStatus] = None

class Expedition(ExpeditionBase):
    id: int
    
    class Config:
        from_attributes = True

class ExpeditionFull(Expedition):
    reports: List["ExpeditionReportResponse"] = []
    datasets: List["ScientificDatasetResponse"] = []
    publications: List["PublicationResponse"] = []
    media_items: List["MediaItemResponse"] = []
    activities: List["InstitutionalActivityResponse"] = []

# Expedition Report Schemas
class ExpeditionReportBase(BaseModel):
    title: str
    report_type: ReportType
    submission_date: Optional[date] = None

class ExpeditionReportCreate(ExpeditionReportBase):
    pass

class ExpeditionReportUpdate(BaseModel):
    title: Optional[str] = None
    report_type: Optional[ReportType] = None
    submission_date: Optional[date] = None

class ExpeditionReportResponse(ExpeditionReportBase):
    id: int
    expedition_id: int
    file_path: str
    submitted_by: Optional[int] = None
    extracted_text: Optional[str] = None
    page_count: Optional[int] = None
    
    class Config:
        from_attributes = True

# Scientific Dataset Schemas
class ScientificDatasetBase(BaseModel):
    title: str
    description: Optional[str] = None
    data_type: DataType
    file_format: FileFormat
    parameters_measured: Optional[List[str]] = None
    collection_start_date: Optional[date] = None
    collection_end_date: Optional[date] = None
    spatial_coverage: Optional[str] = None
    license_type: LicenseType = LicenseType.open

class ScientificDatasetCreate(ScientificDatasetBase):
    pass

class ScientificDatasetUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    data_type: Optional[DataType] = None
    file_format: Optional[FileFormat] = None
    parameters_measured: Optional[List[str]] = None
    collection_start_date: Optional[date] = None
    collection_end_date: Optional[date] = None
    spatial_coverage: Optional[str] = None
    license_type: Optional[LicenseType] = None

class ScientificDatasetResponse(ScientificDatasetBase):
    id: int
    expedition_id: Optional[int] = None
    file_path: str
    preview: Optional[DatasetPreview] = None
    
    class Config:
        from_attributes = True

# Publication Schemas
class PublicationBase(BaseModel):
    title: str
    authors: Optional[List[str]] = None
    abstract: Optional[str] = None
    journal_or_venue: Optional[str] = None
    publication_date: Optional[date] = None
    doi: Optional[str] = None
    keywords: Optional[List[str]] = None

class PublicationCreate(PublicationBase):
    pass

class PublicationUpdate(BaseModel):
    title: Optional[str] = None
    authors: Optional[List[str]] = None
    abstract: Optional[str] = None
    journal_or_venue: Optional[str] = None
    publication_date: Optional[date] = None
    doi: Optional[str] = None
    keywords: Optional[List[str]] = None

class PublicationResponse(PublicationBase):
    id: int
    expedition_id: Optional[int] = None
    file_path: Optional[str] = None
    citation_text: Optional[str] = None
    
    class Config:
        from_attributes = True

# Media Item Schemas
class MediaItemBase(BaseModel):
    title: str
    description: Optional[str] = None
    media_type: MediaType
    capture_date: Optional[date] = None
    location_description: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    photographer_credit: Optional[str] = None
    tags: Optional[List[str]] = None

class MediaItemCreate(MediaItemBase):
    pass

class MediaItemUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    media_type: Optional[MediaType] = None
    capture_date: Optional[date] = None
    location_description: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    photographer_credit: Optional[str] = None
    tags: Optional[List[str]] = None

class MediaItemResponse(MediaItemBase):
    id: int
    expedition_id: Optional[int] = None
    file_path: str
    thumbnail_path: Optional[str] = None
    
    class Config:
        from_attributes = True

# Institutional Activity Schemas
class InstitutionalActivityBase(BaseModel):
    title: str
    description: Optional[str] = None
    activity_type: ActivityType
    activity_date: Optional[date] = None
    location: Optional[str] = None
    participants_count: Optional[int] = None
    related_expedition_id: Optional[int] = None
    related_content: Optional[List[dict]] = None

class InstitutionalActivityCreate(InstitutionalActivityBase):
    pass

class InstitutionalActivityUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    activity_type: Optional[ActivityType] = None
    activity_date: Optional[date] = None
    location: Optional[str] = None
    participants_count: Optional[int] = None
    related_expedition_id: Optional[int] = None
    related_content: Optional[List[dict]] = None

class InstitutionalActivityResponse(InstitutionalActivityBase):
    id: int
    
    class Config:
        from_attributes = True

# Generated Content Schemas
class GeneratedContentBase(BaseModel):
    source_type: str
    source_id: Optional[int] = None
    content_category: ContentCategory
    platform: Optional[Platform] = None
    generated_text: str
    generated_title: Optional[str] = None
    status: GeneratedStatus = GeneratedStatus.draft

class GeneratedContentCreate(GeneratedContentBase):
    expedition_id: Optional[int] = None

class GeneratedContentUpdate(BaseModel):
    generated_text: Optional[str] = None
    generated_title: Optional[str] = None
    status: Optional[GeneratedStatus] = None

class GeneratedContentResponse(GeneratedContentBase):
    id: int
    expedition_id: Optional[int] = None
    created_at: datetime
    published_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# Quiz Schema (for educational content)
class QuizQuestion(BaseModel):
    question: str
    options: List[str]
    correct_index: int
    explanation: str

class EducationalContent(BaseModel):
    title: str
    explainer_text: str
    glossary: List[dict]
    fun_fact: str
    quiz: List[QuizQuestion]

class WebsiteArticle(BaseModel):
    headline: str
    subheading: str
    body: str
    suggested_tags: List[str]

class SocialPost(BaseModel):
    platform: Platform
    text: str

class AllGeneratedContent(BaseModel):
    social_posts: dict  # {platform: text}
    website_article: WebsiteArticle
    educational_explainer: EducationalContent
    quiz: List[QuizQuestion]

# Auth Schemas
class LoginRequest(BaseModel):
    email: str
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: User

class RegisterRequest(UserCreate):
    pass

# Update forward references
ExpeditionFull.model_rebuild()
