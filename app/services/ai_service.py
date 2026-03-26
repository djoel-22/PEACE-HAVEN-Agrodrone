"""
services/ai_service.py — Gemini AI fallback service (Feature 3)
Logs every call to AILog table.
"""
import time
import logging
from datetime import datetime
from sqlalchemy.orm import Session
from app.db.models import AILog

logger = logging.getLogger("agrodrone-ai")

AGRO_SYSTEM_PROMPT = """You are AgroDrone AI Assistant, an expert agricultural drone service assistant 
for Tamil Nadu, India. You help farmers with:
- Drone spraying services (pesticides, fertilizers)
- Crop health and agricultural advice
- Service booking questions
- Weather and farming decisions
- Pricing and service information

Services offered:
- Pesticide Spraying: ₹1,200/hectare
- Fertilizer Application: ₹1,000/hectare  
- Crop Monitoring: ₹800/hectare
- Field Mapping: ₹1,500/hectare
- Soil Analysis: ₹2,000/hectare
Minimum charge: ₹1,500

Be helpful, concise, and use simple language suitable for farmers.
Always respond in the same language as the user (Tamil or English).
Keep responses under 200 words for WhatsApp. Use emojis appropriately."""


class GeminiService:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self._model = None
        self._model_name = None
        self._init_model()

    def _init_model(self):
        if not self.api_key:
            return
        try:
            import google.generativeai as genai
            genai.configure(api_key=self.api_key)
            for name in ["gemini-1.5-flash", "gemini-pro", "gemini-1.0-pro"]:
                try:
                    self._model = genai.GenerativeModel(name)
                    self._model_name = name
                    logger.info(f"✅ Gemini AI ready: {name}")
                    break
                except Exception:
                    continue
        except ImportError:
            logger.warning("google-generativeai not installed")
        except Exception as e:
            logger.warning(f"Gemini init failed: {e}")

    def ask(self, prompt: str, phone: str = "", intent: str = "general",
            db: Session = None) -> str:
        if not self._model:
            return "🤖 AI assistant is temporarily unavailable. Please type *menu* to use the booking system."

        full_prompt = f"{AGRO_SYSTEM_PROMPT}\n\nUser message: {prompt}"
        start = time.time()
        error_msg = None
        response_text = ""

        try:
            response = self._model.generate_content(full_prompt)
            response_text = response.text.strip()
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Gemini error: {e}")
            response_text = ("🌾 I couldn't process that right now. "
                             "For bookings, type *menu*. For support, call us directly.")

        latency_ms = int((time.time() - start) * 1000)

        # Log to DB
        if db:
            try:
                log = AILog(
                    phone=phone,
                    prompt=prompt[:500],
                    response=response_text[:1000],
                    model=self._model_name or "unknown",
                    intent=intent,
                    latency_ms=latency_ms,
                    error=error_msg,
                    created_at=datetime.utcnow(),
                )
                db.add(log)
                db.commit()
            except Exception as le:
                logger.warning(f"AI log write failed: {le}")

        return response_text

    def is_available(self) -> bool:
        return self._model is not None


# Singleton — initialized once with config
_service: GeminiService = None

def init_ai(api_key: str):
    global _service
    _service = GeminiService(api_key)

def get_ai() -> GeminiService:
    return _service
