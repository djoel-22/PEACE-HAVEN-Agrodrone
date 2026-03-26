"""
init_db.py — Initialize / migrate database for AgroDrone Enhanced
Run once: python init_db.py
Safe to re-run: uses CREATE TABLE IF NOT EXISTS
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from app.db.database import engine
from app.db.models import Base, AdminUser, Drone, DroneBattery
from app.utils.auth import hash_password
from sqlalchemy.orm import sessionmaker
from datetime import datetime

print("Initializing AgroDrone Enhanced database...")
Base.metadata.create_all(bind=engine)
print("All tables created/verified")

Session = sessionmaker(bind=engine)
db = Session()

try:
    if db.query(AdminUser).count() == 0:
        db.add(AdminUser(
            username="admin",
            password_hash=hash_password("agrodrone2024"),
            full_name="Administrator",
            role="admin",
            is_active=True,
        ))
        db.commit()
        print("Default admin created: admin / agrodrone2024")
except Exception as e:
    print(f"Admin seed skipped: {e}")
    db.rollback()

try:
    if db.query(Drone).count() == 0:
        drones = [
            Drone(drone_id="DRN-001", model="DJI Agras T40", pilot_name="Karthik R", current_location="Coimbatore Base", total_flight_hours=145.5),
            Drone(drone_id="DRN-002", model="DJI Agras T30", pilot_name="Murugan S", current_location="Salem Base",      total_flight_hours=310.0),
            Drone(drone_id="DRN-003", model="XAG P100 Pro",  pilot_name="Rajan V",   current_location="Madurai Base",    total_flight_hours=89.0),
        ]
        for d in drones:
            db.add(d)
        db.flush()
        from app.services.battery_service import get_or_create_battery, _calc_health, _calc_alert
        for i, drone in enumerate(drones):
            bat = get_or_create_battery(drone, db)
            bat.cycle_count = [45, 278, 22][i]
            bat.last_charged_at = datetime.utcnow()
            bat.total_flight_hours = drone.total_flight_hours
            bat.health_percentage = _calc_health(bat.cycle_count, bat.max_cycles)
            bat.alert_level = _calc_alert(bat.health_percentage)
        db.commit()
        print(f"Seeded {len(drones)} demo drones with battery records")
    else:
        from app.services.battery_service import get_or_create_battery
        drones = db.query(Drone).all()
        created = 0
        for drone in drones:
            existing = db.query(DroneBattery).filter(DroneBattery.drone_db_id == drone.id).first()
            if not existing:
                get_or_create_battery(drone, db)
                created += 1
        if created:
            db.commit()
            print(f"Created battery records for {created} existing drones")
except Exception as e:
    print(f"Drone seed skipped: {e}")
    db.rollback()

db.close()
print("\nDatabase ready!")
print("Admin Portal: http://localhost:8000/admin  |  admin / agrodrone2024")
print("Client Portal: http://localhost:8000/client")
print("Start: uvicorn app.main:app --reload --port 8000")
