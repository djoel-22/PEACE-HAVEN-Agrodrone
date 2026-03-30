"""
app/db/models.py  –  All SQLAlchemy ORM models for AgroDrone
EXTENDED v3: Added ClientUser model with secure auth fields,
             refresh_token + token_version to AdminUser for rotation,
             ServiceFeedback for post-service ratings,
             all original models preserved exactly.
"""
import enum
from datetime import datetime
from sqlalchemy import (Boolean, Column, DateTime, Enum, Float,
                        ForeignKey, Integer, String, Text, JSON)
from sqlalchemy.orm import relationship, declarative_base

Base = declarative_base()

# ── Enums ─────────────────────────────────────────────────────────────────────

class ServiceType(str, enum.Enum):
    PESTICIDE_SPRAY  = "pesticide_spray"
    FERTILIZER_SPRAY = "fertilizer_spray"
    CROP_MONITORING  = "crop_monitoring"
    FIELD_MAPPING    = "field_mapping"
    SOIL_ANALYSIS    = "soil_analysis"

class ServiceStatus(str, enum.Enum):
    PENDING     = "pending"
    SCHEDULED   = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED   = "completed"
    CANCELLED   = "cancelled"

class DroneStatus(str, enum.Enum):
    ACTIVE      = "active"
    STANDBY     = "standby"
    MAINTENANCE = "maintenance"
    OFFLINE     = "offline"

class BatteryAlertLevel(str, enum.Enum):
    GOOD     = "good"
    WARNING  = "warning"
    CRITICAL = "critical"

class JobStatus(str, enum.Enum):
    PENDING   = "pending"
    CONFIRMED = "confirmed"
    ACTIVE    = "active"
    DONE      = "done"
    CANCELLED = "cancelled"

# ── Original models (unchanged) ───────────────────────────────────────────────

class Customer(Base):
    __tablename__ = "customers"
    id                = Column(Integer, primary_key=True, index=True)
    name              = Column(String(120))
    phone_number      = Column(String(20), unique=True, index=True)
    district          = Column(String(80))
    registration_date = Column(DateTime, default=datetime.utcnow)
    notes             = Column(Text)
    service_requests  = relationship("ServiceRequest", back_populates="customer", cascade="all, delete-orphan")
    chat_messages     = relationship("ChatMessage", back_populates="customer", cascade="all, delete-orphan")

class ServiceRequest(Base):
    __tablename__ = "service_requests"
    id               = Column(Integer, primary_key=True, index=True)
    customer_id      = Column(Integer, ForeignKey("customers.id"))
    service_type     = Column(Enum(ServiceType, native_enum=False), default=ServiceType.PESTICIDE_SPRAY)
    crop_type        = Column(String(40))
    area_hectares    = Column(Float, default=1.0)
    field_location   = Column(String(200))
    status           = Column(Enum(ServiceStatus, native_enum=False), default=ServiceStatus.PENDING)
    estimated_cost   = Column(Float, default=0.0)
    actual_cost      = Column(Float)
    scheduled_date   = Column(DateTime)
    requested_date   = Column(DateTime, default=datetime.utcnow)
    completed_date   = Column(DateTime)
    created_date     = Column(DateTime, default=datetime.utcnow)
    assigned_pilot   = Column(String(80))
    assigned_drone   = Column(String(40))
    time_slot        = Column(String(20))
    notes            = Column(Text)
    source           = Column(String(20), default="whatsapp")
    tracking_token   = Column(String(64), unique=True, index=True)
    status_history   = Column(JSON, default=list)
    customer         = relationship("Customer", back_populates="service_requests")

class ChatMessage(Base):
    __tablename__ = "chat_messages"
    id          = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"))
    phone       = Column(String(20), index=True)
    role        = Column(String(10))
    message     = Column(Text)
    timestamp   = Column(DateTime, default=datetime.utcnow)
    is_ai       = Column(Boolean, default=False)
    intent      = Column(String(50))
    customer    = relationship("Customer", back_populates="chat_messages")

class Drone(Base):
    __tablename__ = "drones"
    id                 = Column(Integer, primary_key=True, index=True)
    drone_id           = Column(String(40), unique=True, index=True)
    model              = Column(String(80))
    status             = Column(Enum(DroneStatus, native_enum=False), default=DroneStatus.STANDBY)
    pilot_name         = Column(String(80))
    current_location   = Column(String(120))
    battery_level      = Column(Integer, default=100)
    flight_hours_today = Column(Float, default=0.0)
    total_flight_hours = Column(Float, default=0.0)
    last_maintenance   = Column(DateTime)
    next_maintenance   = Column(DateTime)
    notes              = Column(Text)
    registered_at      = Column(DateTime, default=datetime.utcnow)
    battery_cycles     = relationship("DroneBattery", back_populates="drone",
                                      cascade="all, delete-orphan",
                                      foreign_keys="DroneBattery.drone_db_id")

# ── Extended models ───────────────────────────────────────────────────────────

class DroneBattery(Base):
    __tablename__ = "drone_batteries"
    id                 = Column(Integer, primary_key=True, index=True)
    drone_db_id        = Column(Integer, ForeignKey("drones.id"), unique=True)
    drone_id           = Column(String(40), index=True)
    cycle_count        = Column(Integer, default=0)
    max_cycles         = Column(Integer, default=300)
    health_percentage  = Column(Float, default=100.0)
    alert_level        = Column(Enum(BatteryAlertLevel, native_enum=False), default=BatteryAlertLevel.GOOD)
    last_charged_at    = Column(DateTime)
    total_flight_hours = Column(Float, default=0.0)
    notes              = Column(Text)
    created_at         = Column(DateTime, default=datetime.utcnow)
    updated_at         = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    drone              = relationship("Drone", back_populates="battery_cycles",
                                      foreign_keys=[drone_db_id])

class ScheduledJob(Base):
    __tablename__ = "scheduled_jobs"
    id                  = Column(Integer, primary_key=True, index=True)
    service_request_id  = Column(Integer, ForeignKey("service_requests.id"), nullable=True)
    drone_id_str        = Column(String(40))
    pilot_name          = Column(String(80))
    title               = Column(String(200))
    scheduled_start     = Column(DateTime, nullable=False)
    scheduled_end       = Column(DateTime)
    location            = Column(String(200))
    status              = Column(Enum(JobStatus, native_enum=False), default=JobStatus.PENDING)
    notes               = Column(Text)
    color               = Column(String(10), default="#22c55e")
    created_at          = Column(DateTime, default=datetime.utcnow)

# ── Auth models ───────────────────────────────────────────────────────────────

class AdminUser(Base):
    __tablename__ = "admin_users"
    id                    = Column(Integer, primary_key=True, index=True)
    username              = Column(String(80), unique=True, index=True)
    password_hash         = Column(String(256))
    full_name             = Column(String(120))
    role                  = Column(String(20), default="admin")
    is_active             = Column(Boolean, default=True)
    refresh_token_hash    = Column(String(256), nullable=True)
    token_version         = Column(Integer, default=0)
    failed_login_attempts = Column(Integer, default=0)
    locked_until          = Column(DateTime, nullable=True)
    last_login            = Column(DateTime)
    last_login_ip         = Column(String(45), nullable=True)
    created_at            = Column(DateTime, default=datetime.utcnow)
    updated_at            = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ClientUser(Base):
    __tablename__ = "client_users"
    id                    = Column(Integer, primary_key=True, index=True)
    phone_number          = Column(String(20), unique=True, index=True, nullable=False)
    email                 = Column(String(120), unique=True, index=True, nullable=True)
    full_name             = Column(String(120))
    password_hash         = Column(String(256))
    refresh_token_hash    = Column(String(256), nullable=True)
    token_version         = Column(Integer, default=0)
    is_active             = Column(Boolean, default=True)
    is_verified           = Column(Boolean, default=False)
    failed_login_attempts = Column(Integer, default=0)
    locked_until          = Column(DateTime, nullable=True)
    customer_id           = Column(Integer, ForeignKey("customers.id"), nullable=True)
    last_login            = Column(DateTime)
    last_login_ip         = Column(String(45), nullable=True)
    created_at            = Column(DateTime, default=datetime.utcnow)
    updated_at            = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    customer              = relationship("Customer", foreign_keys=[customer_id])


class AILog(Base):
    __tablename__ = "ai_logs"
    id          = Column(Integer, primary_key=True, index=True)
    phone       = Column(String(20))
    prompt      = Column(Text)
    response    = Column(Text)
    model       = Column(String(50))
    intent      = Column(String(50))
    latency_ms  = Column(Integer)
    error       = Column(Text)
    created_at  = Column(DateTime, default=datetime.utcnow)


# ── Feedback model (NEW) ──────────────────────────────────────────────────────

class ServiceFeedback(Base):
    """Customer feedback after service completion."""
    __tablename__ = "service_feedback"
    id                 = Column(Integer, primary_key=True, index=True)
    service_request_id = Column(Integer, ForeignKey("service_requests.id"), unique=True)
    customer_id        = Column(Integer, ForeignKey("customers.id"))
    overall_rating     = Column(Integer, nullable=False)
    spray_quality      = Column(Integer, nullable=True)
    pilot_behavior     = Column(Integer, nullable=True)
    timeliness         = Column(Integer, nullable=True)
    comments           = Column(Text, nullable=True)
    pilot_name         = Column(String(80), nullable=True)
    would_recommend    = Column(Boolean, default=True)
    submitted_at       = Column(DateTime, default=datetime.utcnow)
    service_request    = relationship("ServiceRequest", foreign_keys=[service_request_id])
    customer           = relationship("Customer", foreign_keys=[customer_id])