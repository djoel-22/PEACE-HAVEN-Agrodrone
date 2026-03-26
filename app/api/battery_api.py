"""
api/battery_api.py — Battery cycle tracking endpoints (Feature 1)
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import Drone, DroneBattery
from app.services.battery_service import (
    get_all_batteries, record_charge, update_battery,
    get_or_create_battery, battery_to_dict
)

router = APIRouter(prefix="/api/battery", tags=["Battery"])


class ChargeRequest(BaseModel):
    flight_hours_delta: float = 0.0

class BatteryUpdate(BaseModel):
    cycle_count: int = None
    max_cycles: int = None
    flight_hours: float = None
    notes: str = None


@router.get("/all")
def list_batteries(db: Session = Depends(get_db)):
    """Get battery status for all drones."""
    drones = db.query(Drone).all()
    results = []
    for drone in drones:
        battery = get_or_create_battery(drone, db)
        d = battery_to_dict(battery)
        d["drone_model"] = drone.model or ""
        d["drone_status"] = drone.status.value if drone.status else "standby"
        results.append(d)
    db.commit()  # persist any auto-created batteries
    return {"batteries": results, "total": len(results)}


@router.post("/{drone_id}/charge")
def log_charge(drone_id: str, body: ChargeRequest, db: Session = Depends(get_db)):
    """Record a full charge cycle for a drone."""
    result = record_charge(drone_id, db, body.flight_hours_delta)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result


@router.put("/{drone_id}")
def edit_battery(drone_id: str, body: BatteryUpdate, db: Session = Depends(get_db)):
    """Manually update battery data."""
    data = {k: v for k, v in body.dict().items() if v is not None}
    result = update_battery(drone_id, data, db)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result


@router.get("/{drone_id}")
def get_battery(drone_id: str, db: Session = Depends(get_db)):
    """Get battery info for a single drone."""
    drone = db.query(Drone).filter(Drone.drone_id == drone_id).first()
    if not drone:
        raise HTTPException(status_code=404, detail="Drone not found")
    battery = get_or_create_battery(drone, db)
    db.commit()
    d = battery_to_dict(battery)
    d["drone_model"] = drone.model or ""
    return d


@router.get("/alerts/active")
def battery_alerts(db: Session = Depends(get_db)):
    """Return only drones with WARNING or CRITICAL battery."""
    all_b = get_all_batteries(db)
    alerts = [b for b in all_b if b["alert_level"] in ("warning", "critical")]
    return {"alerts": alerts, "count": len(alerts)}
