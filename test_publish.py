import asyncio
import os
from dotenv import load_dotenv

# Load env before importing publisher registry
load_dotenv()

from app.services.publishers.registry import get_available_platforms, get_publisher

async def test_all_platforms():
    platforms = get_available_platforms()
    print(f"Configured platforms: {platforms}")
    print("-" * 50)
    
    text = "🚀 Multi-platform System Test: Live publishing integration is working! (Automated test message)"
    
    for platform in platforms:
        print(f"Testing {platform.upper()}...")
        publisher = get_publisher(platform)
        
        try:
            # Note: Some platforms like Instagram require an image_path, we will try with None first.
            result = await publisher.publish(text=text, image_path=None)
            
            if result.success:
                print(f"  [SUCCESS]")
                print(f"  External ID: {result.external_id}")
                print(f"  URL: {result.url}")
            else:
                print(f"  [FAILED]")
                print(f"  Error: {result.error}")
        except Exception as e:
            print(f"  [CRASHED]")
            print(f"  Exception: {str(e)}")
            
        print("-" * 50)

if __name__ == "__main__":
    asyncio.run(test_all_platforms())
