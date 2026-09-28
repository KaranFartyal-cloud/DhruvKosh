import os
import httpx
from typing import Optional
from app.services.publishers.base import BasePublisher, PublishResult
import logging

logger = logging.getLogger(__name__)

class MastodonPublisher(BasePublisher):
    def __init__(self):
        self.instance_url = os.getenv("MASTODON_INSTANCE_URL")
        self.access_token = os.getenv("MASTODON_ACCESS_TOKEN")
        
    async def publish(self, text: str, image_path: Optional[str] = None) -> PublishResult:
        if not self.instance_url or not self.access_token:
            return PublishResult(success=False, error="Mastodon credentials not configured")
            
        # Ensure instance_url doesn't end with slash
        base_url = self.instance_url.rstrip('/')
        headers = {"Authorization": f"Bearer {self.access_token}"}
        
        try:
            async with httpx.AsyncClient() as client:
                media_id = None
                if image_path and os.path.exists(image_path):
                    with open(image_path, "rb") as f:
                        files = {"file": f}
                        media_resp = await client.post(f"{base_url}/api/v2/media", headers=headers, files=files)
                        media_resp.raise_for_status()
                        media_id = media_resp.json().get("id")
                        
                data = {"status": text}
                if media_id:
                    data["media_ids[]"] = media_id
                    
                status_resp = await client.post(f"{base_url}/api/v1/statuses", headers=headers, data=data)
                status_resp.raise_for_status()
                result = status_resp.json()
                
                return PublishResult(
                    success=True, 
                    external_id=str(result.get("id")), 
                    url=result.get("url")
                )
                
        except httpx.HTTPStatusError as e:
            error_msg = f"Mastodon API error: {e.response.status_code} - {e.response.text}"
            logger.error(error_msg)
            return PublishResult(success=False, error=error_msg)
        except Exception as e:
            logger.error(f"Mastodon publish error: {str(e)}")
            return PublishResult(success=False, error=str(e))
