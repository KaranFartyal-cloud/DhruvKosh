import os
import asyncio
from dotenv import load_dotenv

load_dotenv()

async def run_meta_test():
    print("--- Meta Publishers Smoke Test ---")
    
    test_message = "TEST POST: This is an automated smoke test for Facebook, Instagram, and Threads."
    
    # 1. Facebook
    print("\n--- Testing Facebook ---")
    if os.getenv("FACEBOOK_PAGE_ACCESS_TOKEN") and os.getenv("FACEBOOK_PAGE_ID"):
        from app.services.publishers.facebook_publisher import FacebookPublisher
        publisher = FacebookPublisher()
        result = await publisher.publish(text=test_message)
        if result.success:
            print(f"SUCCESS! URL: {result.url}")
        else:
            print(f"FAILED: {result.error}")
    else:
        print("Facebook not fully configured.")

    # 2. Instagram
    print("\n--- Testing Instagram ---")
    if os.getenv("INSTAGRAM_ACCESS_TOKEN") and os.getenv("INSTAGRAM_ACCOUNT_ID"):
        from app.services.publishers.instagram_publisher import InstagramPublisher
        publisher = InstagramPublisher()
        result = await publisher.publish(
            text=test_message,
            image_path="https://upload.wikimedia.org/wikipedia/commons/a/a3/June_odd-eyed-cat.jpg"
        )
        if result.success:
            print(f"SUCCESS! URL: {result.url}")
        else:
            print(f"FAILED: {result.error}")
    else:
        print("Instagram not fully configured.")

    # 3. Threads
    print("\n--- Testing Threads ---")
    if os.getenv("THREADS_ACCESS_TOKEN") and os.getenv("THREADS_USER_ID"):
        from app.services.publishers.threads_publisher import ThreadsPublisher
        publisher = ThreadsPublisher()
        result = await publisher.publish(text=test_message)
        if result.success:
            print(f"SUCCESS! URL: {result.url}")
        else:
            print(f"FAILED: {result.error}")
    else:
        print("Threads not fully configured.")

if __name__ == "__main__":
    asyncio.run(run_meta_test())
