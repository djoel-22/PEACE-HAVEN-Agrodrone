# api/index.py — Vercel serverless entrypoint
# Vercel scans for FastAPI apps in api/index.py, api/app.py, etc.
# This file simply re-exports the FastAPI `app` object from your existing package.

import sys
import os

# Make sure the project root is on sys.path so `from app.main import app` works
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app  # noqa: F401  ← this is what Vercel picks up
