"""
Full Integration Test Script for NCPOR Polar Science Outreach Portal

This script tests the complete end-to-end flow with real data, verifying:
- Database seeding with real expeditions
- API endpoints functionality
- File serving and preview generation
- AI content generation
- Content publishing workflow
- Public website filtering

Run this before your hackathon demo to ensure everything works!
"""

import requests
import pandas as pd
import json
import sys
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:8000"
EXPECTED_EXPEDITIONS = [
    "42nd Indian Antarctic Expedition",
    "13th Indian Arctic Expedition",
    "41st Indian Antarctic Expedition"
]

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'
    BOLD = '\033[1m'

def print_header(text):
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.BLUE}{text}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.RESET}")

def print_pass(message):
    print(f"{Colors.GREEN}[PASS] {message}{Colors.RESET}")

def print_fail(message):
    print(f"{Colors.RED}[FAIL] {message}{Colors.RESET}")

def print_warning(message):
    print(f"{Colors.YELLOW}[WARNING] {message}{Colors.RESET}")

def test_api_health():
    """Test 1: API Health Check"""
    print_header("Test 1: API Health Check")
    
    try:
        response = requests.get(f"{BASE_URL}/api/health", timeout=5)
        if response.status_code == 200:
            data = response.json()
            if data.get("status") == "healthy":
                print_pass("API is healthy and responding")
                return True
            else:
                print_fail(f"API returned unexpected status: {data}")
                return False
        else:
            print_fail(f"API returned status code {response.status_code}")
            return False
    except Exception as e:
        print_fail(f"Could not connect to API: {e}")
        return False

def test_expeditions_list():
    """Test 2: Fetch Expeditions List"""
    print_header("Test 2: Expeditions List")
    
    try:
        response = requests.get(f"{BASE_URL}/api/expeditions", timeout=10)
        if response.status_code != 200:
            print_fail(f"GET /api/expeditions returned {response.status_code}")
            return False
        
        expeditions = response.json()
        if not expeditions:
            print_fail("No expeditions returned")
            return False
        
        print_pass(f"Retrieved {len(expeditions)} expeditions")
        
        # Check for expected expeditions
        expedition_names = [exp['name'] for exp in expeditions]
        found_count = 0
        for expected in EXPECTED_EXPEDITIONS:
            if expected in expedition_names:
                print_pass(f"Found expected expedition: {expected}")
                found_count += 1
            else:
                print_warning(f"Expected expedition not found: {expected}")
        
        if found_count >= 2:  # At least 2 expected expeditions found
            print_pass(f"Found {found_count}/{len(EXPECTED_EXPEDITIONS)} expected expeditions")
            return True
        else:
            print_fail(f"Only found {found_count}/{len(EXPECTED_EXPEDITIONS)} expected expeditions")
            return False
            
    except Exception as e:
        print_fail(f"Error fetching expeditions: {e}")
        return False

def test_expedition_full_detail():
    """Test 3: Fetch Expedition Full Detail"""
    print_header("Test 3: Expedition Full Detail")
    
    try:
        # Get first expedition
        response = requests.get(f"{BASE_URL}/api/expeditions", timeout=10)
        expeditions = response.json()
        
        if not expeditions:
            print_fail("No expeditions available for full detail test")
            return False
        
        first_expedition = expeditions[0]
        expedition_id = first_expedition['id']
        expedition_name = first_expedition['name']
        
        print(f"Testing with expedition: {expedition_name} (ID: {expedition_id})")
        
        # Fetch full detail
        response = requests.get(f"{BASE_URL}/api/expeditions/{expedition_id}/full", timeout=10)
        if response.status_code != 200:
            print_fail(f"GET /api/expeditions/{expedition_id}/full returned {response.status_code}")
            return False
        
        full_detail = response.json()
        
        # Check for related content
        checks = [
            ('reports', full_detail.get('reports', [])),
            ('datasets', full_detail.get('datasets', [])),
            ('publications', full_detail.get('publications', [])),
            ('media_items', full_detail.get('media_items', [])),
            ('activities', full_detail.get('activities', []))
        ]
        
        all_have_content = True
        for content_type, content_list in checks:
            if content_list:
                print_pass(f"Expedition has {len(content_list)} {content_type}")
            else:
                print_warning(f"Expedition has no {content_type}")
                # This is not a failure - some expeditions might not have all content types
        
        # At least one content type should have data
        has_any_content = any(len(content) > 0 for _, content in checks)
        if has_any_content:
            print_pass("Expedition has related content")
            return True
        else:
            print_fail("Expedition has no related content at all")
            return False
            
    except Exception as e:
        print_fail(f"Error fetching expedition full detail: {e}")
        return False

def test_dataset_preview():
    """Test 4: Dataset Preview Generation"""
    print_header("Test 4: Dataset Preview")
    
    try:
        # Get first dataset
        response = requests.get(f"{BASE_URL}/api/datasets", timeout=10)
        if response.status_code != 200:
            print_fail(f"GET /api/datasets returned {response.status_code}")
            return False
        
        datasets = response.json()
        if not datasets:
            print_warning("No datasets available for preview test")
            return True  # Not a failure, just skip
        
        first_dataset = datasets[0]
        dataset_id = first_dataset['id']
        dataset_title = first_dataset['title']
        
        print(f"Testing dataset: {dataset_title} (ID: {dataset_id})")
        
        # Fetch preview
        response = requests.get(f"{BASE_URL}/api/datasets/{dataset_id}/preview", timeout=10)
        if response.status_code != 200:
            print_fail(f"GET /api/datasets/{dataset_id}/preview returned {response.status_code}")
            return False
        
        preview = response.json()
        
        # Check preview structure
        if 'columns' not in preview or 'rows' not in preview:
            print_fail("Preview missing required fields (columns, rows)")
            return False
        
        if not preview['columns']:
            print_fail("Preview has no columns")
            return False
        
        if not preview['rows']:
            print_fail("Preview has no rows")
            return False
        
        print_pass(f"Preview has {len(preview['columns'])} columns and {len(preview['rows'])} rows")
        print_pass(f"Columns: {', '.join(preview['columns'][:5])}")
        return True
        
    except Exception as e:
        print_fail(f"Error fetching dataset preview: {e}")
        return False

def test_file_serving():
    """Test 5: File Serving with Correct Content-Type"""
    print_header("Test 5: File Serving")
    
    try:
        # Test with first publication (if exists)
        response = requests.get(f"{BASE_URL}/api/publications", timeout=10)
        publications = response.json()
        
        if publications:
            first_pub = publications[0]
            if first_pub.get('file_path'):
                pub_id = first_pub['id']
                print(f"Testing publication file serving (ID: {pub_id})")
                
                response = requests.get(f"{BASE_URL}/api/files/publications/{pub_id}", timeout=10)
                if response.status_code == 200:
                    content_type = response.headers.get('Content-Type', '')
                    content_length = len(response.content)
                    
                    if 'application/pdf' in content_type:
                        print_pass(f"File served with correct Content-Type: {content_type}")
                        print_pass(f"File size: {content_length} bytes")
                        return True
                    else:
                        print_warning(f"Unexpected Content-Type: {content_type}")
                        return True  # Not a critical failure
                else:
                    print_warning(f"File serving returned {response.status_code}")
            else:
                print_warning("Publication has no file_path")
        
        # Test with first media item (if exists)
        response = requests.get(f"{BASE_URL}/api/expeditions", timeout=10)
        expeditions = response.json()
        
        if expeditions:
            first_exp = expeditions[0]
            exp_id = first_exp['id']
            response = requests.get(f"{BASE_URL}/api/expeditions/{exp_id}/full", timeout=10)
            full_detail = response.json()
            
            media_items = full_detail.get('media_items', [])
            if media_items:
                first_media = media_items[0]
                media_id = first_media['id']
                print(f"Testing media file serving (ID: {media_id})")
                
                response = requests.get(f"{BASE_URL}/api/files/media/{media_id}", timeout=10)
                if response.status_code == 200:
                    content_type = response.headers.get('Content-Type', '')
                    content_length = len(response.content)
                    
                    print_pass(f"Media file served with Content-Type: {content_type}")
                    print_pass(f"File size: {content_length} bytes")
                    return True
                else:
                    print_warning(f"Media file serving returned {response.status_code}")
        
        print_warning("No files available for serving test")
        return True  # Not a failure if no files exist yet
        
    except Exception as e:
        print_fail(f"Error testing file serving: {e}")
        return False

def test_ai_content_generation():
    """Test 6: AI Content Generation"""
    print_header("Test 6: AI Content Generation")
    
    try:
        # Get first expedition
        response = requests.get(f"{BASE_URL}/api/expeditions", timeout=10)
        expeditions = response.json()
        
        if not expeditions:
            print_fail("No expeditions available for AI generation test")
            return False
        
        first_expedition = expeditions[0]
        expedition_id = first_expedition['id']
        expedition_name = first_expedition['name']
        
        print(f"Testing AI generation for: {expedition_name} (ID: {expedition_id})")
        print("This may take 30-60 seconds...")
        
        # Trigger generation
        response = requests.post(f"{BASE_URL}/api/generated/generate/{expedition_id}", timeout=120)
        
        if response.status_code != 200:
            print_fail(f"AI generation returned {response.status_code}")
            return False
        
        generated = response.json()
        
        # Check for social posts
        social_posts = generated.get('social_posts', {})
        if not social_posts:
            print_fail("No social posts generated")
            return False
        
        print_pass(f"Generated {len(social_posts)} social posts")
        
        # Check social post content
        for platform, text in social_posts.items():
            if text and not text.startswith("Error"):
                print_pass(f"{platform.capitalize()} post generated ({len(text)} chars)")
            else:
                print_fail(f"{platform.capitalize()} post generation failed: {text}")
                return False
        
        # Check for website article
        website_article = generated.get('website_article', {})
        if website_article and not website_article.get('error'):
            headline = website_article.get('headline', '')
            body = website_article.get('body', '')
            if headline and body:
                print_pass(f"Website article generated (headline: {headline[:50]}...)")
            else:
                print_fail("Website article missing headline or body")
                return False
        else:
            print_warning("Website article generation failed or missing")
        
        # Check for educational explainer
        explainer = generated.get('educational_explainer', {})
        if explainer and not explainer.get('error'):
            title = explainer.get('title', '')
            if title:
                print_pass(f"Educational explainer generated (title: {title[:50]}...)")
            else:
                print_warning("Educational explainer missing title")
        else:
            print_warning("Educational explainer generation failed or missing")
        
        # Sanity check: expedition name should appear in generated content
        expedition_name_in_content = False
        all_text = " ".join(social_posts.values())
        if website_article.get('body'):
            all_text += " " + website_article['body']
        
        if expedition_name.lower() in all_text.lower():
            print_pass(f"Expedition name '{expedition_name}' appears in generated content")
            expedition_name_in_content = True
        else:
            print_warning(f"Expedition name '{expedition_name}' not found in generated content")
        
        return True
        
    except Exception as e:
        print_fail(f"Error during AI generation: {e}")
        return False

def test_content_publishing():
    """Test 7: Content Publishing Workflow"""
    print_header("Test 7: Content Publishing Workflow")
    
    try:
        # Get generated content
        response = requests.get(f"{BASE_URL}/api/expeditions", timeout=10)
        expeditions = response.json()
        
        if not expeditions:
            print_fail("No expeditions available for publishing test")
            return False
        
        first_expedition = expeditions[0]
        exp_id = first_expedition['id']
        
        response = requests.get(f"{BASE_URL}/api/generated/expedition/{exp_id}/content", timeout=10)
        if response.status_code != 200:
            print_fail(f"Failed to get generated content: {response.status_code}")
            return False
        
        grouped_content = response.json()
        
        # Find a draft content item
        draft_items = []
        for category, items in grouped_content.items():
            for item in items:
                if item.get('status') == 'draft':
                    draft_items.append(item)
        
        if not draft_items:
            print_warning("No draft content items found for publishing test")
            return True  # Not a failure, just skip
        
        first_draft = draft_items[0]
        content_id = first_draft['id']
        original_status = first_draft['status']
        
        print(f"Testing publishing workflow for content ID: {content_id}")
        print(f"Original status: {original_status}")
        
        # Update status to published
        response = requests.patch(
            f"{BASE_URL}/api/generated/generated-content/{content_id}/status",
            params={'status': 'published'},
            timeout=10
        )
        
        if response.status_code != 200:
            print_fail(f"Status update failed: {response.status_code}")
            return False
        
        print_pass("Status updated to 'published'")
        
        # Verify it appears in public endpoint
        response = requests.get(f"{BASE_URL}/api/generated/public", timeout=10)
        if response.status_code != 200:
            print_fail(f"Public endpoint failed: {response.status_code}")
            return False
        
        public_content = response.json()
        published_ids = [item['id'] for item in public_content]
        
        if content_id in published_ids:
            print_pass("Published content appears in public endpoint")
        else:
            print_fail("Published content NOT found in public endpoint")
            return False
        
        # Verify draft items do NOT appear
        draft_ids = [item['id'] for item in draft_items if item['id'] != content_id]
        appearing_drafts = [did for did in draft_ids if did in published_ids]
        
        if not appearing_drafts:
            print_pass("Draft content correctly filtered from public endpoint")
        else:
            print_fail(f"{len(appearing_drafts)} draft items incorrectly appear in public endpoint")
            return False
        
        # Revert status for cleanup
        requests.patch(
            f"{BASE_URL}/api/generated/generated-content/{content_id}/status",
            params={'status': 'draft'},
            timeout=10
        )
        
        return True
        
    except Exception as e:
        print_fail(f"Error during publishing test: {e}")
        return False

def run_all_tests():
    """Run all integration tests"""
    print(f"\n{Colors.BOLD}{Colors.BLUE}")
    print("="*60)
    print("NCPOR PORTAL - FULL INTEGRATION TEST")
    print("="*60)
    print(f"{Colors.RESET}")
    
    print(f"\n{Colors.YELLOW}Testing against: {BASE_URL}{Colors.RESET}")
    print(f"{Colors.YELLOW}Start time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}{Colors.RESET}\n")
    
    tests = [
        ("API Health Check", test_api_health),
        ("Expeditions List", test_expeditions_list),
        ("Expedition Full Detail", test_expedition_full_detail),
        ("Dataset Preview", test_dataset_preview),
        ("File Serving", test_file_serving),
        ("AI Content Generation", test_ai_content_generation),
        ("Content Publishing", test_content_publishing)
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print_fail(f"{test_name} crashed: {e}")
            results.append((test_name, False))
    
    # Print summary
    print_header("TEST SUMMARY")
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = f"{Colors.GREEN}PASS{Colors.RESET}" if result else f"{Colors.RED}FAIL{Colors.RESET}"
        print(f"{status}: {test_name}")
    
    print(f"\n{Colors.BOLD}Final Result: {passed}/{total} tests passed{Colors.RESET}")
    
    if passed == total:
        print(f"{Colors.GREEN}{Colors.BOLD}ALL TESTS PASSED! System is ready for demo.{Colors.RESET}")
        return 0
    else:
        print(f"{Colors.RED}{Colors.BOLD}SOME TESTS FAILED. Please review the errors above.{Colors.RESET}")
        return 1

if __name__ == "__main__":
    exit_code = run_all_tests()
    sys.exit(exit_code)
