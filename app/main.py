"""
app/main.py — AgroDrone Enhanced Entry Point
Wires all original + new modules. Backward compatible.
"""
import logging
import sys
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.db.database import init_db
from app.config import GEMINI_API_KEY

# ── Original routers (preserved) ──────────────────────────────────────────────
from app.api.dashboard_api import router as dashboard_router
from app.api.whatsapp_webhook import router as whatsapp_router

# ── New feature routers ────────────────────────────────────────────────────────
from app.api.battery_api import router as battery_router
from app.api.scheduling_api import router as scheduling_router
from app.api.tracking_api import router as tracking_router
from app.api.admin_api import router as admin_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("agrodrone")

app = FastAPI(
    title="AgroDrone SaaS Platform",
    description="Professional Agricultural Drone Service Management",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Include all routers ────────────────────────────────────────────────────────
app.include_router(dashboard_router)
app.include_router(whatsapp_router)
app.include_router(battery_router)
app.include_router(scheduling_router)
app.include_router(tracking_router)
app.include_router(admin_router)

# ── Static files ───────────────────────────────────────────────────────────────
static_path = Path(__file__).parent / "static"
dist_path   = static_path / "dist"

# Mount Vite build assets FIRST (must be before any broad /static mount)
dist_assets = dist_path / "assets"
if dist_assets.exists():
    app.mount("/assets", StaticFiles(directory=str(dist_assets)), name="spa_assets")

# Legacy static files (CSS/JS for old dashboard) — mounted under /static
legacy_static = static_path / "js"
if legacy_static.exists():
    app.mount("/static", StaticFiles(directory=str(static_path)), name="static")
elif static_path.exists():
    app.mount("/static", StaticFiles(directory=str(static_path)), name="static")

def _spa_response():
    """Return the peace-haven SPA index.html, or a helpful error if not built."""
    index = dist_path / "index.html"
    if index.exists():
        return FileResponse(str(index))
    return {"error": "Frontend not built yet. Run: cd peace-haven && npm install && npm run build"}

# ── SPA catch-all routes ───────────────────────────────────────────────────────
@app.get("/")
@app.get("/book")
@app.get("/track")
@app.get("/weather")
@app.get("/orders")
@app.get("/support")
@app.get("/login")
def serve_spa_root():
    return _spa_response()

@app.get("/admin")
@app.get("/admin/{path:path}")
def serve_spa_admin(path: str = ""):
    return _spa_response()

@app.get("/client")
@app.get("/client/{path:path}")
def serve_spa_client(path: str = ""):
    return _spa_response()

@app.on_event("startup")
def startup():
    logger.info("🚀 AgroDrone Platform v2.0 starting...")
    init_db()
    logger.info("✅ Database initialized")

    # Init AI service
    from app.services.ai_service import init_ai
    init_ai(GEMINI_API_KEY)

    # Seed default admin if none exists
    _seed_admin()
    logger.info("✅ AgroDrone Platform ready")

def _seed_admin():
    from app.db.database import SessionLocal
    from app.db.models import AdminUser
    from app.utils.auth import hash_password
    db = SessionLocal()
    try:
        if db.query(AdminUser).count() == 0:
            db.add(AdminUser(
                username="admin",
                password_hash=hash_password("agrodrone2024"),
                full_name="Administrator",
                role="admin",
            ))
            db.commit()
            logger.info("✅ Default admin created: admin / agrodrone2024")
    finally:
        db.close()
