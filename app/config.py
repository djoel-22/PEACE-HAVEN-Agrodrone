"""app/config.py — Centralised configuration loaded from environment variables."""
import os
from dotenv import load_dotenv

load_dotenv()

# ── API Keys ──────────────────────────────────────────────────────────────────
GEMINI_API_KEY       = os.getenv("GEMINI_API_KEY", "")
OPENWEATHER_API_KEY  = os.getenv("OPENWEATHER_API_KEY", "")
TWILIO_ACCOUNT_SID   = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN    = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_PHONE_NUMBER  = os.getenv("TWILIO_PHONE_NUMBER", "")
NGROK_URL            = os.getenv("NGROK_URL", "http://localhost:8000")

# ── Database ──────────────────────────────────────────────────────────────────
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./agrodrone.db")

# ── Pricing ───────────────────────────────────────────────────────────────────
# Frontend collects land size in ACRES. Backend stores area_hectares.
# Conversion: 1 acre = 0.4047 hectares
# Customer-facing price: ₹599 per acre
# Backend rate (per hectare) = 599 / 0.4047 ≈ 1480 INR/ha

PRICE_PER_ACRE = 599          # ₹ — shown to farmer on booking page
ACRES_TO_HA    = 0.4047       # conversion factor

RATES = {
    "pesticide_spray":  round(PRICE_PER_ACRE / ACRES_TO_HA),   # ≈ 1480 / ha
    "fertilizer_spray": round(PRICE_PER_ACRE / ACRES_TO_HA),   # same rate
    "crop_monitoring":  round((PRICE_PER_ACRE * 0.7) / ACRES_TO_HA),  # 70% of spray rate
    "field_mapping":    round((PRICE_PER_ACRE * 1.2) / ACRES_TO_HA),  # premium
    "soil_analysis":    round((PRICE_PER_ACRE * 1.5) / ACRES_TO_HA),  # premium
}

# Minimum charge regardless of area
MINIMUM_CHARGE = PRICE_PER_ACRE * 1   # minimum = 1 acre worth = ₹599

# ── Service metadata ──────────────────────────────────────────────────────────
SERVICE_META = {
    "pesticide_spray":  ("Pesticide Spraying",      "🌿"),
    "fertilizer_spray": ("Fertilizer Application",  "🌱"),
    "crop_monitoring":  ("Crop Monitoring",          "🔍"),
    "field_mapping":    ("Field Mapping & Analysis", "🗺️"),
    "soil_analysis":    ("Soil Analysis",            "🧪"),
}
