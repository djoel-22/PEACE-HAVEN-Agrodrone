"""
api/admin_api.py — Admin portal endpoints (Feature 2)
Auth + dashboard summary + drone management
"""
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import (AdminUser, ServiceRequest, Customer, Drone,
                            DroneBattery, ServiceStatus, DroneStatus, AILog)
from app.utils.auth import hash_password, verify_password, create_token, verify_token

router = APIRouter(prefix="/api/admin", tags=["Admin"])


# ── Auth ─────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    username: str
    password: str

class AdminCreate(BaseModel):
    username: str
    password: str
    full_name: str
    role: str = "admin"


def require_admin(authorization: str = Header(None), db: Session = Depends(get_db)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")
    token = authorization.split(" ", 1)[1]
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Token expired or invalid")
    return payload


@router.post("/login")
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(AdminUser).filter(AdminUser.username == body.username).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account disabled")
    user.last_login = datetime.utcnow()
    db.commit()
    token = create_token(user.id, user.username, user.role)
    return {"token": token, "username": user.username, "full_name": user.full_name, "role": user.role}


@router.post("/users")
def create_admin(body: AdminCreate, db: Session = Depends(get_db)):
    """Create admin user — first user can be created without auth."""
    existing = db.query(AdminUser).count()
    if existing == 0:
        pass  # allow first user creation
    user = db.query(AdminUser).filter(AdminUser.username == body.username).first()
    if user:
        raise HTTPException(status_code=400, detail="Username already exists")
    new_user = AdminUser(
        username=body.username,
        password_hash=hash_password(body.password),
        full_name=body.full_name,
        role=body.role,
    )
    db.add(new_user)
    db.commit()
    return {"id": new_user.id, "username": new_user.username, "role": new_user.role}


@router.get("/me")
def get_me(payload: dict = Depends(require_admin)):
    return payload


# ── Dashboard Summary ─────────────────────────────────────────────────────────

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

    # Battery alerts
    critical_batteries = db.query(DroneBattery).filter(
        DroneBattery.health_percentage < 25).count()
    warning_batteries = db.query(DroneBattery).filter(
        DroneBattery.health_percentage >= 25,
        DroneBattery.health_percentage < 50).count()

    # Today's orders
    today = datetime.utcnow().date()
    today_orders = db.query(ServiceRequest).filter(
        func.date(ServiceRequest.created_date) == today).count()

    # Recent AI usage
    ai_calls_today = db.query(AILog).filter(
        func.date(AILog.created_at) == today).count()

    return {
        "total_orders": total_orders,
        "pending": pending,
        "in_progress": in_progress,
        "completed": completed,
        "total_revenue": round(total_revenue, 2),
        "total_farmers": total_farmers,
        "total_drones": total_drones,
        "active_drones": active_drones,
        "today_orders": today_orders,
        "critical_batteries": critical_batteries,
        "warning_batteries": warning_batteries,
        "ai_calls_today": ai_calls_today,
    }


# ── Drone Management ──────────────────────────────────────────────────────────

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
        "id": d.id,
        "drone_id": d.drone_id,
        "model": d.model or "",
        "status": d.status.value if d.status else "standby",
        "pilot_name": d.pilot_name or "",
        "current_location": d.current_location or "",
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
    drones = db.query(Drone).all()
    return {"drones": [_drone_dict(d) for d in drones]}


@router.post("/drones")
def create_drone(body: DroneCreate, db: Session = Depends(get_db)):
    if db.query(Drone).filter(Drone.drone_id == body.drone_id).first():
        raise HTTPException(status_code=400, detail="Drone ID already exists")
    try:
        status = DroneStatus(body.status)
    except ValueError:
        status = DroneStatus.STANDBY
    drone = Drone(
        drone_id=body.drone_id,
        model=body.model,
        pilot_name=body.pilot_name,
        current_location=body.current_location,
        status=status,
        notes=body.notes,
    )
    db.add(drone)
    db.commit()
    db.refresh(drone)
    # Auto-create battery record
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


# ── AI Logs ───────────────────────────────────────────────────────────────────

@router.get("/ai-logs")
def list_ai_logs(limit: int = 50, db: Session = Depends(get_db)):
    logs = db.query(AILog).order_by(AILog.created_at.desc()).limit(limit).all()
    return {
        "logs": [
            {
                "id": l.id, "phone": l.phone, "prompt": l.prompt[:100] if l.prompt else "",
                "response": l.response[:200] if l.response else "",
                "model": l.model, "intent": l.intent,
                "latency_ms": l.latency_ms, "error": l.error,
                "created_at": l.created_at.isoformat() if l.created_at else None,
            }
            for l in logs
        ]
    }
