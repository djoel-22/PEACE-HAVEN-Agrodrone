"""
app/api/dashboard_api.py
All REST endpoints consumed by the dashboard.
Field names match exactly what the original dashboard JS expects.
"""
import logging
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import (Customer, ServiceRequest, ServiceStatus,
                            ServiceType, ChatMessage, Drone, DroneStatus)
from app.config import RATES, MINIMUM_CHARGE, OPENWEATHER_API_KEY

router = APIRouter(prefix="/api", tags=["Dashboard"])

@router.get("/test")
def test_endpoint():
    """Simple test - no DB needed. If this works, routing is fine."""
    return {"status": "ok", "message": "AgroDrone API is working!",
            "total_bookings": 0, "active_requests": 0,
            "total_farmers": 0, "operational_hours": 0,
            "total_revenue": 0, "avg_response_time": "< 1 sec"}

logger = logging.getLogger("agrodrone-dashboard")


# ── helpers ───────────────────────────────────────────────────────────────────

SVC_NAMES = {
    "pesticide_spray":  "Pesticide Spray",
    "fertilizer_spray": "Fertilizer Spray",
    "crop_monitoring":  "Crop Monitoring",
    "field_mapping":    "Field Mapping",
    "soil_analysis":    "Soil Analysis",
}

def _req_dict(r: ServiceRequest, db: Session) -> dict:
    cust = db.query(Customer).filter(Customer.id == r.customer_id).first()
    return {
        # IDs
        "id":             r.id,
        # Farmer — JS reads farmer_name and phone
        "farmer_name":    cust.name if cust else "Unknown",
        "phone":          cust.phone_number if cust else "",
        "whatsapp":       cust.phone_number if cust else "",
        # Service
        "service_type":   r.service_type.value,
        "service_name":   SVC_NAMES.get(r.service_type.value, r.service_type.value),
        "crop_type":      r.crop_type or "",
        "area_hectares":  float(r.area_hectares or 0),
        # Location — JS reads location
        "location":       r.field_location or "Tamil Nadu",
        # Dates — JS reads scheduled_date and created_date (we already patched scheduled_for→scheduled_date)
        "scheduled_date": r.scheduled_date.isoformat() if r.scheduled_date else None,
        "scheduled_for":  r.scheduled_date.isoformat() if r.scheduled_date else None,  # keep both
        "created_date":   r.created_date.isoformat() if r.created_date else None,
        "created_at":     r.created_date.isoformat() if r.created_date else None,      # keep both
        # Scheduling
        "time_slot":      r.time_slot or "",
        # Status & cost
        "status":         r.status.value,
        "estimated_cost": float(r.estimated_cost or 0),
        "actual_cost":    float(r.actual_cost or 0),
        # Assignment
        "assigned_pilot": r.assigned_pilot or "",
        "assigned_drone": r.assigned_drone or "",
        # Meta
        "notes":          r.notes or "",
        "source":         r.source or "whatsapp",
    }


def _fetch_weather_city(city: str) -> dict:
    """Fetch OWM weather for one city with full field set matching original JS."""
    import requests as req_lib
    fallback = {
        "city": city, "temperature": 28, "feels_like": 31, "humidity": 65,
        "wind_speed": 8.0, "wind_direction": "NW", "visibility": 10.0,
        "pressure": 1012, "condition": "Partly Cloudy", "condition_icon": "02d",
        "suitable_for_spraying": True, "source": "Estimated",
        "last_updated": datetime.utcnow().strftime("%d %b %Y, %I:%M %p"),
        "wind_gust": 5, "temp_min": 24, "temp_max": 34,
    }
    if not OPENWEATHER_API_KEY:
        return fallback
    try:
        r = req_lib.get(
            "http://api.openweathermap.org/data/2.5/weather",
            params={"q": city + ",IN", "appid": OPENWEATHER_API_KEY, "units": "metric"},
            timeout=6,
        )
        r.raise_for_status()
        d = r.json()
        wind = round(d["wind"]["speed"] * 3.6, 1)
        temp = round(d["main"]["temp"], 1)
        hum  = d["main"]["humidity"]
        dirs = ["N","NE","E","SE","S","SW","W","NW"]
        wdir = dirs[round(d.get("wind",{}).get("deg",0) / 45) % 8]
        suitable = wind < 15 and hum < 90 and 10 < temp < 38
        icon = d["weather"][0]["icon"] if d.get("weather") else "01d"
        return {
            "city":                city,
            "temperature":         temp,
            "feels_like":          round(d["main"].get("feels_like", temp), 1),
            "temp_min":            round(d["main"].get("temp_min", temp), 1),
            "temp_max":            round(d["main"].get("temp_max", temp), 1),
            "humidity":            hum,
            "wind_speed":          wind,
            "wind_direction":      wdir,
            "wind_gust":           round(d.get("wind",{}).get("gust", 0) * 3.6, 1),
            "visibility":          round(d.get("visibility", 10000) / 1000, 1),
            "pressure":            d["main"]["pressure"],
            "condition":           d["weather"][0]["description"].title() if d.get("weather") else "Clear",
            "condition_icon":      icon,
            "suitable_for_spraying": suitable,
            "source":              "OpenWeatherMap",
            "last_updated":        datetime.now().strftime("%d %b %Y, %I:%M %p"),
        }
    except Exception as e:
        logger.warning(f"OWM failed for {city}: {e}")
        return {**fallback, "city": city}


# ── /api/stats ────────────────────────────────────────────────────────────────

@router.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    """
    JS reads: total_services, total_bookings, active_requests, operational_hours,
    total_revenue, efficiency_rate, total_customers, total_farmers,
    messages_today, orders_today, bookings_today, avg_response_time
    """
    total     = db.query(ServiceRequest).count()
    today_str = datetime.utcnow().strftime("%Y-%m-%d")
    # Use string comparison for SQLite compatibility
    today_n   = db.query(ServiceRequest).filter(
        ServiceRequest.created_date >= today_str
    ).count()
    pending   = db.query(ServiceRequest).filter(ServiceRequest.status == ServiceStatus.PENDING).count()
    scheduled = db.query(ServiceRequest).filter(ServiceRequest.status == ServiceStatus.SCHEDULED).count()
    active    = pending + scheduled
    completed = db.query(ServiceRequest).filter(ServiceRequest.status == ServiceStatus.COMPLETED).all()
    revenue   = sum(float(r.actual_cost or r.estimated_cost or 0) for r in completed)
    farmers   = db.query(Customer).count()
    drones_active = db.query(Drone).filter(Drone.status == DroneStatus.ACTIVE).count()
    hours = round(sum(float(d.flight_hours_today or 0)
                      for d in db.query(Drone).all()), 1)

    return {
        # ops stats
        "total_services":    total,
        "total_bookings":    total,
        "active_requests":   active,
        "operational_hours": hours,
        "total_revenue":     round(revenue),
        "efficiency_rate":   95.8,
        # wa hub stats
        "total_customers":   farmers,
        "total_farmers":     farmers,
        "messages_today":    today_n * 6,
        "orders_today":      today_n,
        "bookings_today":    today_n,
        "avg_response_time": "< 1 sec",
        # extra
        "active_drones":     drones_active,
        "satisfaction_rate": 97.8,
    }


# ── /api/requests ─────────────────────────────────────────────────────────────

@router.get("/requests")
def get_requests(
    status: Optional[str] = None,
    limit:  int = 500,
    offset: int = 0,
    db: Session = Depends(get_db),
):
    q = db.query(ServiceRequest)
    if status:
        try:
            q = q.filter(ServiceRequest.status == ServiceStatus(status))
        except Exception:
            pass
    reqs = q.order_by(ServiceRequest.created_date.desc()).offset(offset).limit(limit).all()
    return [_req_dict(r, db) for r in reqs]


@router.get("/requests/{request_id}")
def get_request(request_id: int, db: Session = Depends(get_db)):
    r = db.query(ServiceRequest).filter(ServiceRequest.id == request_id).first()
    if not r:
        raise HTTPException(404, "Not found")
    return _req_dict(r, db)


@router.put("/requests/{request_id}/status")
def update_status(request_id: int, body: dict, db: Session = Depends(get_db)):
    """JS sends {status: ...} or {new_status: ...}"""
    r = db.query(ServiceRequest).filter(ServiceRequest.id == request_id).first()
    if not r:
        raise HTTPException(404, "Not found")
    new_status = body.get("status") or body.get("new_status")
    if new_status:
        try:
            r.status = ServiceStatus(new_status)
        except Exception:
            raise HTTPException(400, f"Invalid status: {new_status}")
    if body.get("assigned_pilot"):  r.assigned_pilot = body["assigned_pilot"]
    if body.get("assigned_drone"):  r.assigned_drone = body["assigned_drone"]
    if body.get("actual_cost"):     r.actual_cost    = float(body["actual_cost"])
    if new_status == "completed":   r.completed_date = datetime.utcnow()
    db.commit()
    return {"success": True, "id": request_id, "status": r.status.value}


@router.put("/requests/{request_id}/schedule")
def schedule_request(request_id: int, body: dict, db: Session = Depends(get_db)):
    """JS sends {scheduled_date, time_slot}"""
    r = db.query(ServiceRequest).filter(ServiceRequest.id == request_id).first()
    if not r:
        raise HTTPException(404, "Not found")
    date_str = body.get("scheduled_date")
    slot     = body.get("time_slot", "06:00-09:00")
    if date_str:
        try:
            hour = {"06:00-09:00": 6, "09:00-12:00": 9,
                    "12:00-15:00": 12, "15:00-18:00": 15}.get(slot, 6)
            r.scheduled_date = datetime.strptime(date_str, "%Y-%m-%d").replace(hour=hour)
            r.time_slot      = slot
            r.status         = ServiceStatus.SCHEDULED
        except Exception as e:
            logger.error(f"Schedule parse: {e}")
    db.commit()
    return {
        "success":        True,
        "scheduled_date": r.scheduled_date.isoformat() if r.scheduled_date else None,
        "time_slot":      r.time_slot,
        "status":         r.status.value,
    }


@router.post("/requests/new")
def create_request(body: dict, db: Session = Depends(get_db)):
    """JS sends {farmer_name, phone, service_type, area_hectares, location, scheduled_date, time_slot}"""
    try:
        phone       = (body.get("phone") or "").strip()
        farmer_name = (body.get("farmer_name") or "").strip()
        svc_type    = body.get("service_type", "pesticide_spray")
        area        = float(body.get("area_hectares") or 1.0)
        location    = (body.get("location") or "Tamil Nadu").strip()
        date_str    = body.get("scheduled_date")
        slot        = body.get("time_slot", "06:00-09:00")

        cust = db.query(Customer).filter(Customer.phone_number == phone).first()
        if not cust:
            cust = Customer(phone_number=phone,
                            name=farmer_name or f"Farmer {phone[-4:] if len(phone)>=4 else phone}",
                            registration_date=datetime.utcnow())
            db.add(cust)
            db.flush()
        elif farmer_name and not cust.name:
            cust.name = farmer_name

        rate  = RATES.get(svc_type, 1200)
        cost  = max(round(area * rate / 50) * 50, MINIMUM_CHARGE)

        sched_dt = None
        status   = ServiceStatus.PENDING
        if date_str:
            try:
                hour     = {"06:00-09:00": 6, "09:00-12:00": 9,
                            "12:00-15:00": 12, "15:00-18:00": 15}.get(slot, 6)
                sched_dt = datetime.strptime(date_str, "%Y-%m-%d").replace(hour=hour)
                status   = ServiceStatus.SCHEDULED
            except Exception:
                pass

        req = ServiceRequest(
            customer_id    = cust.id,
            service_type   = ServiceType(svc_type),
            crop_type      = body.get("crop_type"),
            area_hectares  = area,
            field_location = location,
            estimated_cost = cost,
            status         = status,
            scheduled_date = sched_dt,
            time_slot      = slot if sched_dt else None,
            requested_date = datetime.utcnow(),
            created_date   = datetime.utcnow(),
            source         = "dashboard",
            notes          = body.get("notes", ""),
        )
        db.add(req)
        db.commit()
        db.refresh(req)
        return {
            "success":        True,
            "request_id":     req.id,
            "id":             req.id,
            "estimated_cost": cost,
            "status":         req.status.value,
        }
    except Exception as e:
        logger.error(f"Create request: {e}")
        db.rollback()
        raise HTTPException(500, str(e))


# ── /api/farmers ──────────────────────────────────────────────────────────────

@router.get("/farmers")
def get_farmers(db: Session = Depends(get_db)):
    """
    JS reads: name, phone, whatsapp, location, total_services, total_area_hectares,
    last_service, total_bookings
    """
    customers = db.query(Customer).order_by(Customer.registration_date.desc()).all()
    result = []
    for c in customers:
        reqs   = db.query(ServiceRequest).filter(ServiceRequest.customer_id == c.id).all()
        latest = max((r for r in reqs if r.created_date), key=lambda x: x.created_date, default=None)
        total_area = round(sum(float(r.area_hectares or 0) for r in reqs), 1)
        result.append({
            "id":                 c.id,
            "name":               c.name or f"Farmer {c.phone_number[-4:]}",
            "phone":              c.phone_number,
            "phone_number":       c.phone_number,
            "whatsapp":           c.phone_number,
            # JS reads f.location
            "location":           c.district or "Tamil Nadu",
            "address":            c.district or "Tamil Nadu",
            # JS reads both f.total_services and f.total_bookings
            "total_services":     len(reqs),
            "total_bookings":     len(reqs),
            "total_area_hectares":total_area,
            # JS reads f.last_service
            "last_service":       latest.created_date.isoformat() if latest else None,
            "last_booking":       latest.created_date.isoformat() if latest else None,
            "joined":             c.registration_date.isoformat() if c.registration_date else None,
            "total_spent":        round(sum(float(r.estimated_cost or 0) for r in reqs), 2),
        })
    return result


# ── /api/fleet ────────────────────────────────────────────────────────────────

@router.get("/fleet")
def get_fleet(db: Session = Depends(get_db)):
    """
    JS reads drone fields: drone_id, model, status, pilot, current_location,
    battery_level, flight_hours_today, total_flight_hours, next_maintenance, notes, id
    """
    drones = db.query(Drone).all()
    return {
        "total":       len(drones),
        "active":      sum(1 for d in drones if d.status == DroneStatus.ACTIVE),
        "standby":     sum(1 for d in drones if d.status == DroneStatus.STANDBY),
        "maintenance": sum(1 for d in drones if d.status == DroneStatus.MAINTENANCE),
        "drones": [{
            "id":                 d.id,
            "drone_id":           d.drone_id,
            "model":              d.model or "—",
            "status":             d.status.value,
            # JS reads d.pilot  (not pilot_name)
            "pilot":              d.pilot_name or "—",
            "pilot_name":         d.pilot_name or "—",
            # JS reads d.current_location
            "current_location":   d.current_location or "—",
            # JS reads d.battery_level
            "battery_level":      d.battery_level or 0,
            "flight_hours_today": d.flight_hours_today or 0,
            "total_flight_hours": d.total_flight_hours or 0,
            "next_maintenance":   d.next_maintenance.isoformat() if d.next_maintenance else None,
            "notes":              d.notes or "",
        } for d in drones],
    }


@router.put("/fleet/{drone_id}/update")
def update_drone(drone_id: int, body: dict, db: Session = Depends(get_db)):
    d = db.query(Drone).filter(Drone.id == drone_id).first()
    if not d:
        raise HTTPException(404, "Drone not found")
    if body.get("status"):
        try: d.status = DroneStatus(body["status"])
        except Exception: pass
    if body.get("battery_level")    is not None: d.battery_level      = int(body["battery_level"])
    if body.get("current_location"):              d.current_location   = body["current_location"]
    if body.get("pilot_name"):                    d.pilot_name         = body["pilot_name"]
    if body.get("flight_hours_today") is not None:d.flight_hours_today = float(body["flight_hours_today"])
    if body.get("notes"):                         d.notes              = body["notes"]
    db.commit()
    return {"success": True}


# ── /api/analytics ────────────────────────────────────────────────────────────

@router.get("/analytics")
def get_analytics(db: Session = Depends(get_db)):
    """
    JS reads: by_type, by_status, monthly_revenue, total_revenue,
    total_requests, total_bookings
    """
    reqs = db.query(ServiceRequest).all()
    by_type, by_status, by_month = {}, {}, {}
    for r in reqs:
        svc = r.service_type.value
        by_type[svc] = by_type.get(svc, 0) + 1
        st = r.status.value
        by_status[st] = by_status.get(st, 0) + 1
        if r.created_date:
            # JS iterates over months Jan–Dec by index — key as "Jan", "Feb" etc.
            key = r.created_date.strftime("%b")
            by_month[key] = by_month.get(key, 0) + float(r.estimated_cost or 0)

    total_rev = sum(float(r.actual_cost or r.estimated_cost or 0)
                    for r in reqs if r.status == ServiceStatus.COMPLETED)
    return {
        "by_type":        by_type,
        "by_status":      by_status,
        "monthly_revenue":by_month,
        "total_revenue":  round(total_rev),
        "total_requests": len(reqs),
        "total_bookings": len(reqs),
    }


# ── /api/conversations ────────────────────────────────────────────────────────

@router.get("/conversations")
def get_conversations(limit: int = 50, db: Session = Depends(get_db)):
    """
    JS reads: phone, name, last_message, last_activity, total_orders,
    total_value, status
    """
    customers = db.query(Customer).order_by(Customer.registration_date.desc()).limit(limit).all()
    result = []
    for c in customers:
        latest_msg = (db.query(ChatMessage)
                       .filter(ChatMessage.customer_id == c.id)
                       .order_by(ChatMessage.timestamp.desc())
                       .first())
        reqs = db.query(ServiceRequest).filter(ServiceRequest.customer_id == c.id).all()
        total_val = sum(float(r.estimated_cost or 0) for r in reqs)
        result.append({
            "phone":         c.phone_number,
            "name":          c.name or f"Farmer {c.phone_number[-4:]}",
            "last_message":  latest_msg.message[:100] if latest_msg else "New customer",
            "last_activity": latest_msg.timestamp.isoformat() if latest_msg
                             else (c.registration_date.isoformat() if c.registration_date
                                   else datetime.utcnow().isoformat()),
            "total_orders":  len(reqs),
            "total_value":   round(total_val, 2),
            "status":        "active" if reqs else "new_customer",
        })
    return sorted(result, key=lambda x: x["last_activity"], reverse=True)


@router.get("/conversations/{phone}/messages")
def get_chat_history(phone: str, db: Session = Depends(get_db)):
    msgs = (db.query(ChatMessage)
              .filter(ChatMessage.phone == phone)
              .order_by(ChatMessage.timestamp.asc())
              .limit(200).all())
    return [{"role": m.role, "message": m.message,
             "timestamp": m.timestamp.isoformat()} for m in msgs]


# ── /api/weather ──────────────────────────────────────────────────────────────

@router.get("/weather")
def get_weather(city: str = "Chennai"):
    return _fetch_weather_city(city)


@router.get("/weather/all-cities")
def get_all_cities_weather():
    cities = ["Chennai","Coimbatore","Salem","Madurai","Erode",
              "Trichy","Tirunelveli","Vellore","Thanjavur","Tirupur"]
    return [_fetch_weather_city(c) for c in cities]


# ── /api/calendar ─────────────────────────────────────────────────────────────

@router.get("/calendar")
def get_calendar_events(
    year:  int = Query(default=None),
    month: int = Query(default=None),
    db: Session = Depends(get_db),
):
    now = datetime.utcnow()
    y   = year  or now.year
    m   = month or now.month
    start = datetime(y, m, 1)
    end   = datetime(y + 1, 1, 1) if m == 12 else datetime(y, m + 1, 1)

    reqs = db.query(ServiceRequest).filter(
        ServiceRequest.scheduled_date >= start,
        ServiceRequest.scheduled_date <  end,
        ServiceRequest.status.in_([ServiceStatus.SCHEDULED, ServiceStatus.IN_PROGRESS,
                                    ServiceStatus.COMPLETED]),
    ).all()

    COLOR = {
        "scheduled":   "#4a9fd4",
        "in_progress": "#e8a040",
        "completed":   "#7ab648",
        "cancelled":   "#d45a4a",
    }

    events = []
    for r in reqs:
        cust = db.query(Customer).filter(Customer.id == r.customer_id).first()
        svc_name = SVC_NAMES.get(r.service_type.value, r.service_type.value)
        events.append({
            "id":      r.id,
            "title":   f"{svc_name} — {r.field_location or 'TN'}",
            "start":   r.scheduled_date.isoformat(),
            "end":     (r.scheduled_date + timedelta(hours=3)).isoformat(),
            "color":   COLOR.get(r.status.value, "#4a9fd4"),
            "farmer":  cust.name if cust else "Unknown",
            "phone":   cust.phone_number if cust else "",
            "service": svc_name,
            "area":    float(r.area_hectares or 0),
            "location":r.field_location or "",
            "status":  r.status.value,
            "cost":    float(r.estimated_cost or 0),
            "pilot":   r.assigned_pilot or "",
        })
    return events
