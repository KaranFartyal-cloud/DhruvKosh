import sys
import os

# Add parent directory to path to import app modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app

# Vercel serverless function handler
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from mangum import Mangum

# Mangum adapter for ASGI apps to work with AWS Lambda/Vercel
handler = Mangum(app)

# Export for Vercel
__all__ = ["handler"]