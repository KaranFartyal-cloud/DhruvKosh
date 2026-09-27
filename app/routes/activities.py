from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import InstitutionalActivity
from app.schemas import InstitutionalActivityCreate, InstitutionalActivityResponse

router = APIRouter()

@router.post("", response_model=InstitutionalActivityResponse)
def create_activity(activity: InstitutionalActivityCreate, db: Session = Depends(get_db)):
    db_activity = InstitutionalActivity(**activity.model_dump())
    db.add(db_activity)
    db.commit()
    db.refresh(db_activity)
    return db_activity

@router.get("", response_model=list[InstitutionalActivityResponse])
def get_activities(db: Session = Depends(get_db)):
    return db.query(InstitutionalActivity).order_by(InstitutionalActivity.activity_date.desc()).all()

@router.get("/{activity_id}", response_model=InstitutionalActivityResponse)
def get_activity(activity_id: int, db: Session = Depends(get_db)):
    activity = db.query(InstitutionalActivity).filter(InstitutionalActivity.id == activity_id).first()
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    return activity
