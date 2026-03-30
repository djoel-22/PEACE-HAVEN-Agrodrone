"""
app/api/feedback_api.py – Service feedback endpoints
"""
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import ServiceFeedback, ServiceRequest, ServiceStatus, Customer

router = APIRouter(prefix="/api/feedback", tags=["Feedback"])


class FeedbackCreate(BaseModel):
    service_request_id: int
    overall_rating:     int   = Field(..., ge=1, le=5)
    spray_quality:      Optional[int] = Field(None, ge=1, le=5)
    pilot_behavior:     Optional[int] = Field(None, ge=1, le=5)
    timeliness:         Optional[int] = Field(None, ge=1, le=5)
    comments:           Optional[str] = None
    would_recommend:    bool = True


@router.post("")
def submit_feedback(body: FeedbackCreate, db: Session = Depends(get_db)):
    # Check order exists and is completed
    req = db.query(ServiceRequest).filter(ServiceRequest.id == body.service_request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Order not found")
    if req.status != ServiceStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Feedback can only be submitted for completed orders")

    # Check not already submitted
    existing = db.query(ServiceFeedback).filter(
        ServiceFeedback.service_request_id == body.service_request_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Feedback already submitted for this order")

    feedback = ServiceFeedback(
        service_request_id = body.service_request_id,
        customer_id        = req.customer_id,
        overall_rating     = body.overall_rating,
        spray_quality      = body.spray_quality,
        pilot_behavior     = body.pilot_behavior,
        timeliness         = body.timeliness,
        comments           = body.comments,
        pilot_name         = req.assigned_pilot,
        would_recommend    = body.would_recommend,
        submitted_at       = datetime.utcnow(),
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)
    return {"message": "Thank you for your feedback!", "id": feedback.id}


@router.get("/order/{order_id}")
def get_feedback(order_id: int, db: Session = Depends(get_db)):
    feedback = db.query(ServiceFeedback).filter(
        ServiceFeedback.service_request_id == order_id
    ).first()
    if not feedback:
        return {"exists": False}
    return {
        "exists":           True,
        "overall_rating":   feedback.overall_rating,
        "spray_quality":    feedback.spray_quality,
        "pilot_behavior":   feedback.pilot_behavior,
        "timeliness":       feedback.timeliness,
        "comments":         feedback.comments,
        "pilot_name":       feedback.pilot_name,
        "would_recommend":  feedback.would_recommend,
        "submitted_at":     feedback.submitted_at.isoformat() if feedback.submitted_at else None,
    }


@router.get("/all")
def list_all_feedback(db: Session = Depends(get_db)):
    """Admin endpoint to see all feedback."""
    feedbacks = db.query(ServiceFeedback).order_by(ServiceFeedback.submitted_at.desc()).all()
    return {
        "total": len(feedbacks),
        "average_rating": round(sum(f.overall_rating for f in feedbacks) / len(feedbacks), 1) if feedbacks else 0,
        "feedbacks": [
            {
                "id":               f.id,
                "order_id":         f.service_request_id,
                "overall_rating":   f.overall_rating,
                "spray_quality":    f.spray_quality,
                "pilot_behavior":   f.pilot_behavior,
                "timeliness":       f.timeliness,
                "comments":         f.comments,
                "pilot_name":       f.pilot_name,
                "would_recommend":  f.would_recommend,
                "submitted_at":     f.submitted_at.isoformat() if f.submitted_at else None,
            }
            for f in feedbacks
        ]
    }