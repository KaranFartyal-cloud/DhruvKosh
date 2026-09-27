from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db
from app.models import Expedition as DBExpedition, ExpeditionStatus, Region
from app.models import ExpeditionReport, ScientificDataset, Publication, MediaItem
from app.schemas import ExpeditionCreate, Expedition as SchemaExpedition, ExpeditionFull
import os

router = APIRouter()

@router.post("", response_model=SchemaExpedition)
def create_expedition(expedition: ExpeditionCreate, db: Session = Depends(get_db)):
    existing = db.query(DBExpedition).filter(DBExpedition.expedition_code == expedition.expedition_code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Expedition code already exists")
    
    db_expedition = DBExpedition(**expedition.model_dump())
    db.add(db_expedition)
    db.commit()
    db.refresh(db_expedition)
    return db_expedition

@router.get("", response_model=dict)
def get_expeditions(
    region: Optional[Region] = None,
    status: Optional[ExpeditionStatus] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    query = db.query(DBExpedition)
    
    if region:
        query = query.filter(DBExpedition.region == region)
    if status:
        query = query.filter(DBExpedition.status == status)
    if search:
        query = query.filter(
            (DBExpedition.name.ilike(f"%{search}%")) |
            (DBExpedition.expedition_code.ilike(f"%{search}%"))
        )
    
    total_count = query.count()
    items = query.order_by(DBExpedition.start_date.desc()).offset((page - 1) * page_size).limit(page_size).all()
    
    # Serialize the list of SQLAlchemy objects to dicts
    serialized_items = [SchemaExpedition.model_validate(item).model_dump(mode='json') for item in items]
    
    return {
        "items": serialized_items,
        "total_count": total_count,
        "page": page,
        "page_size": page_size
    }

@router.get("/integrity-check")
def data_integrity_check(db: Session = Depends(get_db)):
    broken_references = []
    
    for model in [ExpeditionReport, ScientificDataset, Publication, MediaItem]:
        items = db.query(model).filter(model.file_path.isnot(None)).all()
        for item in items:
            if not os.path.exists(item.file_path):
                broken_references.append({
                    "type": model.__name__,
                    "id": item.id,
                    "file_path": item.file_path
                })
    
    return {
        "status": "healthy" if not broken_references else "issues_found",
        "broken_references": broken_references
    }

@router.get("/{expedition_id}", response_model=SchemaExpedition)
def get_expedition(expedition_id: int, db: Session = Depends(get_db)):
    expedition = db.query(DBExpedition).filter(DBExpedition.id == expedition_id).first()
    if not expedition:
        raise HTTPException(status_code=404, detail="Expedition not found")
    return expedition

@router.get("/{expedition_id}/full", response_model=ExpeditionFull)
def get_expedition_full(expedition_id: int, db: Session = Depends(get_db)):
    expedition = db.query(DBExpedition).filter(DBExpedition.id == expedition_id).first()
    if not expedition:
        raise HTTPException(status_code=404, detail="Expedition not found")
        
    result = ExpeditionFull.model_validate(expedition)
    if result.reports is None: result.reports = []
    if result.datasets is None: result.datasets = []
    if result.publications is None: result.publications = []
    if result.media_items is None: result.media_items = []
    if result.activities is None: result.activities = []
    
    return result
