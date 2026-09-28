import os
import httpx
from typing import Optional
from app.services.publishers.base import BasePublisher, PublishResult
import logging

logger = logging.getLogger(__name__)

class FacebookPublisher(BasePublisher):
    def __init__(self):
        self.page_id = os.getenv("FACEBOOK_PAGE_ID")
        self.access_token = os.getenv("FACEBOOK_PAGE_ACCESS_TOKEN")
        
    async def publish(self, text: str, image_path: Optional[str] = None) -> PublishResult:
        if not self.page_id or not self.access_token:
            return PublishResult(success=False, error="Facebook credentials not configured (.env needs FACEBOOK_PAGE_ID and FACEBOOK_PAGE_ACCESS_TOKEN)")
            
        base_url = f"https://graph.facebook.com/v19.0/{self.page_id}"
        
        try:
            async with httpx.AsyncClient() as client:
                if image_path and os.path.exists(image_path):
                    # Publish photo with message (Facebook requires 'source' for file uploads)
                    url = f"{base_url}/photos"
                    data = {
                        "message": text,
                        "access_token": self.access_token
                    }
                    with open(image_path, "rb") as f:
                        # Pass tuple (filename, file_object, content_type)
                        files = {"source": (os.path.basename(image_path), f, "image/jpeg")}
                        resp = await client.post(url, data=data, files=files)
                else:
                    # Publish text only to feed
                    url = f"{base_url}/feed"
                    data = {
                        "message": text,
                        "access_token": self.access_token
                    }
                    resp = await client.post(url, data=data)
                    
                resp_json = resp.json()
                
                if resp.status_code != 200:
                    error_msg = resp_json.get("error", {}).get("message", resp.text)
                    return PublishResult(success=False, error=f"Facebook API error: {error_msg}")
                    
                post_id = resp_json.get("post_id") or resp_json.get("id")
                # URL structure: https://facebook.com/{page_id}/posts/{post_id_without_page_prefix}
                post_url = f"https://facebook.com/{post_id}" if post_id else None
                
                return PublishResult(
                    success=True, 
                    external_id=str(post_id), 
                    url=post_url
                )
                
        except httpx.HTTPStatusError as e:
            error_msg = f"Facebook HTTP error: {e.response.status_code} - {e.response.text}"
            logger.error(error_msg)
            return PublishResult(success=False, error=error_msg)
        except Exception as e:
            logger.error(f"Facebook publish error: {str(e)}")
            return PublishResult(success=False, error=str(e))
