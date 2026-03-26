"""
services/tracking_service.py — Order Tracking (Feature 4)
"""
import secrets
from datetime import datetime
from sqlalchemy.orm import Session
from app.db.models import ServiceRequest, ServiceStatus, Customer
import logging

logger = logging.getLogger("agrodrone-tracking")

STATUS_STEPS = [
    ServiceStatus.PENDING,
    ServiceStatus.SCHEDULED,
    ServiceStatus.IN_PROGRESS,
    ServiceStatus.COMPLETED,
]

STATUS_LABELS = {
    "pending":     "Order Placed",
    "scheduled":   "Scheduled",
    "in_progress": "In Progress",
    "completed":   "Completed",
    "cancelled":   "Cancelled",
}

STATUS_ICONS = {
    "pending":     "📋",
    "scheduled":   "📅",
    "in_progress": "🚁",
    "completed":   "✅",
    "cancelled":   "❌",
}

def generate_token() -> str:
    return secrets.token_urlsafe(16)

def ensure_token(req: ServiceRequest, db: Session) -> str:
    if not req.tracking_token:
        req.tracking_token = generate_token()
        db.commit()
    return req.tracking_token

def get_by_token(token: str, db: Session):
    return db.query(ServiceRequest).filter(ServiceRequest.tracking_token == token).first()

def get_by_booking_id(booking_id: str, db: Session):
    """booking_id like AGR0042"""
    try:
        rid = int(booking_id.upper().replace("AGR", "").lstrip("0") or "0")
        return db.query(ServiceRequest).filter(ServiceRequest.id == rid).first()
    except ValueError:
        return None

def update_status(req_id: int, new_status: str, note: str, db: Session, actor: str = "admin") -> dict:
    req = db.query(ServiceRequest).filter(ServiceRequest.id == req_id).first()
    if not req:
        return {"error": "Order not found"}

    old_status = req.status.value if req.status else "unknown"
    try:
        req.status = ServiceStatus(new_status)
    except ValueError:
        return {"error": f"Invalid status: {new_status}"}

    history = req.status_history or []
    history.append({
        "status": new_status,
        "old_status": old_status,
        "note": note or "",
        "actor": actor,
        "timestamp": datetime.utcnow().isoformat(),
    })
    req.status_history = history

    if new_status == "completed":
        req.completed_date = datetime.utcnow()

    db.commit()
    logger.info(f"Order #{req_id}: {old_status} → {new_status}")
    return order_tracking_dict(req, db)

def order_tracking_dict(req: ServiceRequest, db: Session) -> dict:
    cust = db.query(Customer).filter(Customer.id == req.customer_id).first()
    current_step = 0
    for i, s in enumerate(STATUS_STEPS):
        if req.status == s:
            current_step = i
            break
    is_cancelled = req.status == ServiceStatus.CANCELLED

    return {
        "id": req.id,
        "booking_id": f"AGR{req.id:04d}",
        "tracking_token": req.tracking_token or "",
        "customer_name": cust.name if cust else "Unknown",
        "phone": cust.phone_number if cust else "",
        "service_type": req.service_type.value if req.service_type else "",
        "area_hectares": req.area_hectares,
        "location": req.field_location or "",
        "crop_type": req.crop_type or "",
        "status": req.status.value,
        "status_label": STATUS_LABELS.get(req.status.value, req.status.value),
        "status_icon": STATUS_ICONS.get(req.status.value, "📋"),
        "current_step": current_step,
        "total_steps": len(STATUS_STEPS),
        "is_cancelled": is_cancelled,
        "estimated_cost": req.estimated_cost or 0,
        "scheduled_date": req.scheduled_date.isoformat() if req.scheduled_date else None,
        "created_date": req.created_date.isoformat() if req.created_date else None,
        "completed_date": req.completed_date.isoformat() if req.completed_date else None,
        "assigned_drone": req.assigned_drone or "",
        "assigned_pilot": req.assigned_pilot or "",
        "status_history": req.status_history or [],
        "notes": req.notes or "",
    }
