"""
services/ai_service.py — Gemini AI service
Updated to use google-genai (replaces deprecated google-generativeai)
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
- Pesticide Spraying: Rs.1,200/hectare
- Fertilizer Application: Rs.1,000/hectare
- Crop Monitoring: Rs.800/hectare
- Field Mapping: Rs.1,500/hectare
- Soil Analysis: Rs.2,000/hectare
Minimum charge: Rs.1,500

Be helpful, concise, and use simple language suitable for farmers.
Always respond in the same language as the user (Tamil or English).
Keep responses under 200 words for WhatsApp. Use emojis appropriately."""


class GeminiService:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self._client = None
        self._model_name = None
        self._use_new_sdk = False
        self._init_model()

    def _init_model(self):
        if not self.api_key:
            logger.warning("No Gemini API key provided")
            return

        # Try new google-genai package first
        try:
            from google import genai
            self._client = genai.Client(api_key=self.api_key)
            self._model_name = "gemini-2.0-flash"
            self._use_new_sdk = True
            logger.info("✅ Gemini AI ready (new SDK): %s", self._model_name)
            return
        except ImportError:
            pass
        except Exception as e:
            logger.warning("New Gemini SDK failed: %s", e)

        # Fall back to old google-generativeai
        try:
            import google.generativeai as genai
            genai.configure(api_key=self.api_key)
            for model_name in ["gemini-1.5-flash", "gemini-pro"]:
                try:
                    self._client = genai.GenerativeModel(model_name)
                    self._model_name = model_name
                    self._use_new_sdk = False
                    logger.info("✅ Gemini AI ready (old SDK): %s", model_name)
                    return
                except Exception:
                    continue
        except ImportError:
            pass
        except Exception as e:
            logger.warning("Old Gemini SDK failed: %s", e)

        logger.warning("⚠️  Gemini AI unavailable")

    def ask(self, prompt: str, phone: str = "", intent: str = "general",
            db: Session = None) -> str:
        if not self._client:
            return "AI assistant is temporarily unavailable. Please type *menu* to use the booking system."

        full_prompt = f"{AGRO_SYSTEM_PROMPT}\n\nUser message: {prompt}"
        start = time.time()
        error_msg = None
        response_text = ""

        try:
            if self._use_new_sdk:
                response = self._client.models.generate_content(
                    model=self._model_name,
                    contents=full_prompt,
                )
                response_text = response.text.strip()
            else:
                response = self._client.generate_content(full_prompt)
                response_text = response.text.strip()
        except Exception as e:
            error_msg = str(e)
            logger.error("Gemini error: %s", e)
            response_text = ("I couldn't process that right now. "
                             "For bookings, type *menu*. For support, call us directly.")

        latency_ms = int((time.time() - start) * 1000)

        if db:
            try:
                db.add(AILog(
                    phone=phone,
                    prompt=prompt[:500],
                    response=response_text[:1000],
                    model=self._model_name or "unknown",
                    intent=intent,
                    latency_ms=latency_ms,
                    error=error_msg,
                    created_at=datetime.utcnow(),
                ))
                db.commit()
            except Exception as le:
                logger.warning("AI log write failed: %s", le)

        return response_text

    def is_available(self) -> bool:
        return self._client is not None


# Singleton
_service: GeminiService = None

def init_ai(api_key: str):
    global _service
    _service = GeminiService(api_key)

def get_ai() -> GeminiService:
    return _service