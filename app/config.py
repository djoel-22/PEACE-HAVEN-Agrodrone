"""
AgroDrone — Central Configuration (SECURE)
Loads all secrets from environment variables (.env)
"""

import os
from dotenv import load_dotenv

# Load .env file
load_dotenv()

# ── API Keys ──────────────────────────────────────────────────────────────────
GEMINI_API_KEY       = os.getenv("GEMINI_API_KEY")
OPENWEATHER_API_KEY  = os.getenv("OPENWEATHER_API_KEY")

# ── Twilio WhatsApp ───────────────────────────────────────────────────────────
TWILIO_ACCOUNT_SID   = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN    = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_PHONE_NUMBER  = os.getenv("TWILIO_PHONE_NUMBER")

# ── Ngrok / Public URL ────────────────────────────────────────────────────────
NGROK_URL            = os.getenv("NGROK_URL")

# ── Database ──────────────────────────────────────────────────────────────────
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./agrodrone.db")

# ── Pricing per hectare (INR) ─────────────────────────────────────────────────
RATES = {
    "pesticide_spray":  1200,
    "fertilizer_spray": 1000,
    "crop_monitoring":   800,
    "field_mapping":    1500,
    "soil_analysis":    2000,
}
MINIMUM_CHARGE = 1500

# ── Service metadata ──────────────────────────────────────────────────────────
SERVICE_META = {
    "pesticide_spray":  ("Pesticide Spraying",      "🌿"),
    "fertilizer_spray": ("Fertilizer Application",  "🌱"),
    "crop_monitoring":  ("Crop Monitoring",          "🔍"),
    "field_mapping":    ("Field Mapping & Analysis", "🗺️"),
    "soil_analysis":    ("Soil Analysis",            "🧪"),
}