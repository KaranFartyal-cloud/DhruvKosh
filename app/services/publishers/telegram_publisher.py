import os
import httpx
from typing import Optional
from app.services.publishers.base import BasePublisher, PublishResult
import logging

logger = logging.getLogger(__name__)

class TelegramPublisher(BasePublisher):
    def __init__(self):
        self.bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
        self.channel_id = os.getenv("TELEGRAM_CHANNEL_ID")
        
    async def publish(self, text: str, image_path: Optional[str] = None) -> PublishResult:
        if not self.bot_token or not self.channel_id:
            return PublishResult(success=False, error="Telegram credentials not configured")
            
        base_url = f"https://api.telegram.org/bot{self.bot_token}"
        
        try:
            async with httpx.AsyncClient() as client:
                if image_path and os.path.exists(image_path):
                    # Caption limit is 1024 characters.
                    if len(text) <= 1024:
                        with open(image_path, "rb") as f:
                            files = {"photo": f}
                            data = {"chat_id": self.channel_id, "caption": text}
                            response = await client.post(f"{base_url}/sendPhoto", data=data, files=files)
                            response.raise_for_status()
                            result = response.json()
                            message_id = str(result["result"]["message_id"])
                            is_public = not str(self.channel_id).startswith('-')
                            if is_public:
                                username = str(self.channel_id).lstrip('@')
                                url = f"https://t.me/{username}/{message_id}"
                            else:
                                url = "PRIVATE_TELEGRAM"
                            return PublishResult(success=True, external_id=message_id, url=url)
                    else:
                        # Send photo first, then text
                        with open(image_path, "rb") as f:
                            files = {"photo": f}
                            data = {"chat_id": self.channel_id}
                            photo_response = await client.post(f"{base_url}/sendPhoto", data=data, files=files)
                            photo_response.raise_for_status()
                        
                        # Send text
                        text_data = {"chat_id": self.channel_id, "text": text}
                        text_response = await client.post(f"{base_url}/sendMessage", data=text_data)
                        text_response.raise_for_status()
                        
                        result = text_response.json()
                        message_id = str(result["result"]["message_id"])
                        is_public = not str(self.channel_id).startswith('-')
                        if is_public:
                            username = str(self.channel_id).lstrip('@')
                            url = f"https://t.me/{username}/{message_id}"
                        else:
                            url = "PRIVATE_TELEGRAM"
                        return PublishResult(success=True, external_id=message_id, url=url)
                else:
                    # Send text only
                    data = {"chat_id": self.channel_id, "text": text}
                    response = await client.post(f"{base_url}/sendMessage", data=data)
                    response.raise_for_status()
                    result = response.json()
                    message_id = str(result["result"]["message_id"])
                    is_public = not str(self.channel_id).startswith('-')
                    if is_public:
                        username = str(self.channel_id).lstrip('@')
                        url = f"https://t.me/{username}/{message_id}"
                    else:
                        url = "PRIVATE_TELEGRAM"
                    return PublishResult(success=True, external_id=message_id, url=url)
                    
        except httpx.HTTPStatusError as e:
            error_msg = f"Telegram API error: {e.response.status_code} - {e.response.text}"
            logger.error(error_msg)
            return PublishResult(success=False, error=error_msg)
        except Exception as e:
            logger.error(f"Telegram publish error: {str(e)}")
            return PublishResult(success=False, error=str(e))
