import os
import asyncio
from dotenv import load_dotenv

load_dotenv()

async def run_smoke_test():
    print("--- NCPOR Publishing Smoke Test ---")
    
    test_message = "TEST POST: This is an automated smoke test from the NCPOR Polar Science Portal."
    
    # 1. Telegram
    print("\n--- Testing Telegram ---")
    if os.getenv("TELEGRAM_BOT_TOKEN") and os.getenv("TELEGRAM_CHANNEL_ID"):
        from app.services.publishers.telegram_publisher import TelegramPublisher
        publisher = TelegramPublisher()
        result = await publisher.publish(test_message)
        if result.success:
            print(f"SUCCESS! URL: {result.url}")
        else:
            print(f"FAILED: {result.error}")
    else:
        print("Telegram not fully configured.")

    # 2. Bluesky
    print("\n--- Testing Bluesky ---")
    if os.getenv("BLUESKY_HANDLE") and os.getenv("BLUESKY_APP_PASSWORD"):
        from app.services.publishers.bluesky_publisher import BlueskyPublisher
        publisher = BlueskyPublisher()
        result = await publisher.publish(test_message)
        if result.success:
            print(f"SUCCESS! URL: {result.url}")
        else:
            print(f"FAILED: {result.error}")
    else:
        print("Bluesky not fully configured.")

    # 3. Mastodon
    print("\n--- Testing Mastodon ---")
    if os.getenv("MASTODON_INSTANCE_URL") and os.getenv("MASTODON_ACCESS_TOKEN"):
        from app.services.publishers.mastodon_publisher import MastodonPublisher
        publisher = MastodonPublisher()
        result = await publisher.publish(test_message)
        if result.success:
            print(f"SUCCESS! URL: {result.url}")
        else:
            print(f"FAILED: {result.error}")
    else:
        print("Mastodon not fully configured.")

    # 4. LinkedIn
    print("\n--- Testing LinkedIn ---")
    if os.getenv("LINKEDIN_ACCESS_TOKEN") and os.getenv("LINKEDIN_AUTHOR_URN"):
        from app.services.publishers.linkedin_publisher import LinkedInPublisher
        publisher = LinkedInPublisher()
        result = await publisher.publish(test_message)
        if result.success:
            print(f"SUCCESS! URL: {result.url}")
        else:
            print(f"FAILED: {result.error}")
    else:
        print("LinkedIn not fully configured. Needs ACCESS_TOKEN and AUTHOR_URN (Browser login required first).")

if __name__ == "__main__":
    asyncio.run(run_smoke_test())
