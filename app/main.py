"""
app/main.py — AgroDrone Enhanced Entry Point v3
Works locally (with uvicorn) AND on Vercel (serverless).
"""
from __future__ import annotations

import logging
import os
import sys
from pathlib import Path

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import GEMINI_API_KEY

# ── Routers ────────────────────────────────────────────────────────────────────
from app.api.dashboard_api    import router as dashboard_router
from app.api.whatsapp_webhook import router as whatsapp_router
from app.api.battery_api      import router as battery_router
from app.api.scheduling_api   import router as scheduling_router
from app.api.tracking_api     import router as tracking_router
from app.api.admin_api        import router as admin_router

# ── Logging ────────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("agrodrone")

# ── Environment ────────────────────────────────────────────────────────────────
ENV           = os.environ.get("APP_ENV", "development")
IS_PRODUCTION = ENV == "production"
IS_VERCEL     = os.environ.get("VERCEL") == "1"

ALLOWED_ORIGINS = [o.strip() for o in os.environ.get(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"
).split(",") if o.strip()]

VERCEL_URL = os.environ.get("VERCEL_URL", "")
if VERCEL_URL and f"https://{VERCEL_URL}" not in ALLOWED_ORIGINS:
    ALLOWED_ORIGINS.append(f"https://{VERCEL_URL}")


# ── Security headers middleware ────────────────────────────────────────────────
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)
        response.headers["X-Content-Type-Options"]  = "nosniff"
        response.headers["X-Frame-Options"]          = "DENY"
        response.headers["X-XSS-Protection"]         = "1; mode=block"
        response.headers["Referrer-Policy"]          = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"]       = "geolocation=(), microphone=(), camera=()"
        if IS_PRODUCTION or IS_VERCEL:
            response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload"
        return response


# ── Rate limiting ──────────────────────────────────────────────────────────────
try:
    from slowapi import Limiter, _rate_limit_exceeded_handler
    from slowapi.util import get_remote_address
    from slowapi.errors import RateLimitExceeded
    from slowapi.middleware import SlowAPIMiddleware
    limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])
    RATE_LIMIT_AVAILABLE = True
    logger.info("✅ Rate limiting enabled (slowapi)")
except ImportError:
    limiter = None
    RATE_LIMIT_AVAILABLE = False
    logger.warning("⚠️  slowapi not installed — rate limiting disabled.")


# ── FastAPI app ────────────────────────────────────────────────────────────────
app = FastAPI(
    title="AgroDrone SaaS Platform",
    description="Professional Agricultural Drone Service Management — Peace Haven",
    version="3.0.0",
    docs_url=None if (IS_PRODUCTION or IS_VERCEL) else "/docs",
    redoc_url=None if (IS_PRODUCTION or IS_VERCEL) else "/redoc",
    openapi_url=None if (IS_PRODUCTION or IS_VERCEL) else "/openapi.json",
)

# ── Middleware ─────────────────────────────────────────────────────────────────
app.add_middleware(SecurityHeadersMiddleware)

if RATE_LIMIT_AVAILABLE:
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS if (IS_PRODUCTION or IS_VERCEL) else ["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Requested-With"],
    max_age=600,
)

# ── Routers ────────────────────────────────────────────────────────────────────
app.include_router(dashboard_router)
app.include_router(whatsapp_router)
app.include_router(battery_router)
app.include_router(scheduling_router)
app.include_router(tracking_router)
app.include_router(admin_router)


# ── Static files (local dev only) ─────────────────────────────────────────────
if not IS_VERCEL:
    static_path = Path(__file__).parent / "static"
    dist_path   = static_path / "dist"

    dist_assets = dist_path / "assets"
    if dist_assets.exists():
        app.mount("/assets", StaticFiles(directory=str(dist_assets)), name="spa_assets")

    dist_videos = dist_path / "videos"
    if dist_videos.exists():
        app.mount("/videos", StaticFiles(directory=str(dist_videos)), name="spa_videos")

    @app.get("/peace-haven-logo.png", include_in_schema=False)
    async def serve_logo():
        logo_path = dist_path / "peace-haven-logo.png"
        if logo_path.exists():
            return FileResponse(str(logo_path), media_type="image/png")
        return JSONResponse({"error": "Logo not found"}, status_code=404)

    if static_path.exists():
        app.mount("/static", StaticFiles(directory=str(static_path)), name="static")

    def _spa_response():
        index = dist_path / "index.html"
        if index.exists():
            return FileResponse(str(index))
        return JSONResponse(status_code=503, content={"error": "Frontend not built."})

    @app.get("/")
    @app.get("/book")
    @app.get("/track")
    @app.get("/weather")
    @app.get("/orders")
    @app.get("/support")
    @app.get("/profile")
    def serve_spa_client_routes():
        return _spa_response()

    @app.get("/login")
    @app.get("/admin/login")
    @app.get("/client/login")
    def serve_spa_auth_routes():
        return _spa_response()

    @app.get("/admin")
    @app.get("/admin/{path:path}")
    def serve_spa_admin(path: str = ""):
        return _spa_response()

    @app.get("/client")
    @app.get("/client/{path:path}")
    def serve_spa_client(path: str = ""):
        return _spa_response()


# ── Health check ───────────────────────────────────────────────────────────────
@app.get("/health", tags=["System"])
def health_check():
    return {
        "status": "ok",
        "version": "3.0.0",
        "env": ENV,
        "platform": "vercel" if IS_VERCEL else "local",
    }


# ── DB init + seed — runs once on startup ─────────────────────────────────────
def _init_and_seed():
    """Initialize DB tables then seed default admin. Safe to call multiple times."""
    from app.db.database import init_db, SessionLocal
    from app.db.models import AdminUser
    from app.utils.auth import hash_password
    import sqlalchemy

    # 1. Create all tables first
    try:
        init_db()
        logger.info("✅ Database initialized")
    except Exception as e:
        logger.error("❌ Database init failed: %s", e)
        raise

    # 2. Seed admin only after tables exist — wrapped in its own try/except
    db = SessionLocal()
    try:
        count = db.query(AdminUser).count()
        if count == 0:
            db.add(AdminUser(
                username="admin",
                password_hash=hash_password("agrodrone2024"),
                full_name="Administrator",
                role="superadmin",
            ))
            db.commit()
            logger.info("✅ Default admin seeded — username: admin")
        else:
            logger.info("✅ Admin users already exist (%d)", count)
    except sqlalchemy.exc.ProgrammingError as e:
        # Tables might not exist yet on very first cold start race condition
        logger.warning("⚠️  Admin seed skipped (table not ready): %s", e)
        db.rollback()
    except Exception as e:
        logger.error("❌ Admin seed failed: %s", e)
        db.rollback()
    finally:
        db.close()


# ── Startup event ──────────────────────────────────────────────────────────────
@app.on_event("startup")
def startup():
    logger.info("🚀 AgroDrone Platform v3.0 starting... [env=%s, vercel=%s]", ENV, IS_VERCEL)

    _init_and_seed()

    from app.services.ai_service import init_ai
    init_ai(GEMINI_API_KEY)

    logger.info("✅ AgroDrone Platform ready")


# ── Vercel: also run init at module import time ────────────────────────────────
# On Vercel, startup events may not fire reliably on cold starts.
# Running init at import ensures tables exist before any request hits.
if IS_VERCEL:
    try:
        _init_and_seed()
        from app.services.ai_service import init_ai
        init_ai(GEMINI_API_KEY)
        logger.info("✅ Vercel cold-start init complete")
    except Exception as e:
        logger.error("❌ Vercel cold-start init failed: %s", e)