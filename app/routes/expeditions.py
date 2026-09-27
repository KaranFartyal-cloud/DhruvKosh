from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db
from app.models import Expedition, ExpeditionStatus, Region
from app.schemas import ExpeditionCreate, Expedition, ExpeditionFull

router = APIRouter()

@router.post("", response_model=Expedition)
def create_expedition(expedition: ExpeditionCreate, db: Session = Depends(get_db)):
    # Check if expedition_code is unique
    existing = db.query(Expedition).filter(Expedition.expedition_code == expedition.expedition_code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Expedition code already exists")
    
    db_expedition = Expedition(**expedition.model_dump())
    db.add(db_expedition)
    db.commit()
    db.refresh(db_expedition)
    return db_expedition

@router.get("", response_model=list[Expedition])
def get_expeditions(
    region: Optional[Region] = None,
    status: Optional[ExpeditionStatus] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Expedition)
    
    if region:
        query = query.filter(Expedition.region == region)
    if status:
        query = query.filter(Expedition.status == status)
    if search:
        query = query.filter(
            (Expedition.name.ilike(f"%{search}%")) |
            (Expedition.expedition_code.ilike(f"%{search}%"))
        )
    
    return query.order_by(Expedition.start_date.desc()).all()

@router.get("/{expedition_id}", response_model=Expedition)
def get_expedition(expedition_id: int, db: Session = Depends(get_db)):
    expedition = db.query(Expedition).filter(Expedition.id == expedition_id).first()
    if not expedition:
        raise HTTPException(status_code=404, detail="Expedition not found")
    return expedition

@router.get("/{expedition_id}/full", response_model=ExpeditionFull)
def get_expedition_full(expedition_id: int, db: Session = Depends(get_db)):
    expedition = db.query(Expedition).filter(Expedition.id == expedition_id).first()
    if not expedition:
        raise HTTPException(status_code=404, detail="Expedition not found")
    return expedition
