"""
Vercel serverless entrypoint. Expose the FastAPI app at one of the supported
paths (index.py) so Vercel can run it as a single serverless function.
"""
from app.main import app

__all__ = ["app"]
