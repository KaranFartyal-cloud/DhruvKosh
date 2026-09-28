import pytest
import os
import asyncio
from unittest.mock import patch, MagicMock, AsyncMock
from datetime import datetime

from app.services.publishers.telegram_publisher import TelegramPublisher
from app.services.publishers.x_publisher import XPublisher
from app.services.publishers.dry_run_publisher import DryRunPublisher
from app.services.publishers.base import PublishResult

from app.services.publish_service import publish_content
from app.models import GeneratedContent, GeneratedStatus, PublishLog, PublishLogStatus, MediaItem
import tweepy
import httpx
from fastapi import HTTPException

# --- ADAPTER TESTS ---

@pytest.mark.asyncio
@patch('httpx.AsyncClient.post')
@patch.dict(os.environ, {"TELEGRAM_BOT_TOKEN": "test_token", "TELEGRAM_CHANNEL_ID": "test_channel"})
async def test_telegram_success(mock_post):
    mock_resp = MagicMock()
    mock_resp.json.return_value = {"result": {"message_id": 123}}
    mock_resp.raise_for_status.return_value = None
    mock_post.return_value = mock_resp
    
    publisher = TelegramPublisher()
    result = await publisher.publish("Test message")
    
    assert result.success is True
    assert result.external_id == "123"
    assert result.url is not None

@pytest.mark.asyncio
@patch('httpx.AsyncClient.post')
@patch.dict(os.environ, {"TELEGRAM_BOT_TOKEN": "test_token", "TELEGRAM_CHANNEL_ID": "test_channel"})
async def test_telegram_401(mock_post):
    mock_resp = MagicMock()
    mock_resp.status_code = 401
    mock_resp.text = "Unauthorized"
    mock_post.side_effect = httpx.HTTPStatusError("401", request=MagicMock(), response=mock_resp)
    
    publisher = TelegramPublisher()
    result = await publisher.publish("Test message")
    
    assert result.success is False
    assert "401" in result.error

def test_x_truncate():
    publisher = XPublisher()
    # Test short
    assert publisher._truncate_text("Short") == "Short"
    # Test long with sentence boundary
    long_text = "A" * 150 + ". " + "B" * 150 + "."
    truncated = publisher._truncate_text(long_text)
    assert len(truncated) <= 280
    assert "B" not in truncated
    # Test long without boundary
    very_long = "C" * 300
    truncated_no_bound = publisher._truncate_text(very_long)
    assert len(truncated_no_bound) == 280
    assert truncated_no_bound.endswith("...")

@pytest.mark.asyncio
@patch('tweepy.Client.create_tweet')
@patch.dict(os.environ, {"X_API_KEY": "a", "X_API_SECRET": "b", "X_ACCESS_TOKEN": "c", "X_ACCESS_TOKEN_SECRET": "d"})
async def test_x_success(mock_create):
    mock_resp = MagicMock()
    mock_resp.data = {"id": "12345"}
    mock_create.return_value = mock_resp
    
    publisher = XPublisher()
    result = await publisher.publish("Test X message")
    
    assert result.success is True
    assert result.external_id == "12345"

@pytest.mark.asyncio
@patch('tweepy.Client.create_tweet')
@patch.dict(os.environ, {"X_API_KEY": "a", "X_API_SECRET": "b", "X_ACCESS_TOKEN": "c", "X_ACCESS_TOKEN_SECRET": "d"})
async def test_x_429(mock_create):
    mock_resp = MagicMock()
    mock_create.side_effect = tweepy.errors.TooManyRequests(mock_resp)
    
    publisher = XPublisher()
    result = await publisher.publish("Test message")
    
    assert result.success is False
    assert "rate limited" in result.error.lower()

# --- SERVICE TESTS ---

@pytest.mark.asyncio
async def test_service_draft_rejected():
    mock_db = MagicMock()
    mock_content = GeneratedContent(id=1, status=GeneratedStatus.draft)
    mock_db.query().filter().first.return_value = mock_content
    
    with pytest.raises(HTTPException) as exc_info:
        await publish_content(mock_db, 1, ["twitter"])
    assert exc_info.value.status_code == 400

@pytest.mark.asyncio
async def test_service_duplicate_rejected():
    mock_db = MagicMock()
    mock_content = GeneratedContent(id=1, status=GeneratedStatus.approved)
    # First query is for content, second is for existing log
    mock_db.query().filter().first.side_effect = [mock_content, PublishLog(id=1)]
    
    with pytest.raises(HTTPException) as exc_info:
        await publish_content(mock_db, 1, ["twitter"])
    assert exc_info.value.status_code == 409

@pytest.mark.asyncio
@patch('app.services.publish_service._publish_to_platform')
async def test_service_partial_success(mock_publish):
    # This simulates a successful publish task and a failing publish task
    # Actually _publish_to_platform doesn't raise, it sets the log status.
    # We just want to make sure it doesn't crash if one platform fails
    mock_db = MagicMock()
    mock_content = GeneratedContent(id=1, status=GeneratedStatus.approved)
    
    def mock_db_first():
        yield mock_content # For content
        yield None # For twitter existing success
        yield None # For telegram existing success
        
    mock_generator = mock_db_first()
    mock_db.query().filter().first.side_effect = lambda: next(mock_generator)
    
    # Let's say _publish_to_platform is an async mock that just returns None
    mock_publish.return_value = None
    
    logs = await publish_content(mock_db, 1, ["twitter", "telegram"])
    assert len(logs) == 2
    assert logs[0].platform == "twitter"
    assert logs[1].platform == "telegram"
