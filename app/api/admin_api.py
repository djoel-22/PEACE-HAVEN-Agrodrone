"""
app/api/admin_api.py — Admin portal endpoints (v3)
Production-grade auth: bcrypt + PyJWT, refresh token rotation,
account lockout, rate-limit headers, role guard, audit logging.
All original endpoints (summary, drones, ai-logs) preserved unchanged.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional

import bcrypt
from fastapi import APIRouter, Depends, HTTPException, Header, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import (
    AdminUser, ClientUser, ServiceRequest, Customer, Drone,
    DroneBattery, ServiceStatus, DroneStatus, AILog,
)
from app.utils.auth import (
    hash_password, verify_password,
    create_token, verify_token,
    create_refresh_token, verify_refresh_token,
)

logger = logging.getLogger("agrodrone-auth")

router = APIRouter(prefix="/api/admin", tags=["Admin"])

MAX_FAILED_ATTEMPTS = 5
LOCKOUT_MINUTES     = 15


class LoginRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=80)
    password: str = Field(..., min_length=1, max_length=128)

class RefreshRequest(BaseModel):
    refresh_token: str

class AdminCreate(BaseModel):
    username:  str = Field(..., min_length=3, max_length=80)
    password:  str = Field(..., min_length=8, max_length=128)
    full_name: str = Field(..., min_length=1, max_length=120)
    role:      str = Field(default="admin", pattern="^(admin|superadmin)$")

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password:     str = Field(..., min_length=8, max_length=128)


def require_admin(
    authorization: str = Header(None),
    db: Session = Depends(get_db),
) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = authorization.split(" ", 1)[1]
    payload = verify_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired or invalid",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if payload.get("portal") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin portal access required",
        )
    user = db.query(AdminUser).filter(AdminUser.id == int(payload["sub"])).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account disabled")
    return payload


def require_superadmin(payload: dict = Depends(require_admin)) -> dict:
    if payload.get("role") != "superadmin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Superadmin access required")
    return payload


def _check_lockout(user: AdminUser) -> None:
    if user.locked_until and datetime.now(timezone.utc) < user.locked_until.replace(tzinfo=timezone.utc):
        remaining = int((user.locked_until.replace(tzinfo=timezone.utc) - datetime.now(timezone.utc)).total_seconds() // 60) + 1
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Account locked due to too many failed attempts. Try again in {remaining} minute(s).",
            headers={"Retry-After": str(remaining * 60)},
        )


def _record_failed_login(user: AdminUser, db: Session) -> None:
    user.failed_login_attempts = (user.failed_login_attempts or 0) + 1
    if user.failed_login_attempts >= MAX_FAILED_ATTEMPTS:
        from datetime import timedelta
        user.locked_until = datetime.now(timezone.utc) + timedelta(minutes=LOCKOUT_MINUTES)
        logger.warning("Admin account '%s' locked after %d failed attempts", user.username, user.failed_login_attempts)
    db.commit()


def _record_successful_login(user: AdminUser, db: Session, ip: str | None) -> None:
    user.failed_login_attempts = 0
    user.locked_until  = None
    user.last_login    = datetime.now(timezone.utc)
    user.last_login_ip = ip
    db.commit()


def _bcrypt_hash(token: str) -> str:
    """Hash a token with bcrypt, truncating to 72 bytes (bcrypt limit)."""
    return bcrypt.hashpw(token.encode()[:72], bcrypt.gensalt(rounds=10)).decode()


def _bcrypt_check(token: str, hashed: str) -> bool:
    """Verify a token against a bcrypt hash, truncating to 72 bytes."""
    return bcrypt.checkpw(token.encode()[:72], hashed.encode())


@router.post("/login", summary="Admin portal login")
def login(body: LoginRequest, request: Request, db: Session = Depends(get_db)):
    _INVALID = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    user = db.query(AdminUser).filter(AdminUser.username == body.username).first()
    if not user:
        raise _INVALID

    _check_lockout(user)

    if not verify_password(body.password, user.password_hash):
        _record_failed_login(user, db)
        raise _INVALID

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account disabled")

    if len(user.password_hash) == 64:
        user.password_hash = hash_password(body.password)
        db.commit()
        logger.info("Upgraded password hash for admin '%s' to bcrypt", user.username)

    client_ip = request.client.host if request.client else None
    _record_successful_login(user, db, client_ip)

    access_token  = create_token(user.id, user.username, user.role, portal="admin")
    refresh_token = create_refresh_token(user.id, user.username, user.role, portal="admin")

    user.refresh_token_hash = _bcrypt_hash(refresh_token)
    db.commit()

    logger.info("Admin login: user='%s' ip='%s'", user.username, client_ip)

    return {
        "access_token":  access_token,
        "refresh_token": refresh_token,
        "token_type":    "bearer",
        "expires_in":    1800,
        "username":      user.username,
        "full_name":     user.full_name,
        "role":          user.role,
        "portal":        "admin",
        "token":         access_token,
    }


@router.post("/refresh", summary="Rotate access + refresh tokens")
def refresh_tokens(body: RefreshRequest, db: Session = Depends(get_db)):
    payload = verify_refresh_token(body.refresh_token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token")

    user = db.query(AdminUser).filter(AdminUser.id == int(payload["sub"])).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account not found or disabled")

    if not user.refresh_token_hash or not _bcrypt_check(body.refresh_token, user.refresh_token_hash):
        user.refresh_token_hash = None
        user.token_version = (user.token_version or 0) + 1
        db.commit()
        logger.warning("Refresh token reuse detected for admin '%s' — all sessions invalidated", user.username)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token reuse detected. Please log in again.")

    new_access  = create_token(user.id, user.username, user.role, portal="admin")
    new_refresh = create_refresh_token(user.id, user.username, user.role, portal="admin")

    user.refresh_token_hash = _bcrypt_hash(new_refresh)
    db.commit()

    return {
        "access_token":  new_access,
        "refresh_token": new_refresh,
        "token_type":    "bearer",
        "expires_in":    1800,
        "token":         new_access,
    }


@router.post("/logout", summary="Invalidate current session")
def logout(payload: dict = Depends(require_admin), db: Session = Depends(get_db)):
    user = db.query(AdminUser).filter(AdminUser.id == int(payload["sub"])).first()
    if user:
        user.refresh_token_hash = None
        user.token_version = (user.token_version or 0) + 1
        db.commit()
    return {"message": "Logged out successfully"}


@router.post("/change-password", summary="Change admin password")
def change_password(
    body: ChangePasswordRequest,
    payload: dict = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = db.query(AdminUser).filter(AdminUser.id == int(payload["sub"])).first()
    if not user or not verify_password(body.current_password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Current password incorrect")
    user.password_hash      = hash_password(body.new_password)
    user.refresh_token_hash = None
    user.token_version      = (user.token_version or 0) + 1
    db.commit()
    return {"message": "Password changed successfully. Please log in again."}


@router.post("/users", summary="Create admin user")
def create_admin(body: AdminCreate, db: Session = Depends(get_db)):
    if db.query(AdminUser).filter(AdminUser.username == body.username).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already exists")
    new_user = AdminUser(
        username=body.username,
        password_hash=hash_password(body.password),
        full_name=body.full_name,
        role=body.role,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"id": new_user.id, "username": new_user.username, "role": new_user.role}


@router.get("/me", summary="Get current admin profile")
def get_me(payload: dict = Depends(require_admin), db: Session = Depends(get_db)):
    user = db.query(AdminUser).filter(AdminUser.id == int(payload["sub"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "id":        user.id,
        "username":  user.username,
        "full_name": user.full_name,
        "role":      user.role,
        "portal":    "admin",
        "last_login": user.last_login.isoformat() if user.last_login else None,
    }


class ClientLoginRequest(BaseModel):
    phone_number: str = Field(..., min_length=10, max_length=20)
    password:     str = Field(..., min_length=1, max_length=128)

class ClientRegisterRequest(BaseModel):
    phone_number: str = Field(..., min_length=10, max_length=20)
    full_name:    str = Field(..., min_length=1, max_length=120)
    password:     str = Field(..., min_length=8, max_length=128)
    email:        Optional[str] = None


@router.post("/client/register", tags=["Client Auth"], summary="Register client (farmer) account")
def client_register(body: ClientRegisterRequest, db: Session = Depends(get_db)):
    if db.query(ClientUser).filter(ClientUser.phone_number == body.phone_number).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Phone number already registered")
    if body.email and db.query(ClientUser).filter(ClientUser.email == body.email).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    user = ClientUser(
        phone_number  = body.phone_number,
        full_name     = body.full_name,
        password_hash = hash_password(body.password),
        email         = body.email,
        is_active     = True,
        is_verified   = False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    logger.info("New client registered: phone='%s'", body.phone_number)
    return {"message": "Account created successfully. You can now log in.", "id": user.id}


@router.post("/client/login", tags=["Client Auth"], summary="Client (farmer) portal login")
def client_login(body: ClientLoginRequest, request: Request, db: Session = Depends(get_db)):
    _INVALID = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    user = db.query(ClientUser).filter(ClientUser.phone_number == body.phone_number).first()
    if not user:
        raise _INVALID

    if user.locked_until and datetime.now(timezone.utc) < user.locked_until.replace(tzinfo=timezone.utc):
        remaining = int((user.locked_until.replace(tzinfo=timezone.utc) - datetime.now(timezone.utc)).total_seconds() // 60) + 1
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Account locked. Try again in {remaining} minute(s).",
            headers={"Retry-After": str(remaining * 60)},
        )

    if not verify_password(body.password, user.password_hash):
        user.failed_login_attempts = (user.failed_login_attempts or 0) + 1
        if user.failed_login_attempts >= MAX_FAILED_ATTEMPTS:
            from datetime import timedelta
            user.locked_until = datetime.now(timezone.utc) + timedelta(minutes=LOCKOUT_MINUTES)
        db.commit()
        raise _INVALID

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account disabled")

    user.failed_login_attempts = 0
    user.locked_until  = None
    user.last_login    = datetime.now(timezone.utc)
    user.last_login_ip = request.client.host if request.client else None
    db.commit()

    access_token  = create_token(user.id, user.phone_number, "client", portal="client")
    refresh_token = create_refresh_token(user.id, user.phone_number, "client", portal="client")

    user.refresh_token_hash = _bcrypt_hash(refresh_token)
    db.commit()

    return {
        "access_token":  access_token,
        "refresh_token": refresh_token,
        "token_type":    "bearer",
        "expires_in":    1800,
        "phone_number":  user.phone_number,
        "full_name":     user.full_name,
        "portal":        "client",
        "token":         access_token,
    }


@router.post("/client/refresh", tags=["Client Auth"], summary="Rotate client tokens")
def client_refresh(body: RefreshRequest, db: Session = Depends(get_db)):
    payload = verify_refresh_token(body.refresh_token)
    if not payload or payload.get("portal") != "client":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token")

    user = db.query(ClientUser).filter(ClientUser.id == int(payload["sub"])).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account not found or disabled")

    if not user.refresh_token_hash or not _bcrypt_check(body.refresh_token, user.refresh_token_hash):
        user.refresh_token_hash = None
        user.token_version = (user.token_version or 0) + 1
        db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token reuse detected. Please log in again.")

    new_access  = create_token(user.id, user.phone_number, "client", portal="client")
    new_refresh = create_refresh_token(user.id, user.phone_number, "client", portal="client")
    user.refresh_token_hash = _bcrypt_hash(new_refresh)
    db.commit()

    return {
        "access_token":  new_access,
        "refresh_token": new_refresh,
        "token_type":    "bearer",
        "expires_in":    1800,
        "token":         new_access,
    }


@router.post("/client/logout", tags=["Client Auth"])
def client_logout(authorization: str = Header(None), db: Session = Depends(get_db)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    payload = verify_token(authorization.split(" ", 1)[1])
    if payload and payload.get("portal") == "client":
        user = db.query(ClientUser).filter(ClientUser.id == int(payload["sub"])).first()
        if user:
            user.refresh_token_hash = None
            db.commit()
    return {"message": "Logged out successfully"}


@router.get("/summary")
def dashboard_summary(db: Session = Depends(get_db)):
    total_orders   = db.query(ServiceRequest).count()
    pending        = db.query(ServiceRequest).filter(ServiceRequest.status == ServiceStatus.PENDING).count()
    in_progress    = db.query(ServiceRequest).filter(ServiceRequest.status == ServiceStatus.IN_PROGRESS).count()
    completed      = db.query(ServiceRequest).filter(ServiceRequest.status == ServiceStatus.COMPLETED).count()
    total_revenue  = db.query(func.sum(ServiceRequest.estimated_cost)).filter(
                         ServiceRequest.status == ServiceStatus.COMPLETED).scalar() or 0
    total_farmers  = db.query(Customer).count()
    total_drones   = db.query(Drone).count()
    active_drones  = db.query(Drone).filter(Drone.status == DroneStatus.ACTIVE).count()
    critical_batteries = db.query(DroneBattery).filter(DroneBattery.health_percentage < 25).count()
    warning_batteries  = db.query(DroneBattery).filter(
        DroneBattery.health_percentage >= 25, DroneBattery.health_percentage < 50).count()
    today = datetime.utcnow().date()
    today_orders   = db.query(ServiceRequest).filter(func.date(ServiceRequest.created_date) == today).count()
    ai_calls_today = db.query(AILog).filter(func.date(AILog.created_at) == today).count()

    return {
        "total_orders": total_orders, "pending": pending,
        "in_progress": in_progress, "completed": completed,
        "total_revenue": round(total_revenue, 2), "total_farmers": total_farmers,
        "total_drones": total_drones, "active_drones": active_drones,
        "today_orders": today_orders, "critical_batteries": critical_batteries,
        "warning_batteries": warning_batteries, "ai_calls_today": ai_calls_today,
    }


class DroneCreate(BaseModel):
    drone_id: str
    model: str
    pilot_name: Optional[str] = ""
    current_location: Optional[str] = ""
    status: Optional[str] = "standby"
    notes: Optional[str] = ""

class DroneUpdate(BaseModel):
    model: Optional[str] = None
    pilot_name: Optional[str] = None
    current_location: Optional[str] = None
    status: Optional[str] = None
    battery_level: Optional[int] = None
    notes: Optional[str] = None


def _drone_dict(d: Drone) -> dict:
    return {
        "id": d.id, "drone_id": d.drone_id, "model": d.model or "",
        "status": d.status.value if d.status else "standby",
        "pilot_name": d.pilot_name or "", "current_location": d.current_location or "",
        "battery_level": d.battery_level or 100,
        "flight_hours_today": round(d.flight_hours_today or 0, 1),
        "total_flight_hours": round(d.total_flight_hours or 0, 1),
        "last_maintenance": d.last_maintenance.isoformat() if d.last_maintenance else None,
        "next_maintenance": d.next_maintenance.isoformat() if d.next_maintenance else None,
        "notes": d.notes or "",
        "registered_at": d.registered_at.isoformat() if d.registered_at else None,
    }


@router.get("/drones")
def list_drones(db: Session = Depends(get_db)):
    return {"drones": [_drone_dict(d) for d in db.query(Drone).all()]}


@router.post("/drones")
def create_drone(body: DroneCreate, db: Session = Depends(get_db)):
    if db.query(Drone).filter(Drone.drone_id == body.drone_id).first():
        raise HTTPException(status_code=400, detail="Drone ID already exists")
    try:
        drone_status = DroneStatus(body.status)
    except ValueError:
        drone_status = DroneStatus.STANDBY
    drone = Drone(
        drone_id=body.drone_id, model=body.model, pilot_name=body.pilot_name,
        current_location=body.current_location, status=drone_status, notes=body.notes,
    )
    db.add(drone)
    db.commit()
    db.refresh(drone)
    from app.services.battery_service import get_or_create_battery
    get_or_create_battery(drone, db)
    db.commit()
    return _drone_dict(drone)


@router.put("/drones/{drone_id}")
def update_drone(drone_id: str, body: DroneUpdate, db: Session = Depends(get_db)):
    drone = db.query(Drone).filter(Drone.drone_id == drone_id).first()
    if not drone:
        raise HTTPException(status_code=404, detail="Drone not found")
    if body.model is not None:            drone.model = body.model
    if body.pilot_name is not None:       drone.pilot_name = body.pilot_name
    if body.current_location is not None: drone.current_location = body.current_location
    if body.battery_level is not None:    drone.battery_level = body.battery_level
    if body.notes is not None:            drone.notes = body.notes
    if body.status is not None:
        try:
            drone.status = DroneStatus(body.status)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid status: {body.status}")
    db.commit()
    db.refresh(drone)
    return _drone_dict(drone)


@router.get("/ai-logs")
def list_ai_logs(limit: int = 50, db: Session = Depends(get_db)):
    logs = db.query(AILog).order_by(AILog.created_at.desc()).limit(limit).all()
    return {
        "logs": [
            {
                "id": l.id, "phone": l.phone,
                "prompt": l.prompt[:100] if l.prompt else "",
                "response": l.response[:200] if l.response else "",
                "model": l.model, "intent": l.intent,
                "latency_ms": l.latency_ms, "error": l.error,
                "created_at": l.created_at.isoformat() if l.created_at else None,
            }
            for l in logs
        ]
    }