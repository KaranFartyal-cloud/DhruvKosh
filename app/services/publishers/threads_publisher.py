import os
import httpx
import logging
from typing import Optional
from app.services.publishers.base import BasePublisher, PublishResult

logger = logging.getLogger(__name__)

class ThreadsPublisher(BasePublisher):
    def __init__(self):
        self.access_token = os.getenv("THREADS_ACCESS_TOKEN")
        self.user_id = os.getenv("THREADS_USER_ID")
        self.api_version = "v1.0"
        
    async def publish(self, text: str, image_path: Optional[str] = None) -> PublishResult:
        if not self.access_token or not self.user_id:
            return PublishResult(success=False, error="Threads credentials not configured")
            
        try:
            # Note: Threads API needs an image URL if media_type is IMAGE, otherwise TEXT.
            # If we don't have a public URL, we just publish text.
            media_type = "TEXT"
            params = {
                "media_type": media_type,
                "text": text,
                "access_token": self.access_token
            }
            
            # Step 1: Create media container
            container_url = f"https://graph.threads.net/{self.api_version}/{self.user_id}/threads"
            
            async with httpx.AsyncClient(timeout=60.0) as client:
                container_res = await client.post(container_url, params=params)
                container_data = container_res.json()
                
                if "error" in container_data:
                    return PublishResult(success=False, error=str(container_data["error"]))
                    
                creation_id = container_data.get("id")
                
                if not creation_id:
                    return PublishResult(success=False, error="Failed to create threads container")
                    
                # Add a small delay as Threads API sometimes takes time to process the container
                import asyncio
                await asyncio.sleep(3)
                
                # Step 2: Publish the container
                publish_url = f"https://graph.threads.net/{self.api_version}/{self.user_id}/threads_publish"
                
                publish_res = await client.post(
                    publish_url,
                    params={
                        "creation_id": creation_id,
                        "access_token": self.access_token
                    }
                )
                
                publish_data = publish_res.json()
                
                if "error" in publish_data:
                    return PublishResult(success=False, error=str(publish_data["error"]))
                    
                media_id = publish_data.get("id")
                
                return PublishResult(
                    success=True, 
                    external_id=media_id,
                    url=f"https://www.threads.net/post/{media_id}"
                )
                
        except Exception as e:
            logger.error(f"Threads publish error: {str(e)}")
            return PublishResult(success=False, error=str(e))
