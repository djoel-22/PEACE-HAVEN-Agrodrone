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

from app.db.database import init_db
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

# On Vercel, add the production domain automatically
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


# ── Static files (local dev only — Vercel serves these via vercel.json routes) ─
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

    # ── SPA catch-all (local only) ─────────────────────────────────────────────
    def _spa_response():
        index = dist_path / "index.html"
        if index.exists():
            return FileResponse(str(index))
        return JSONResponse(
            status_code=503,
            content={"error": "Frontend not built. Run: cd peace-haven && npm run build"},
        )

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


# ── Startup ────────────────────────────────────────────────────────────────────
@app.on_event("startup")
def startup():
    logger.info("🚀 AgroDrone Platform v3.0 starting... [env=%s, vercel=%s]", ENV, IS_VERCEL)
    init_db()
    logger.info("✅ Database initialized")

    from app.services.ai_service import init_ai
    init_ai(GEMINI_API_KEY)

    _seed_admin()
    logger.info("✅ AgroDrone Platform ready")


def _seed_admin():
    """Create default admin account if none exists."""
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
                role="superadmin",
            ))
            db.commit()
            logger.info("✅ Default admin seeded — username: admin | Change password on first login!")
    finally:
        db.close()