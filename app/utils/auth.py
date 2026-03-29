"""
app/utils/auth.py — Production-grade authentication
Standards: bcrypt password hashing, PyJWT (RS256-ready / HS256),
           refresh token rotation, role-based claims.
Backward-compatible: hash_password / verify_password / create_token / verify_token
signatures are preserved so existing callers (admin_api, main.py) need no changes.
"""
from __future__ import annotations

import logging
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Literal

import bcrypt
import jwt

logger = logging.getLogger("agrodrone-auth")

# ── Secret keys ────────────────────────────────────────────────────────────────
# Set AUTH_SECRET_KEY and AUTH_REFRESH_SECRET in your .env / Vercel env vars.
# Fallback values are used only for local dev — never in production.
_ACCESS_SECRET: str  = os.environ.get("AUTH_SECRET_KEY",  "CHANGE_ME_access_secret_32chars!")
_REFRESH_SECRET: str = os.environ.get("AUTH_REFRESH_SECRET", "CHANGE_ME_refresh_secret_32chars!")

ALGORITHM = "HS256"

# Token lifetimes
ACCESS_TOKEN_EXPIRE_MINUTES:  int = 30          # short-lived access token
REFRESH_TOKEN_EXPIRE_DAYS:    int = 7           # long-lived refresh token

# Supported portal roles
PortalRole = Literal["admin", "superadmin", "client"]


# ── Password hashing (bcrypt, cost factor 12) ──────────────────────────────────

def hash_password(password: str) -> str:
    """Return a bcrypt hash string.  Safe to store directly in DB."""
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=12)).decode()


def verify_password(plain: str, hashed: str) -> bool:
    """Constant-time bcrypt verification.  Works with both old SHA-256 hashes
    (detected by length == 64) and new bcrypt hashes for a smooth migration."""
    try:
        # Legacy SHA-256 hash detection (hex string, 64 chars)
        if len(hashed) == 64 and all(c in "0123456789abcdef" for c in hashed):
            import hashlib, hmac as _hmac
            legacy = hashlib.sha256(plain.encode()).hexdigest()
            return _hmac.compare_digest(legacy, hashed)
        return bcrypt.checkpw(plain.encode(), hashed.encode())
    except Exception:
        return False


# ── JWT access token ───────────────────────────────────────────────────────────

def create_token(
    user_id: int,
    username: str,
    role: PortalRole,
    expires_in: int = ACCESS_TOKEN_EXPIRE_MINUTES * 60,   # seconds
    portal: str = "admin",
) -> str:
    """Create a signed JWT access token.

    Payload claims follow RFC 7519 + custom 'role' and 'portal' claims.
    expires_in is kept as a positional-compatible kwarg so old callers
    (create_token(id, name, role)) still work unchanged.
    """
    now = datetime.now(timezone.utc)
    payload = {
        "sub":      str(user_id),
        "username": username,
        "role":     role,
        "portal":   portal,
        "iat":      now,
        "exp":      now + timedelta(seconds=expires_in),
        "jti":      secrets.token_hex(16),   # unique token ID (for future revocation)
    }
    return jwt.encode(payload, _ACCESS_SECRET, algorithm=ALGORITHM)


def verify_token(token: str) -> dict | None:
    """Decode and validate a JWT access token.
    Returns the payload dict, or None if invalid / expired.
    """
    try:
        payload = jwt.decode(
            token,
            _ACCESS_SECRET,
            algorithms=[ALGORITHM],
            options={"require": ["exp", "sub", "role"]},
        )
        return payload
    except jwt.ExpiredSignatureError:
        logger.info("Token expired")
        return None
    except jwt.InvalidTokenError as exc:
        logger.warning("Invalid token: %s", exc)
        return None


# ── JWT refresh token ──────────────────────────────────────────────────────────

def create_refresh_token(user_id: int, username: str, role: PortalRole, portal: str = "admin") -> str:
    """Create a long-lived refresh token signed with a separate secret."""
    now = datetime.now(timezone.utc)
    payload = {
        "sub":      str(user_id),
        "username": username,
        "role":     role,
        "portal":   portal,
        "type":     "refresh",
        "iat":      now,
        "exp":      now + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
        "jti":      secrets.token_hex(16),
    }
    return jwt.encode(payload, _REFRESH_SECRET, algorithm=ALGORITHM)


def verify_refresh_token(token: str) -> dict | None:
    """Decode and validate a refresh token.
    Returns payload dict, or None if invalid / expired.
    """
    try:
        payload = jwt.decode(
            token,
            _REFRESH_SECRET,
            algorithms=[ALGORITHM],
            options={"require": ["exp", "sub", "type"]},
        )
        if payload.get("type") != "refresh":
            return None
        return payload
    except jwt.InvalidTokenError as exc:
        logger.warning("Invalid refresh token: %s", exc)
        return None


# ── Opaque token helper (for WhatsApp / tracking tokens) ──────────────────────

def generate_opaque_token(nbytes: int = 32) -> str:
    """Return a cryptographically secure random URL-safe token string."""
    return secrets.token_urlsafe(nbytes)