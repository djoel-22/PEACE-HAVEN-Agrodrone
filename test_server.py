#!/usr/bin/env python3
"""Run this to test if the server works: python test_server.py"""
import sys

print("Python:", sys.version)

missing = []
for pkg in ['fastapi','uvicorn','sqlalchemy','pydantic']:
    try:
        __import__(pkg)
        print(f"✅ {pkg} installed")
    except ImportError:
        print(f"❌ {pkg} MISSING")
        missing.append(pkg)

if missing:
    print(f"\n⚠️  Run: pip install {' '.join(missing)}")
    sys.exit(1)

# Test DB
from app.db.database import init_db, SessionLocal
from app.db.models import Customer, ServiceRequest, Drone
init_db()
db = SessionLocal()
print(f"\n✅ DB: {db.query(Customer).count()} customers, {db.query(Drone).count()} drones")
db.close()

# Test API can be imported
from app.api.dashboard_api import router
print("✅ dashboard_api imports OK")
from app.api.whatsapp_webhook import router as wa
print("✅ whatsapp_webhook imports OK")
from app.main import app
print("✅ main app imports OK")
print("\n✅ ALL OK - run: python -m uvicorn app.main:app --reload --port 8000")
