import os
import tweepy
from typing import Optional
from app.services.publishers.base import BasePublisher, PublishResult
import logging

logger = logging.getLogger(__name__)

class XPublisher(BasePublisher):
    def __init__(self):
        self.api_key = os.getenv("X_API_KEY")
        self.api_secret = os.getenv("X_API_SECRET")
        self.access_token = os.getenv("X_ACCESS_TOKEN")
        self.access_token_secret = os.getenv("X_ACCESS_TOKEN_SECRET")
        
    def _truncate_text(self, text: str, limit: int = 280) -> str:
        if len(text) <= limit:
            return text
            
        # Try to truncate at a sentence boundary
        sentences = text.split('. ')
        truncated = ""
        for sentence in sentences:
            if len(truncated) + len(sentence) + 2 <= limit:
                truncated += sentence + ". "
            else:
                break
                
        if not truncated:
            # If even the first sentence is too long, just cut it
            return text[:limit-3] + "..."
            
        return truncated.strip()

    async def publish(self, text: str, image_path: Optional[str] = None) -> PublishResult:
        if not all([self.api_key, self.api_secret, self.access_token, self.access_token_secret]):
            return PublishResult(success=False, error="X credentials not configured")
            
        # Enforce 280-character limit
        if len(text) > 280:
            text = self._truncate_text(text)
            if len(text) > 280:
                return PublishResult(success=False, error="Text too long and could not be truncated")
                
        try:
            # v1.1 API is needed for media upload
            auth = tweepy.OAuth1UserHandler(
                self.api_key, self.api_secret, self.access_token, self.access_token_secret
            )
            api_v1 = tweepy.API(auth)
            
            # v2 API for tweeting
            client = tweepy.Client(
                consumer_key=self.api_key,
                consumer_secret=self.api_secret,
                access_token=self.access_token,
                access_token_secret=self.access_token_secret
            )
            
            media_ids = []
            if image_path and os.path.exists(image_path):
                media = api_v1.media_upload(filename=image_path)
                media_ids.append(media.media_id)
                
            response = client.create_tweet(text=text, media_ids=media_ids if media_ids else None)
            tweet_id = response.data['id']
            return PublishResult(
                success=True, 
                external_id=tweet_id, 
                url=f"https://x.com/user/status/{tweet_id}"
            )
            
        except tweepy.errors.Unauthorized:
            return PublishResult(success=False, error="X API unauthorized. Check tokens.")
        except tweepy.errors.Forbidden:
            return PublishResult(success=False, error="X API forbidden. Might be token permissions or API level limit.")
        except tweepy.errors.TooManyRequests:
            return PublishResult(success=False, error="X API rate limited. Retry later.")
        except tweepy.errors.TweepyException as e:
            if "402" in str(e) or "Payment Required" in str(e):
                return PublishResult(success=False, error="X API credits exhausted or payment required.")
            logger.error(f"X publish error: {str(e)}")
            return PublishResult(success=False, error=str(e))
        except Exception as e:
            logger.error(f"X publish general error: {str(e)}")
            return PublishResult(success=False, error=str(e))
