# api/index.py — Vercel serverless entrypoint
# Vercel picks up the `app` FastAPI object from this file.

import sys
import os

# Ensure project root is on sys.path so `from app.main import app` works
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Load .env only in local dev — on Vercel, env vars are set in the dashboard
if os.environ.get("VERCEL") != "1":
    try:
        from dotenv import load_dotenv
        load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))
    except ImportError:
        pass

from app.main import app  # noqa: F401  ← Vercel picks this up as the ASGI handler