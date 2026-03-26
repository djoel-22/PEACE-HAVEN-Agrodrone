"""
api/tracking_api.py — Order tracking endpoints (Feature 4)
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import ServiceRequest, ServiceStatus, Customer
from app.services.tracking_service import (
    get_by_token, get_by_booking_id, update_status,
    order_tracking_dict, ensure_token, STATUS_LABELS
)

router = APIRouter(prefix="/api/track", tags=["Tracking"])


class StatusUpdate(BaseModel):
    status: str
    note: Optional[str] = ""
    assigned_drone: Optional[str] = None
    assigned_pilot: Optional[str] = None


@router.get("/order/{booking_id}")
def track_by_booking_id(booking_id: str, db: Session = Depends(get_db)):
    """Public: track order by booking ID (e.g. AGR0042)"""
    req = get_by_booking_id(booking_id, db)
    if not req:
        raise HTTPException(status_code=404, detail="Order not found")
    ensure_token(req, db)
    return order_tracking_dict(req, db)


@router.get("/token/{token}")
def track_by_token(token: str, db: Session = Depends(get_db)):
    """Public: track order by tracking token"""
    req = get_by_token(token, db)
    if not req:
        raise HTTPException(status_code=404, detail="Invalid tracking link")
    return order_tracking_dict(req, db)


@router.get("/customer/{phone}")
def track_by_phone(phone: str, db: Session = Depends(get_db)):
    """Public: get all orders for a phone number"""
    cust = db.query(Customer).filter(Customer.phone_number == phone).first()
    if not cust:
        raise HTTPException(status_code=404, detail="No orders found for this number")
    orders = []
    for req in cust.service_requests:
        ensure_token(req, db)
        orders.append(order_tracking_dict(req, db))
    orders.sort(key=lambda x: x["created_date"] or "", reverse=True)
    return {
        "customer": {"name": cust.name, "phone": cust.phone_number, "district": cust.district},
        "orders": orders,
        "total": len(orders),
    }


@router.put("/admin/{order_id}/status")
def admin_update_status(order_id: int, body: StatusUpdate, db: Session = Depends(get_db)):
    """Admin: update order status with optional drone/pilot assignment"""
    req = db.query(ServiceRequest).filter(ServiceRequest.id == order_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Order not found")

    if body.assigned_drone:
        req.assigned_drone = body.assigned_drone
    if body.assigned_pilot:
        req.assigned_pilot = body.assigned_pilot

    result = update_status(order_id, body.status, body.note, db)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.get("/admin/all")
def list_all_orders(
    status: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0),
    db: Session = Depends(get_db)
):
    """Admin: paginated list of all orders with tracking info"""
    q = db.query(ServiceRequest)
    if status:
        try:
            q = q.filter(ServiceRequest.status == ServiceStatus(status))
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid status: {status}")
    total = q.count()
    reqs = q.order_by(ServiceRequest.created_date.desc()).offset(offset).limit(limit).all()
    for r in reqs:
        ensure_token(r, db)
    return {
        "orders": [order_tracking_dict(r, db) for r in reqs],
        "total": total,
        "offset": offset,
        "limit": limit,
    }
