import os
from typing import Optional
from app.services.publishers.base import BasePublisher, PublishResult
import logging

logger = logging.getLogger(__name__)

class BlueskyPublisher(BasePublisher):
    def __init__(self):
        self.handle = os.getenv("BLUESKY_HANDLE")
        self.app_password = os.getenv("BLUESKY_APP_PASSWORD")
        
    async def publish(self, text: str, image_path: Optional[str] = None) -> PublishResult:
        if not self.handle or not self.app_password:
            return PublishResult(success=False, error="Bluesky credentials not configured")
            
        try:
            # We import here so that if atproto is not installed, the app still boots
            from atproto import Client, client_utils
            
            client = Client()
            client.login(self.handle, self.app_password)
            
            if image_path and os.path.exists(image_path):
                with open(image_path, "rb") as f:
                    img_data = f.read()
                
                # atproto client handles the two-step blob upload + post creation transparently
                post = client.send_image(
                    text=text,
                    image=img_data,
                    image_alt="Published via NCPOR Portal"
                )
            else:
                post = client.send_post(text=text)
                
            # The URI looks like: at://did:plc:.../app.bsky.feed.post/...
            post_uri = post.uri
            post_id = post_uri.split('/')[-1]
            
            return PublishResult(
                success=True, 
                external_id=post_id, 
                url=f"https://bsky.app/profile/{self.handle}/post/{post_id}"
            )
            
        except ImportError:
            error_msg = "atproto library is required for Bluesky publishing. Run 'pip install atproto'"
            logger.error(error_msg)
            return PublishResult(success=False, error=error_msg)
        except Exception as e:
            logger.error(f"Bluesky publish error: {str(e)}")
            return PublishResult(success=False, error=str(e))
