"""
services/ai_service.py – Gemini AI service
Updated to use google-genai (replaces deprecated google-generativeai)
With better error logging to diagnose Vercel issues
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
- Pesticide Spraying: Rs.599/acre
- Fertilizer Application: Rs.599/acre
- Crop Monitoring: Rs.420/acre
- Field Mapping: Rs.720/acre
- Soil Analysis: Rs.810/acre
Minimum charge: Rs.599

Be helpful, concise, and use simple language suitable for farmers.
Always respond in the same language as the user (Tamil or English).
Keep responses under 200 words for WhatsApp. Use emojis appropriately."""


class GeminiService:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self._client = None
        self._model_name = None
        self._use_new_sdk = False
        self._init_error = None
        self._last_error = None
        self._init_model()

    def _init_model(self):
        if not self.api_key:
            logger.warning("No Gemini API key provided")
            self._init_error = "No API key"
            return

        logger.info("Initializing Gemini AI with key: %s...", self.api_key[:8])

        # Try new google-genai package first
        try:
            from google import genai
            client = genai.Client(api_key=self.api_key)
            self._client = client
            self._model_name = "gemini-2.0-flash"
            self._use_new_sdk = True
            logger.info("Gemini AI ready (google-genai SDK): %s", self._model_name)
            return
        except ImportError as e:
            logger.warning("google-genai not available: %s", e)
        except Exception as e:
            logger.warning("google-genai init failed: %s", e)

        # Fall back to old google-generativeai
        try:
            import google.generativeai as genai
            genai.configure(api_key=self.api_key)
            for model_name in ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro"]:
                try:
                    client = genai.GenerativeModel(model_name)
                    self._client = client
                    self._model_name = model_name
                    self._use_new_sdk = False
                    logger.info("Gemini AI ready (google-generativeai SDK): %s", model_name)
                    return
                except Exception as me:
                    logger.warning("Model %s failed: %s", model_name, me)
                    continue
        except ImportError as e:
            logger.warning("google-generativeai not available: %s", e)
        except Exception as e:
            logger.warning("google-generativeai init failed: %s", e)

        self._init_error = "Both SDKs failed"
        logger.error("Gemini AI unavailable – all SDKs failed.")

    def ask(self, prompt: str, phone: str = "", intent: str = "general",
            db: Session = None) -> str:
        if not self._client:
            return ("I'm unable to answer right now (AI unavailable).\n\n"
                    "For bookings type *1*, for pricing type *3*, or type *menu*.")

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

            self._last_error = None
            logger.info("Gemini OK (%dms): %s...", int((time.time()-start)*1000), response_text[:60])

        except Exception as e:
            error_msg = str(e)
            self._last_error = error_msg
            logger.error("Gemini generate error [%s]: %s", type(e).__name__, e)
            response_text = ("I couldn't process that right now. "
                             "For bookings type *menu*. For support call us directly.")

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

    def status(self) -> dict:
        return {
            "available":  self._client is not None,
            "model":      self._model_name,
            "sdk":        "google-genai" if self._use_new_sdk else "google-generativeai",
            "error":      self._init_error,
            "last_error": self._last_error,
        }

    def test_call(self) -> dict:
        """Make a real test call and return detailed result."""
        if not self._client:
            return {"success": False, "error": f"Client not initialized: {self._init_error}"}
        import traceback
        try:
            start = time.time()
            if self._use_new_sdk:
                response = self._client.models.generate_content(
                    model=self._model_name,
                    contents="Say hello in one sentence.",
                )
                text = response.text.strip()
            else:
                response = self._client.generate_content("Say hello in one sentence.")
                text = response.text.strip()
            return {
                "success":    True,
                "response":   text,
                "latency_ms": int((time.time() - start) * 1000),
                "model":      self._model_name,
            }
        except Exception as e:
            return {
                "success":    False,
                "error":      str(e),
                "error_type": type(e).__name__,
                "error_module": type(e).__module__,
                "traceback":  traceback.format_exc()[-800:],
            }


# Singleton
_service: GeminiService = None

def init_ai(api_key: str):
    global _service
    _service = GeminiService(api_key)
    logger.info("AI init complete: %s", _service.status())

def get_ai() -> GeminiService:
    return _service