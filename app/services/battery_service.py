"""
services/battery_service.py — Drone Battery Cycle Tracking (Feature 1)
"""
from datetime import datetime
from sqlalchemy.orm import Session
from app.db.models import DroneBattery, Drone, BatteryAlertLevel
import logging

logger = logging.getLogger("agrodrone-battery")


def _calc_health(cycle_count: int, max_cycles: int) -> float:
    return max(0.0, round(100.0 - (cycle_count / max_cycles * 100), 1))

def _calc_alert(health: float) -> BatteryAlertLevel:
    if health < 25:
        return BatteryAlertLevel.CRITICAL
    if health < 50:
        return BatteryAlertLevel.WARNING
    return BatteryAlertLevel.GOOD

def get_or_create_battery(drone: Drone, db: Session) -> DroneBattery:
    battery = db.query(DroneBattery).filter(DroneBattery.drone_db_id == drone.id).first()
    if not battery:
        battery = DroneBattery(
            drone_db_id=drone.id,
            drone_id=drone.drone_id,
            cycle_count=0,
            max_cycles=300,
            health_percentage=100.0,
            alert_level=BatteryAlertLevel.GOOD,
            total_flight_hours=drone.total_flight_hours or 0.0,
        )
        db.add(battery)
        db.flush()
    return battery

def record_charge(drone_id_str: str, db: Session, flight_hours_delta: float = 0.0) -> dict:
    """Increment cycle count after a full charge event."""
    drone = db.query(Drone).filter(Drone.drone_id == drone_id_str).first()
    if not drone:
        return {"error": f"Drone {drone_id_str} not found"}
    battery = get_or_create_battery(drone, db)
    battery.cycle_count += 1
    battery.last_charged_at = datetime.utcnow()
    battery.total_flight_hours += flight_hours_delta
    battery.health_percentage = _calc_health(battery.cycle_count, battery.max_cycles)
    battery.alert_level = _calc_alert(battery.health_percentage)
    battery.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(battery)
    result = battery_to_dict(battery)
    if battery.alert_level == BatteryAlertLevel.CRITICAL:
        logger.warning(f"🔴 CRITICAL battery: {drone_id_str} health={battery.health_percentage}%")
    elif battery.alert_level == BatteryAlertLevel.WARNING:
        logger.warning(f"🟡 WARNING battery: {drone_id_str} health={battery.health_percentage}%")
    return result

def update_battery(drone_id_str: str, data: dict, db: Session) -> dict:
    drone = db.query(Drone).filter(Drone.drone_id == drone_id_str).first()
    if not drone:
        return {"error": "Drone not found"}
    battery = get_or_create_battery(drone, db)
    if "cycle_count" in data:
        battery.cycle_count = int(data["cycle_count"])
    if "max_cycles" in data:
        battery.max_cycles = int(data["max_cycles"])
    if "flight_hours" in data:
        battery.total_flight_hours = float(data["flight_hours"])
    if "notes" in data:
        battery.notes = data["notes"]
    battery.health_percentage = _calc_health(battery.cycle_count, battery.max_cycles)
    battery.alert_level = _calc_alert(battery.health_percentage)
    battery.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(battery)
    return battery_to_dict(battery)

def get_all_batteries(db: Session) -> list:
    return [battery_to_dict(b) for b in db.query(DroneBattery).all()]

def battery_to_dict(b: DroneBattery) -> dict:
    return {
        "id": b.id,
        "drone_id": b.drone_id,
        "cycle_count": b.cycle_count,
        "max_cycles": b.max_cycles,
        "cycles_remaining": max(0, b.max_cycles - b.cycle_count),
        "health_percentage": b.health_percentage,
        "alert_level": b.alert_level.value,
        "last_charged_at": b.last_charged_at.isoformat() if b.last_charged_at else None,
        "total_flight_hours": round(b.total_flight_hours, 1),
        "notes": b.notes or "",
        "updated_at": b.updated_at.isoformat() if b.updated_at else None,
    }
