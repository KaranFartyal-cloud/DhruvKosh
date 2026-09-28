from typing import Optional
from app.services.publishers.base import BasePublisher, PublishResult
import uuid
import logging

logger = logging.getLogger(__name__)

class DryRunPublisher(BasePublisher):
    async def publish(self, text: str, image_path: Optional[str] = None) -> PublishResult:
        logger.info(f"[DRY RUN] Publishing text: {text}")
        if image_path:
            logger.info(f"[DRY RUN] Publishing image: {image_path}")
            
        return PublishResult(
            success=True,
            external_id=f"dry_run_{uuid.uuid4().hex[:8]}",
            url=None,
            error=None
        )
