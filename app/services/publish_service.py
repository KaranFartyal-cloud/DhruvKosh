import os
import asyncio
from datetime import datetime
import logging
from typing import List, Optional
from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import GeneratedContent, GeneratedStatus, PublishLog, PublishLogStatus, MediaItem
from app.services.publishers.registry import get_publisher

logger = logging.getLogger(__name__)

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.jobstores.memory import MemoryJobStore

scheduler = AsyncIOScheduler(jobstores={'default': MemoryJobStore()})

def start_scheduler():
    if not scheduler.running:
        scheduler.start()
        # Reload scheduled jobs from DB
        db = SessionLocal()
        try:
            pending_logs = db.query(PublishLog).filter(PublishLog.status == PublishLogStatus.scheduled).all()
            for log in pending_logs:
                if log.scheduled_at:
                    if log.scheduled_at > datetime.utcnow():
                        scheduler.add_job(
                            _execute_publish_job,
                            'date',
                            run_date=log.scheduled_at,
                            args=[log.id],
                            id=f"publish_log_{log.id}",
                            replace_existing=True
                        )
                    else:
                        # Missed it, publish now
                        asyncio.create_task(_execute_publish_job(log.id))
        except Exception as e:
            logger.error(f"Error starting scheduler: {e}")
        finally:
            db.close()

async def _publish_to_platform(db: Session, log: PublishLog, text: str, image_path: Optional[str], platform: str):
    publisher = get_publisher(platform)
    
    result = None
    for attempt in range(2):
        result = await publisher.publish(text, image_path)
        
        if result.success:
            break
            
        is_transient = True
        err = result.error.lower() if result.error else ""
        if any(term in err for term in ["400", "401", "403", "404", "409", "422", "unauthorized", "forbidden", "payment required", "credentials not configured"]):
            is_transient = False
            
        if not is_transient or attempt == 1:
            break
            
        logger.warning(f"Transient error publishing to {platform}, retrying in 2 seconds...")
        await asyncio.sleep(2)
        
    if result.success:
        log.status = PublishLogStatus.success if os.getenv("PUBLISH_MODE") != "dry_run" else PublishLogStatus.dry_run
        log.external_post_id = result.external_id
        log.external_url = result.url
        log.published_at = datetime.utcnow()
    else:
        log.status = PublishLogStatus.failed
        log.error_message = result.error
        
    db.commit()

async def _execute_publish_job(log_id: int):
    db = SessionLocal()
    try:
        log = db.query(PublishLog).filter(PublishLog.id == log_id).first()
        if not log or log.status not in [PublishLogStatus.pending, PublishLogStatus.scheduled]:
            return
            
        content = log.generated_content
        if content.status not in [GeneratedStatus.approved, GeneratedStatus.published]:
            log.status = PublishLogStatus.failed
            log.error_message = "Content is no longer approved/published"
            db.commit()
            return
            
        image_path = None
        if log.media_id:
            media = db.query(MediaItem).filter(MediaItem.id == log.media_id).first()
            if media and os.path.exists(media.file_path):
                image_path = media.file_path
            else:
                logger.warning(f"Media file missing for ID {log.media_id}, publishing text-only.")
        elif content.suggested_media_id:
            media = db.query(MediaItem).filter(MediaItem.id == content.suggested_media_id).first()
            if media and os.path.exists(media.file_path):
                image_path = media.file_path
            else:
                logger.warning(f"Suggested media file missing for ID {content.suggested_media_id}, publishing text-only.")
                
        await _publish_to_platform(db, log, content.generated_text, image_path, log.platform)
        
        # Update content publish_status if any succeeded
        success_logs = db.query(PublishLog).filter(
            PublishLog.generated_content_id == content.id,
            PublishLog.status == PublishLogStatus.success
        ).count()
        
        if success_logs > 0:
            content.publish_status = "published"
            db.commit()
            
    finally:
        db.close()

async def publish_content(
    db: Session, 
    generated_content_id: int, 
    platforms: List[str], 
    media_id: Optional[int] = None, 
    scheduled_at: Optional[datetime] = None
):
    content = db.query(GeneratedContent).filter(GeneratedContent.id == generated_content_id).first()
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")
        
    if content.status not in [GeneratedStatus.approved, GeneratedStatus.published]:
        raise HTTPException(status_code=400, detail="Only approved or published content can be published")
        
    logs = []
    
    for platform in platforms:
        # Check idempotency
        existing_success = db.query(PublishLog).filter(
            PublishLog.generated_content_id == generated_content_id,
            PublishLog.platform == platform,
            PublishLog.status.in_([PublishLogStatus.success, PublishLogStatus.dry_run])
        ).first()
        
        if existing_success:
            raise HTTPException(status_code=409, detail=f"Content already published successfully to {platform}")
            
        log = PublishLog(
            generated_content_id=generated_content_id,
            platform=platform,
            status=PublishLogStatus.scheduled if scheduled_at else PublishLogStatus.pending,
            media_id=media_id,
            scheduled_at=scheduled_at
        )
        db.add(log)
        logs.append(log)
        
    db.commit()
    for log in logs:
        db.refresh(log)
        
    if scheduled_at:
        for log in logs:
            scheduler.add_job(
                _execute_publish_job,
                'date',
                run_date=scheduled_at,
                args=[log.id],
                id=f"publish_log_{log.id}"
            )
    else:
        # Publish immediately
        tasks = [_execute_publish_job(log.id) for log in logs]
        await asyncio.gather(*tasks, return_exceptions=True)
        
    return logs

def cancel_scheduled_publish(db: Session, log_id: int):
    log = db.query(PublishLog).filter(PublishLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Publish log not found")
        
    if log.status != PublishLogStatus.scheduled:
        raise HTTPException(status_code=400, detail="Only scheduled publications can be cancelled")
        
    try:
        scheduler.remove_job(f"publish_log_{log.id}")
    except Exception:
        pass # Job might not be in memory
        
    log.status = PublishLogStatus.failed
    log.error_message = "Cancelled by user"
    db.commit()
    return log
