import os
import httpx
from typing import Optional
from app.services.publishers.base import BasePublisher, PublishResult
import logging

logger = logging.getLogger(__name__)

class LinkedInPublisher(BasePublisher):
    def __init__(self):
        self.access_token = os.getenv("LINKEDIN_ACCESS_TOKEN")
        self.author_urn = os.getenv("LINKEDIN_AUTHOR_URN")
        # Ensure urn format
        if self.author_urn and not self.author_urn.startswith("urn:li:person:"):
            self.author_urn = f"urn:li:person:{self.author_urn}"
            
    async def publish(self, text: str, image_path: Optional[str] = None) -> PublishResult:
        if not self.access_token or not self.author_urn:
            return PublishResult(success=False, error="LinkedIn credentials not configured (.env needs LINKEDIN_ACCESS_TOKEN and LINKEDIN_AUTHOR_URN)")
            
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "LinkedIn-Version": "202609",
            "X-Restli-Protocol-Version": "2.0.0",
            "Content-Type": "application/json"
        }
        
        try:
            async with httpx.AsyncClient() as client:
                media_id = None
                
                # Image Upload Process (Posts API)
                if image_path and os.path.exists(image_path):
                    # 1. Initialize upload
                    init_data = {
                        "initializeUploadRequest": {
                            "owner": self.author_urn
                        }
                    }
                    init_res = await client.post("https://api.linkedin.com/rest/images?action=initializeUpload", headers=headers, json=init_data)
                    
                    if init_res.status_code == 200:
                        init_json = init_res.json()
                        upload_url = init_json["value"]["uploadUrl"]
                        media_id = init_json["value"]["image"]
                        
                        # 2. Upload image via PUT
                        with open(image_path, "rb") as f:
                            img_data = f.read()
                        
                        # Note: uploadUrl requires standard headers, not the LinkedIn API headers
                        put_headers = {
                            "Authorization": f"Bearer {self.access_token}",
                            "Content-Type": "application/octet-stream"
                        }
                        upload_res = await client.put(upload_url, headers=put_headers, content=img_data)
                        upload_res.raise_for_status()
                    else:
                        logger.warning(f"Failed to initialize LinkedIn image upload: {init_res.text}")
                        return PublishResult(success=False, error=f"LinkedIn image init failed: {init_res.text}")

                # Create Post
                post_data = {
                    "author": self.author_urn,
                    "commentary": text,
                    "visibility": "PUBLIC",
                    "distribution": {
                        "feedDistribution": "MAIN_FEED",
                        "targetEntities": [],
                        "thirdPartyDistributionChannels": []
                    },
                    "lifecycleState": "PUBLISHED",
                    "isReshareDisabledByAuthor": False
                }
                
                if media_id:
                    post_data["content"] = {
                        "media": {
                            "id": media_id
                        }
                    }
                    
                post_res = await client.post("https://api.linkedin.com/rest/posts", headers=headers, json=post_data)
                
                if post_res.status_code == 201:
                    # Successfully created
                    post_id = post_res.headers.get("x-restli-id", "")
                    url = f"https://www.linkedin.com/feed/update/{post_id}" if post_id else None
                    return PublishResult(success=True, external_id=post_id, url=url)
                else:
                    return PublishResult(success=False, error=f"LinkedIn API error: {post_res.status_code} - {post_res.text}")
                    
        except httpx.HTTPStatusError as e:
            error_msg = f"LinkedIn API error: {e.response.status_code} - {e.response.text}"
            logger.error(error_msg)
            return PublishResult(success=False, error=error_msg)
        except Exception as e:
            logger.error(f"LinkedIn publish error: {str(e)}")
            return PublishResult(success=False, error=str(e))
