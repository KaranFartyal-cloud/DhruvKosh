import os
import httpx
import logging
from typing import Optional
from app.services.publishers.base import BasePublisher, PublishResult
import urllib.parse
from fastapi import UploadFile

logger = logging.getLogger(__name__)

class InstagramPublisher(BasePublisher):
    def __init__(self):
        self.access_token = os.getenv("INSTAGRAM_ACCESS_TOKEN")
        self.account_id = os.getenv("INSTAGRAM_ACCOUNT_ID")
        self.api_version = "v19.0"
        
    async def publish(self, text: str, image_path: Optional[str] = None) -> PublishResult:
        if not self.access_token or not self.account_id:
            return PublishResult(success=False, error="Instagram credentials not configured")
            
        if not image_path:
            return PublishResult(success=False, error="Instagram requires an image to publish")
            
        try:
            # Instagram Graph API requires a publicly accessible URL for the image
            # In a real environment, you would upload the local image to a bucket (S3, Cloudinary)
            # and pass the URL. Since this app might run locally, this can be tricky.
            # However, for this implementation, we will assume image_path is a public URL if it starts with http,
            # otherwise it will fail because Instagram API can't fetch a local path.
            
            # For demonstration, we will try to use the image_path directly if it's a URL
            image_url = image_path
            
            # In a production Render deployment, we might need to serve the local image or upload it.
            # If it's a local file, we have a problem. Let's assume it's a URL for now or we will get a clear error.
            if not image_url.startswith('http'):
                # Temporary fallback: in our system, images are usually in uploads/
                # We need a public URL for Instagram. If we are on Render, we might be able to construct it.
                base_url = os.getenv("PUBLIC_URL", "https://dhruvkosh.onrender.com")
                # Ensure the path is relative to the web root
                rel_path = image_path.split('uploads')[-1].replace('\\', '/')
                image_url = f"{base_url}/uploads{rel_path}"

            # Step 1: Create media container
            container_url = f"https://graph.facebook.com/{self.api_version}/{self.account_id}/media"
            
            async with httpx.AsyncClient() as client:
                container_res = await client.post(
                    container_url,
                    params={
                        "image_url": image_url,
                        "caption": text,
                        "access_token": self.access_token
                    }
                )
                
                container_data = container_res.json()
                
                if "error" in container_data:
                    return PublishResult(success=False, error=str(container_data["error"]))
                    
                creation_id = container_data.get("id")
                
                if not creation_id:
                    return PublishResult(success=False, error="Failed to create media container")
                    
                # Step 2: Publish the container
                publish_url = f"https://graph.facebook.com/{self.api_version}/{self.account_id}/media_publish"
                
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
                
                # Fetch the real permalink from the Graph API
                real_url = None
                try:
                    permalink_res = await client.get(
                        f"https://graph.facebook.com/{self.api_version}/{media_id}",
                        params={"fields": "permalink", "access_token": self.access_token}
                    )
                    permalink_data = permalink_res.json()
                    real_url = permalink_data.get("permalink")
                except Exception:
                    pass  # No link is better than a broken one
                
                return PublishResult(
                    success=True,
                    external_id=media_id,
                    url=real_url  # None shown as 'Link unavailable' rather than broken URL
                )
                
        except Exception as e:
            logger.error(f"Instagram publish error: {str(e)}")
            return PublishResult(success=False, error=str(e))
