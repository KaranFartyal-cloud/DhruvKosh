from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import os

from app.database import get_db
from app.models import PublishLog, PublishLogStatus
from app.schemas import PublishLogResponse
from app.services.publishers.registry import get_available_platforms
from app.services.publish_service import publish_content, cancel_scheduled_publish
import httpx
from fastapi.responses import RedirectResponse
import json

router = APIRouter()

class PublishRequest(BaseModel):
    platforms: List[str]
    media_id: Optional[int] = None
    scheduled_at: Optional[datetime] = None

# ── Static routes FIRST (before any dynamic /{id} routes) ────────────────────
# IMPORTANT: FastAPI matches routes top-to-bottom. If /{id} comes first,
# then GET /log will try to cast "log" to int → 422 Unprocessable Entity.

@router.get("/platforms")
def get_platforms():
    return {
        "configured_platforms": get_available_platforms(),
        "publish_mode": os.getenv("PUBLISH_MODE", "dry_run")
    }

@router.get("/log")
def get_publish_log(
    platform: Optional[str] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    query = db.query(PublishLog)
    if platform:
        query = query.filter(PublishLog.platform == platform)
    if status:
        try:
            status_enum = PublishLogStatus(status)
            query = query.filter(PublishLog.status == status_enum)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid status value: {status}")
            
    total = query.count()
    logs = query.order_by(PublishLog.created_at.desc()).offset(skip).limit(limit).all()
    
    items = []
    for log in logs:
        log_dict = {
            "id": log.id,
            "generated_content_id": log.generated_content_id,
            "platform": log.platform,
            "status": log.status,
            "external_post_id": log.external_post_id,
            "external_url": log.external_url,
            "error_message": log.error_message,
            "scheduled_at": log.scheduled_at,
            "created_at": log.created_at,
            "text_preview": log.generated_content.generated_text[:140] + "..." if log.generated_content and log.generated_content.generated_text else ""
        }
        items.append(log_dict)
        
    return {
        "total": total,
        "items": items
    }

@router.delete("/schedule/{log_id}")
def cancel_publish(log_id: int, db: Session = Depends(get_db)):
    log = cancel_scheduled_publish(db, log_id)
    return {"message": "Scheduled publish cancelled", "status": log.status}

# ── Dynamic routes AFTER static routes ───────────────────────────────────────

@router.get("/{generated_content_id}/status", response_model=List[PublishLogResponse])
def get_publish_status(generated_content_id: int, db: Session = Depends(get_db)):
    logs = db.query(PublishLog).filter(
        PublishLog.generated_content_id == generated_content_id
    ).order_by(PublishLog.created_at.desc()).all()
    return logs

@router.post("/{generated_content_id}")
async def create_publish(
    generated_content_id: int, 
    request: PublishRequest, 
    db: Session = Depends(get_db)
):
    try:
        logs = await publish_content(
            db=db,
            generated_content_id=generated_content_id,
            platforms=request.platforms,
            media_id=request.media_id,
            scheduled_at=request.scheduled_at
        )
        return {"logs": [{"id": log.id, "platform": log.platform, "status": log.status} for log in logs]}
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/linkedin/login")
def linkedin_login():
    client_id = os.getenv("LINKEDIN_CLIENT_ID")
    if not client_id:
        raise HTTPException(status_code=500, detail="Missing LINKEDIN_CLIENT_ID in .env")
        
    # We must construct a properly URL-encoded scope and redirect URI
    redirect_uri = "http://localhost:8000/api/publish/linkedin/callback"
    url = f"https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id={client_id}&redirect_uri={redirect_uri}&scope=openid%20profile%20w_member_social%20email"
    return RedirectResponse(url)

@router.get("/linkedin/callback")
async def linkedin_callback(code: str):
    client_id = os.getenv("LINKEDIN_CLIENT_ID")
    client_secret = os.getenv("LINKEDIN_CLIENT_SECRET")
    redirect_uri = "http://localhost:8000/api/publish/linkedin/callback"
    
    if not client_id or not client_secret:
        raise HTTPException(status_code=500, detail="Missing LinkedIn Client ID or Secret")
        
    async with httpx.AsyncClient() as client:
        # Exchange code for access token
        data = {
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": redirect_uri,
            "client_id": client_id,
            "client_secret": client_secret
        }
        res = await client.post("https://www.linkedin.com/oauth/v2/accessToken", data=data)
        token_data = res.json()
        access_token = token_data.get("access_token")
        
        if not access_token:
            return {"error": "Failed to get access token", "details": token_data}
            
        # Get user urn using userinfo endpoint (OpenID Connect)
        user_res = await client.get(
            "https://api.linkedin.com/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        user_data = user_res.json()
        author_urn = f"urn:li:person:{user_data.get('sub')}"
        
        return {
            "message": "LinkedIn connected successfully! Copy these values to your .env file and restart the server:",
            "LINKEDIN_ACCESS_TOKEN": access_token,
            "LINKEDIN_AUTHOR_URN": author_urn,
            "note": "After updating .env, LinkedIn will be enabled in the publishing dashboard."
        }
