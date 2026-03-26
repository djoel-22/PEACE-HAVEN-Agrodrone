"""
api/scheduling_api.py — Calendar-based scheduling system (Feature 5)
"""
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import ScheduledJob, ServiceRequest, ServiceStatus, JobStatus, Drone

router = APIRouter(prefix="/api/schedule", tags=["Scheduling"])

COLORS = {
    "pesticide_spray":  "#16a34a",
    "fertilizer_spray": "#2563eb",
    "crop_monitoring":  "#7c3aed",
    "field_mapping":    "#d97706",
    "soil_analysis":    "#dc2626",
    "manual":           "#0891b2",
}


class JobCreate(BaseModel):
    service_request_id: Optional[int] = None
    drone_id_str: str
    pilot_name: str
    title: str
    scheduled_start: str       # ISO datetime string
    scheduled_end: Optional[str] = None
    location: Optional[str] = ""
    notes: Optional[str] = ""
    color: Optional[str] = None

class JobUpdate(BaseModel):
    drone_id_str: Optional[str] = None
    pilot_name: Optional[str] = None
    title: Optional[str] = None
    scheduled_start: Optional[str] = None
    scheduled_end: Optional[str] = None
    location: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    color: Optional[str] = None


def _job_dict(j: ScheduledJob) -> dict:
    return {
        "id": j.id,
        "service_request_id": j.service_request_id,
        "drone_id": j.drone_id_str,
        "pilot_name": j.pilot_name or "",
        "title": j.title or "",
        "start": j.scheduled_start.isoformat() if j.scheduled_start else None,
        "end": j.scheduled_end.isoformat() if j.scheduled_end else None,
        "location": j.location or "",
        "status": j.status.value if j.status else "pending",
        "notes": j.notes or "",
        "color": j.color or "#22c55e",
        "created_at": j.created_at.isoformat() if j.created_at else None,
    }


def _parse_dt(s: str) -> datetime:
    for fmt in ("%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M", "%Y-%m-%d %H:%M", "%Y-%m-%d"):
        try:
            return datetime.strptime(s, fmt)
        except ValueError:
            continue
    raise ValueError(f"Cannot parse datetime: {s}")


@router.get("/jobs")
def list_jobs(
    start: Optional[str] = Query(None),
    end: Optional[str] = Query(None),
    drone_id: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    q = db.query(ScheduledJob)
    if start:
        q = q.filter(ScheduledJob.scheduled_start >= _parse_dt(start))
    if end:
        q = q.filter(ScheduledJob.scheduled_start <= _parse_dt(end))
    if drone_id:
        q = q.filter(ScheduledJob.drone_id_str == drone_id)
    jobs = q.order_by(ScheduledJob.scheduled_start).all()
    return {"jobs": [_job_dict(j) for j in jobs]}


@router.post("/jobs")
def create_job(body: JobCreate, db: Session = Depends(get_db)):
    start_dt = _parse_dt(body.scheduled_start)
    end_dt = _parse_dt(body.scheduled_end) if body.scheduled_end else None

    # Conflict check
    conflicts = db.query(ScheduledJob).filter(
        ScheduledJob.drone_id_str == body.drone_id_str,
        ScheduledJob.status.notin_(["done", "cancelled"]),
        ScheduledJob.scheduled_start < (end_dt or start_dt),
        ScheduledJob.scheduled_end > start_dt if end_dt else True,
    ).all()
    if conflicts:
        raise HTTPException(status_code=409, detail=f"Drone {body.drone_id_str} has a conflicting job at that time.")

    color = body.color
    if not color and body.service_request_id:
        req = db.query(ServiceRequest).filter(ServiceRequest.id == body.service_request_id).first()
        if req and req.service_type:
            color = COLORS.get(req.service_type.value, "#22c55e")

    job = ScheduledJob(
        service_request_id=body.service_request_id,
        drone_id_str=body.drone_id_str,
        pilot_name=body.pilot_name,
        title=body.title,
        scheduled_start=start_dt,
        scheduled_end=end_dt,
        location=body.location,
        notes=body.notes,
        color=color or "#22c55e",
        status=JobStatus.PENDING,
    )
    db.add(job)

    # If linked to a service request, update its status
    if body.service_request_id:
        req = db.query(ServiceRequest).filter(ServiceRequest.id == body.service_request_id).first()
        if req:
            req.status = ServiceStatus.SCHEDULED
            req.assigned_drone = body.drone_id_str
            req.assigned_pilot = body.pilot_name
            req.scheduled_date = start_dt

    db.commit()
    db.refresh(job)
    return _job_dict(job)


@router.put("/jobs/{job_id}")
def update_job(job_id: int, body: JobUpdate, db: Session = Depends(get_db)):
    job = db.query(ScheduledJob).filter(ScheduledJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if body.drone_id_str is not None:  job.drone_id_str = body.drone_id_str
    if body.pilot_name is not None:    job.pilot_name = body.pilot_name
    if body.title is not None:         job.title = body.title
    if body.location is not None:      job.location = body.location
    if body.notes is not None:         job.notes = body.notes
    if body.color is not None:         job.color = body.color
    if body.scheduled_start is not None:
        job.scheduled_start = _parse_dt(body.scheduled_start)
    if body.scheduled_end is not None:
        job.scheduled_end = _parse_dt(body.scheduled_end)
    if body.status is not None:
        try:
            job.status = JobStatus(body.status)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid status: {body.status}")

    db.commit()
    db.refresh(job)
    return _job_dict(job)


@router.delete("/jobs/{job_id}")
def delete_job(job_id: int, db: Session = Depends(get_db)):
    job = db.query(ScheduledJob).filter(ScheduledJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    db.delete(job)
    db.commit()
    return {"deleted": True, "id": job_id}


@router.get("/pending-orders")
def pending_orders_for_scheduling(db: Session = Depends(get_db)):
    """Return pending orders that can be scheduled."""
    from app.services.tracking_service import order_tracking_dict
    reqs = db.query(ServiceRequest).filter(
        ServiceRequest.status.in_([ServiceStatus.PENDING, ServiceStatus.SCHEDULED])
    ).order_by(ServiceRequest.created_date.desc()).all()
    return {"orders": [order_tracking_dict(r, db) for r in reqs]}


@router.get("/available-drones")
def available_drones(
    date: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Return drones not already scheduled on a given date."""
    drones = db.query(Drone).filter(Drone.status != "offline").all()
    busy_ids = set()
    if date:
        dt = _parse_dt(date)
        day_start = dt.replace(hour=0, minute=0, second=0)
        day_end = dt.replace(hour=23, minute=59, second=59)
        busy_jobs = db.query(ScheduledJob).filter(
            ScheduledJob.scheduled_start >= day_start,
            ScheduledJob.scheduled_start <= day_end,
            ScheduledJob.status.notin_(["done", "cancelled"]),
        ).all()
        busy_ids = {j.drone_id_str for j in busy_jobs}

    return {
        "drones": [
            {
                "drone_id": d.drone_id,
                "model": d.model or "",
                "pilot_name": d.pilot_name or "",
                "status": d.status.value if d.status else "standby",
                "is_available": d.drone_id not in busy_ids,
            }
            for d in drones
        ]
    }
