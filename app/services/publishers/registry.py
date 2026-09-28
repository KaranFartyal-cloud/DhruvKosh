import os
from typing import Dict, Type
from app.services.publishers.base import BasePublisher
from app.services.publishers.telegram_publisher import TelegramPublisher
from app.services.publishers.x_publisher import XPublisher
from app.services.publishers.mastodon_publisher import MastodonPublisher
from app.services.publishers.bluesky_publisher import BlueskyPublisher
from app.services.publishers.linkedin_publisher import LinkedInPublisher
from app.services.publishers.facebook_publisher import FacebookPublisher
from app.services.publishers.instagram_publisher import InstagramPublisher
from app.services.publishers.threads_publisher import ThreadsPublisher
from app.services.publishers.dry_run_publisher import DryRunPublisher

PUBLISHERS: Dict[str, Type[BasePublisher]] = {
    "telegram": TelegramPublisher,
    "twitter": XPublisher,
    "mastodon": MastodonPublisher,
    "bluesky": BlueskyPublisher,
    "linkedin": LinkedInPublisher,
    "facebook": FacebookPublisher,
    "instagram": InstagramPublisher,
    "threads": ThreadsPublisher,
}

def get_publisher(platform: str) -> BasePublisher:
    publish_mode = os.getenv("PUBLISH_MODE", "dry_run")
    
    if publish_mode == "dry_run":
        return DryRunPublisher()
        
    publisher_class = PUBLISHERS.get(platform)
    if not publisher_class:
        raise ValueError(f"No publisher found for platform: {platform}")
        
    publisher = publisher_class()
    # Simple check for missing credentials
    if platform == "telegram" and not (os.getenv("TELEGRAM_BOT_TOKEN") and os.getenv("TELEGRAM_CHANNEL_ID")):
        return DryRunPublisher()
    if platform == "twitter" and not all([os.getenv("X_API_KEY"), os.getenv("X_API_SECRET"), os.getenv("X_ACCESS_TOKEN"), os.getenv("X_ACCESS_TOKEN_SECRET")]):
        return DryRunPublisher()
    if platform == "mastodon" and not (os.getenv("MASTODON_INSTANCE_URL") and os.getenv("MASTODON_ACCESS_TOKEN")):
        return DryRunPublisher()
    if platform == "bluesky" and not (os.getenv("BLUESKY_HANDLE") and os.getenv("BLUESKY_APP_PASSWORD")):
        return DryRunPublisher()
    if platform == "linkedin" and not (os.getenv("LINKEDIN_ACCESS_TOKEN") and os.getenv("LINKEDIN_AUTHOR_URN")):
        return DryRunPublisher()
    if platform == "facebook" and not (os.getenv("FACEBOOK_PAGE_ID") and os.getenv("FACEBOOK_PAGE_ACCESS_TOKEN")):
        return DryRunPublisher()
    if platform == "instagram" and not (os.getenv("INSTAGRAM_ACCOUNT_ID") and os.getenv("INSTAGRAM_ACCESS_TOKEN")):
        return DryRunPublisher()
    if platform == "threads" and not (os.getenv("THREADS_USER_ID") and os.getenv("THREADS_ACCESS_TOKEN")):
        return DryRunPublisher()
        
    return publisher

def get_available_platforms() -> list[str]:
    platforms = []
    
    # Check Telegram
    if os.getenv("TELEGRAM_BOT_TOKEN") and os.getenv("TELEGRAM_CHANNEL_ID"):
        platforms.append("telegram")
        
    # Check Twitter
    if all([os.getenv("X_API_KEY"), os.getenv("X_API_SECRET"), os.getenv("X_ACCESS_TOKEN"), os.getenv("X_ACCESS_TOKEN_SECRET")]):
        platforms.append("twitter")
        
    # Check Mastodon
    if os.getenv("MASTODON_INSTANCE_URL") and os.getenv("MASTODON_ACCESS_TOKEN"):
        platforms.append("mastodon")
        
    # Check Bluesky
    if os.getenv("BLUESKY_HANDLE") and os.getenv("BLUESKY_APP_PASSWORD"):
        platforms.append("bluesky")
        
    # Check LinkedIn
    if os.getenv("LINKEDIN_ACCESS_TOKEN") and os.getenv("LINKEDIN_AUTHOR_URN"):
        platforms.append("linkedin")
        
    # Check Facebook
    if os.getenv("FACEBOOK_PAGE_ID") and os.getenv("FACEBOOK_PAGE_ACCESS_TOKEN"):
        platforms.append("facebook")
        
    # Check Instagram
    if os.getenv("INSTAGRAM_ACCOUNT_ID") and os.getenv("INSTAGRAM_ACCESS_TOKEN"):
        platforms.append("instagram")
        
    # Check Threads
    if os.getenv("THREADS_USER_ID") and os.getenv("THREADS_ACCESS_TOKEN"):
        platforms.append("threads")
        
    return platforms
