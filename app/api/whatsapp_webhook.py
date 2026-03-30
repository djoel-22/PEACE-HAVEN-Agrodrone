"""
api/whatsapp_webhook.py – AgroDrone WhatsApp Bot (ENHANCED)
PRESERVED: All original number-based menu flow intact
FIXED: Pricing synced with website (₹599/acre), acres instead of hectares,
       booking questions match website, Gemini AI fallback working
"""
import logging
import re
from datetime import datetime, timedelta
from typing import Dict, Optional

from fastapi import APIRouter, Depends, Request
from fastapi.responses import Response, JSONResponse
from sqlalchemy.orm import Session

from app.config import GEMINI_API_KEY, MINIMUM_CHARGE, SERVICE_META
from app.db.database import get_db
from app.db.models import Customer, ServiceRequest, ServiceType, ServiceStatus, ChatMessage
from app.services.ai_service import get_ai

router = APIRouter(prefix="/whatsapp", tags=["WhatsApp"])
logger = logging.getLogger("agrodrone-whatsapp")

# ── Pricing (synced with website) ─────────────────────────────────────────────
PRICE_PER_ACRE = 599          # ₹599/acre – same as BookServicePage.tsx
ACRES_TO_HA    = 0.4047       # 1 acre = 0.4047 hectares

SERVICE_RATES_ACRE = {
    "pesticide_spray":  599,   # ₹599/acre
    "fertilizer_spray": 599,   # ₹599/acre
    "crop_monitoring":  420,   # ₹420/acre (~₹1,038/ha)
    "field_mapping":    720,   # ₹720/acre (~₹1,779/ha)
    "soil_analysis":    810,   # ₹810/acre (~₹2,000/ha)
}

_sessions: Dict[str, Dict] = {}

def _get_session(phone: str) -> Dict:
    if phone not in _sessions:
        _sessions[phone] = {"state": "main_menu", "data": {}, "last_intent": None, "last_order_id": None}
    return _sessions[phone]

def _clear_session(phone: str):
    last_order = _sessions.get(phone, {}).get("last_order_id")
    _sessions[phone] = {"state": "main_menu", "data": {}, "last_intent": None, "last_order_id": last_order}

MAIN_MENU = """\
🚁 *Welcome to Peace Haven Drones!*
Professional Agricultural Drone Services – Tamil Nadu

Reply with a number:
1️⃣  Place New Service Booking
2️⃣  Track My Order
3️⃣  Pricing & Services
4️⃣  My Booking History
5️⃣  Ask a Question (AI Support)\
"""

SERVICE_MENU = """\
✅ *Select Service Type:*

1️⃣  Pesticide Spraying     – ₹599/acre
2️⃣  Fertilizer Application  – ₹599/acre
3️⃣  Crop Monitoring         – ₹420/acre
4️⃣  Field Mapping           – ₹720/acre
5️⃣  Soil Analysis           – ₹810/acre

0️⃣  Back to Main Menu\
"""

AREA_PROMPT = """\
📐 *Enter your field area in acres:*

Type a number (e.g. *5* or *2.5*)
Minimum 0.5 acres · Maximum 1000 acres\
"""

DISTRICT_MENU = """\
📍 *Select your district:*

1️⃣  Coimbatore    2️⃣  Salem
3️⃣  Erode         4️⃣  Madurai
5️⃣  Tirunelveli   6️⃣  Trichy
7️⃣  Vellore       8️⃣  Thanjavur
9️⃣  Other – type your district name

0️⃣  Back\
"""

CROP_MENU = """\
🌾 *Select your crop type:*

1️⃣  Rice / Paddy   2️⃣  Wheat
3️⃣  Cotton         4️⃣  Sugarcane
5️⃣  Vegetables     6️⃣  Fruits
7️⃣  Groundnut      8️⃣  Other

0️⃣  Back\
"""

ADDRESS_PROMPT = """\
🏠 *Enter your farm address:*

Type your village/street name and area
(e.g. *Kannampalayam Village, Pollachi Taluk*)

0️⃣  Back\
"""

PRICING_INFO = """\
💰 *Peace Haven Drones – Service Rates:*

🌿 Pesticide Spraying     ₹599/acre
🌱 Fertilizer Application  ₹599/acre
🔍 Crop Monitoring         ₹420/acre
🗺️ Field Mapping           ₹720/acre
🧪 Soil Analysis           ₹810/acre

*Included in every service:*
✅ DGCA-certified pilot & GPS precision
✅ Real-time weather monitoring
✅ Service report within 24–48 hrs

⚠️ Pesticides & chemicals must be provided by the farmer.
Minimum charge: ₹599 per booking.

0️⃣  Back to Main Menu\
"""

DISTRICT_MAP = {
    "1": "Coimbatore", "2": "Salem",      "3": "Erode",
    "4": "Madurai",    "5": "Tirunelveli","6": "Trichy",
    "7": "Vellore",    "8": "Thanjavur",
}
CROP_MAP = {
    "1": "Rice / Paddy", "2": "Wheat",     "3": "Cotton",
    "4": "Sugarcane",    "5": "Vegetables","6": "Fruits",
    "7": "Groundnut",    "8": "Other",
}
SERVICE_MAP = {
    "1": "pesticide_spray",  "2": "fertilizer_spray",
    "3": "crop_monitoring",  "4": "field_mapping",    "5": "soil_analysis",
}

_AI_TRIGGERS = re.compile(
    r"(how|what|why|when|where|which|who|is|are|does|do|can|will|should|tell|explain|"
    r"advise|help|suggest|recommend|best|disease|pest|weather|rain|spray|fertilizer|"
    r"pesticide|crop|harvest|soil|yield|price|cost|acre|problem|issue)",
    re.IGNORECASE
)

def _should_use_ai(text: str, state: str) -> bool:
    if state not in ("main_menu", "ai_mode"):
        return False
    if len(text) < 6 or text.strip().isdigit():
        return False
    if text.upper() in ("MENU", "START", "HI", "HELLO", "HEY", "VANAKKAM"):
        return False
    return bool(_AI_TRIGGERS.search(text))

def _ai_reply(phone: str, text: str, session: dict, db: Session) -> str:
    try:
        ai = get_ai()
        if not ai or not ai.is_available():
            return ("🤖 AI assistant temporarily unavailable.\n\n"
                    "Type *1* to book a service or *3* for pricing.\n"
                    "Type *menu* to see all options.")
        cust = _get_or_create_customer(phone, db)
        session["last_intent"] = "ai_query"
        context = f"\n(Customer's last order: AGR{session['last_order_id']:04d})" if session.get("last_order_id") else ""
        response = ai.ask(text + context, phone=phone, intent="whatsapp_query", db=db)
        _log_chat(phone, "ai", response, cust.id, db, is_ai=True, intent="ai_query")
        return response + "\n\n_Type *menu* to return to booking options._"
    except Exception as e:
        logger.error(f"AI reply error: {e}")
        return ("🤖 AI assistant encountered an error.\n\n"
                "Type *menu* to use the booking system.")

def _get_or_create_customer(phone: str, db: Session) -> Customer:
    cust = db.query(Customer).filter(Customer.phone_number == phone).first()
    if not cust:
        cust = Customer(phone_number=phone, name=f"Farmer ({phone[-4:]})", district="Unknown")
        db.add(cust)
        db.flush()
    return cust

def _log_chat(phone: str, role: str, message: str, customer_id: int,
              db: Session, is_ai: bool = False, intent: str = None):
    try:
        db.add(ChatMessage(
            phone=phone, role=role, message=message,
            customer_id=customer_id, is_ai=is_ai, intent=intent,
            timestamp=datetime.utcnow(),
        ))
    except Exception as e:
        logger.warning(f"Chat log failed: {e}")

def _create_service_request(phone: str, data: dict, db: Session) -> ServiceRequest:
    from app.services.tracking_service import generate_token
    cust = _get_or_create_customer(phone, db)
    if not cust.district or cust.district == "Unknown":
        cust.district = data.get("district", "Unknown")
    if cust.name and cust.name.startswith("Farmer ("):
        pass  # keep auto-name until they provide real name

    scheduled_dt = datetime.strptime(data["scheduled_date"], "%Y-%m-%d")

    # Convert acres to hectares for storage (backend stores hectares)
    area_acres = data.get("area_acres", 1.0)
    area_ha    = round(area_acres * ACRES_TO_HA, 2)

    full_location = f"{data.get('address', '')}, {data.get('district', 'Tamil Nadu')}, Tamil Nadu".strip(", ")

    req = ServiceRequest(
        customer_id    = cust.id,
        service_type   = ServiceType(data["service_type"]),
        crop_type      = data.get("crop_type", ""),
        area_hectares  = area_ha,
        field_location = full_location,
        status         = ServiceStatus.PENDING,
        estimated_cost = data.get("estimated_cost", 0),
        scheduled_date = scheduled_dt,
        source         = "whatsapp",
        tracking_token = generate_token(),
        status_history = [{"status": "pending", "timestamp": datetime.utcnow().isoformat(),
                           "note": "Booked via WhatsApp", "actor": "whatsapp_bot"}],
    )
    db.add(req)
    db.flush()
    return req

def _date_menu() -> str:
    lines = ["📅 *Select preferred service date:*\n"]
    for i in range(1, 6):
        d = datetime.now() + timedelta(days=i)
        lines.append(f"{i}️⃣  {d.strftime('%A, %d %B')}")
    d7 = datetime.now() + timedelta(days=7)
    lines.append(f"6️⃣  {d7.strftime('%A, %d %B')} (Next Week)")
    lines.append("\n0️⃣  Back")
    return "\n".join(lines)

def _order_summary(data: dict) -> str:
    meta = SERVICE_META.get(data.get("service_type", ""), ("Service", "🛠️"))
    area_acres = data.get("area_acres", 0)
    return (f"📋 *BOOKING SUMMARY – Please confirm:*\n\n"
            f"{meta[1]} Service:  *{meta[0]}*\n"
            f"📐 Area:      *{area_acres} acres*\n"
            f"📍 District:  *{data.get('district')}*\n"
            f"🏠 Address:   *{data.get('address', 'Not provided')}*\n"
            f"🌾 Crop:      *{data.get('crop_type', '')}*\n"
            f"📅 Date:      *{data.get('scheduled_display')}*\n"
            f"💰 Total:     *₹{data.get('estimated_cost', 0):,}*\n"
            f"   (₹{data.get('rate_per_acre', PRICE_PER_ACRE)}/acre × {area_acres} acres)\n\n"
            f"Reply *YES* to confirm or *NO* to cancel.")


def _process(phone: str, text: str, db: Session) -> str:
    session  = _get_session(phone)
    state    = session["state"]
    data     = session["data"]
    text_raw = text.strip()
    text     = text_raw.lower().strip()
    cust     = _get_or_create_customer(phone, db)

    _log_chat(phone, "user", text_raw, cust.id, db)

    # Global reset
    if text in ("menu", "start", "restart", "home", "0", "main"):
        _clear_session(phone)
        reply = MAIN_MENU
        _log_chat(phone, "bot", reply, cust.id, db)
        db.commit()
        return reply

    if state == "main_menu":
        if _should_use_ai(text_raw, state):
            reply = _ai_reply(phone, text_raw, session, db)
            db.commit()
            return reply
        if text == "1":
            session["state"] = "select_service"
            reply = SERVICE_MENU
        elif text == "2":
            session["state"] = "track_order_input"
            reply = "🔍 *Track Your Order*\n\nPlease enter your Booking ID (e.g. *AGR0042*):"
        elif text == "3":
            reply = PRICING_INFO
        elif text == "4":
            orders = db.query(ServiceRequest).filter(
                ServiceRequest.customer_id == cust.id
            ).order_by(ServiceRequest.created_date.desc()).limit(5).all()
            if not orders:
                reply = "📋 No bookings found.\n\nType *1* to place a new booking."
            else:
                lines = ["📋 *Your Recent Bookings:*\n"]
                icons = {"pending":"⏳","scheduled":"📅","in_progress":"🚁","completed":"✅","cancelled":"❌"}
                for r in orders:
                    meta = SERVICE_META.get(r.service_type.value, ("Service","🛠️"))
                    ic   = icons.get(r.status.value, "📋")
                    lines.append(f"{ic} *#AGR{r.id:04d}* – {meta[0]}")
                    lines.append(f"   💰 ₹{r.estimated_cost:,.0f} | {r.status.value.replace('_',' ').title()}\n")
                lines.append("Type *2* to track a specific order.")
                reply = "\n".join(lines)
        elif text == "5":
            session["state"] = "ai_mode"
            reply = ("🤖 *Peace Haven AI Assistant*\n\n"
                     "Ask me anything about farming, crops, spraying best practices, or our services.\n\n"
                     "Type *menu* to go back.")
        elif text in ("hi", "hello", "hey", "vanakkam"):
            name = cust.name.split("(")[0].strip() if cust.name else "Farmer"
            reply = f"🙏 Hello {name}!\n\n" + MAIN_MENU
        else:
            reply = f"Please reply with a number 1–5.\n\n{MAIN_MENU}"
        _log_chat(phone, "bot", reply, cust.id, db)
        db.commit()
        return reply

    if state == "ai_mode":
        reply = _ai_reply(phone, text_raw, session, db)
        db.commit()
        return reply

    if state == "track_order_input":
        from app.services.tracking_service import get_by_booking_id, order_tracking_dict
        req = get_by_booking_id(text_raw, db)
        if not req:
            reply = "❌ Order not found. Check your Booking ID (e.g. *AGR0042*).\nType *menu* to go back."
        else:
            info = order_tracking_dict(req, db)
            icons = {"pending":"⏳","scheduled":"📅","in_progress":"🚁","completed":"✅","cancelled":"❌"}
            ic   = icons.get(info["status"], "📋")
            meta = SERVICE_META.get(req.service_type.value, ("Service","🛠️"))
            steps = ["📋 Placed","📅 Scheduled","🚁 In Progress","✅ Completed"]
            step_str = "\n".join(
                f"{'▶️' if i <= info['current_step'] else '  '} {s}"
                for i, s in enumerate(steps)
            )
            reply = (f"{ic} *Order #{info['booking_id']} Status*\n\n{step_str}\n\n"
                     f"Service: {meta[1]} {meta[0]}\n"
                     f"Location: {info['location']}\n"
                     f"Amount: ₹{info['estimated_cost']:,.0f}\n"
                     f"Drone: {info['assigned_drone'] or 'Not assigned yet'}\n\n"
                     "Type *menu* to return.")
            session["last_order_id"] = req.id
        _clear_session(phone)
        _log_chat(phone, "bot", reply, cust.id, db)
        db.commit()
        return reply

    if state == "select_service":
        if text == "0":
            _clear_session(phone); reply = MAIN_MENU
        elif text in SERVICE_MAP:
            svc = SERVICE_MAP[text]
            data["service_type"]   = svc
            data["rate_per_acre"]  = SERVICE_RATES_ACRE[svc]
            session["state"]       = "enter_area"
            reply = AREA_PROMPT
        else:
            reply = "Please reply 1–5 or 0.\n\n" + SERVICE_MENU
        _log_chat(phone, "bot", reply, cust.id, db); db.commit()
        return reply

    if state == "enter_area":
        if text == "0":
            session["state"] = "select_service"; reply = SERVICE_MENU
            _log_chat(phone, "bot", reply, cust.id, db); db.commit()
            return reply
        try:
            area = float(text)
            if area < 0.5:
                reply = "⚠️ Minimum area is 0.5 acres.\n\n" + AREA_PROMPT
                _log_chat(phone, "bot", reply, cust.id, db); db.commit()
                return reply
            if area > 1000:
                reply = "⚠️ Maximum area is 1000 acres. Please contact us directly.\n\n" + AREA_PROMPT
                _log_chat(phone, "bot", reply, cust.id, db); db.commit()
                return reply
            data["area_acres"]     = area
            rate                   = data.get("rate_per_acre", PRICE_PER_ACRE)
            cost                   = max(round(area * rate / 50) * 50, MINIMUM_CHARGE)
            data["estimated_cost"] = cost
            session["state"]       = "select_district"
            reply = f"✅ Area: *{area} acres* · Cost: *₹{cost:,}*\n\n" + DISTRICT_MENU
        except ValueError:
            reply = "Enter a valid number (e.g. *5* or *2.5*).\n\n" + AREA_PROMPT
        _log_chat(phone, "bot", reply, cust.id, db); db.commit()
        return reply

    if state == "select_district":
        if text in DISTRICT_MAP:
            data["district"]   = DISTRICT_MAP[text]
            session["state"]   = "enter_address"
            reply = f"✅ District: *{data['district']}*\n\n" + ADDRESS_PROMPT
        elif text == "9":
            session["state"] = "enter_custom_district"
            reply = "Please type your district name:"
        elif text == "0":
            session["state"] = "enter_area"; reply = AREA_PROMPT
        else:
            reply = "Reply 1–9 or 0.\n\n" + DISTRICT_MENU
        _log_chat(phone, "bot", reply, cust.id, db); db.commit()
        return reply

    if state == "enter_custom_district":
        if len(text) < 2:
            reply = "Please enter a valid district name:"
            _log_chat(phone, "bot", reply, cust.id, db); db.commit()
            return reply
        data["district"]   = text_raw.title()
        session["state"]   = "enter_address"
        reply = f"✅ District: *{data['district']}*\n\n" + ADDRESS_PROMPT
        _log_chat(phone, "bot", reply, cust.id, db); db.commit()
        return reply

    if state == "enter_address":
        if text == "0":
            session["state"] = "select_district"; reply = DISTRICT_MENU
            _log_chat(phone, "bot", reply, cust.id, db); db.commit()
            return reply
        if len(text_raw) < 3:
            reply = "Please enter your farm address (village/street name):"
            _log_chat(phone, "bot", reply, cust.id, db); db.commit()
            return reply
        data["address"]  = text_raw
        session["state"] = "select_crop"
        reply = f"✅ Address: *{text_raw}*\n\n" + CROP_MENU
        _log_chat(phone, "bot", reply, cust.id, db); db.commit()
        return reply

    if state == "select_crop":
        if text in CROP_MAP:
            data["crop_type"]  = CROP_MAP[text]
            session["state"]   = "select_date"
            reply = _date_menu()
        elif text == "0":
            session["state"] = "enter_address"; reply = ADDRESS_PROMPT
        else:
            reply = "Reply 1–8 or 0.\n\n" + CROP_MENU
        _log_chat(phone, "bot", reply, cust.id, db); db.commit()
        return reply

    if state == "select_date":
        try:
            choice = int(text)
            if choice == 0:
                session["state"] = "select_crop"; reply = CROP_MENU
                _log_chat(phone, "bot", reply, cust.id, db); db.commit()
                return reply
            elif 1 <= choice <= 5:
                chosen = datetime.now() + timedelta(days=choice)
            elif choice == 6:
                chosen = datetime.now() + timedelta(days=7)
            else:
                reply = "Reply 1–6 or 0.\n\n" + _date_menu()
                _log_chat(phone, "bot", reply, cust.id, db); db.commit()
                return reply
            data["scheduled_date"]    = chosen.strftime("%Y-%m-%d")
            data["scheduled_display"] = chosen.strftime("%A, %d %B %Y")
            session["state"]          = "confirm_order"
            reply = _order_summary(data)
        except ValueError:
            reply = "Reply with a number.\n\n" + _date_menu()
        _log_chat(phone, "bot", reply, cust.id, db); db.commit()
        return reply

    if state == "confirm_order":
        if text.upper() in ("YES", "Y", "CONFIRM", "OK", "1"):
            try:
                req = _create_service_request(phone, data, db)
                session["last_order_id"] = req.id
                _clear_session(phone)
                meta = SERVICE_META.get(data["service_type"], ("Service", "🛠️"))
                reply = (f"✅ *BOOKING CONFIRMED!*\n\n"
                         f"📋 *Booking ID: #AGR{req.id:04d}*\n"
                         f"• Service: {meta[1]} {meta[0]}\n"
                         f"• Area: {data.get('area_acres')} acres\n"
                         f"• District: {data.get('district')}\n"
                         f"• Address: {data.get('address', 'Not provided')}\n"
                         f"• Crop: {data.get('crop_type')}\n"
                         f"• Date: {data.get('scheduled_display')}\n"
                         f"• Total: ₹{data.get('estimated_cost', 0):,}\n\n"
                         f"📞 Our team will contact you within 2 hours.\n"
                         f"Type *2* to track this order anytime.")
                _log_chat(phone, "bot", reply, req.customer_id, db)
                db.commit()
            except Exception as e:
                logger.error(f"Order creation error: {e}")
                db.rollback()
                reply = "❌ Something went wrong. Please try again or type *menu* to restart."
            return reply
        elif text.upper() in ("NO", "N", "CANCEL", "2"):
            _clear_session(phone)
            reply = "❌ Booking cancelled.\n\nType *menu* to start a new booking."
            _log_chat(phone, "bot", reply, cust.id, db); db.commit()
            return reply
        else:
            return "Reply *YES* to confirm or *NO* to cancel.\n\n" + _order_summary(data)

    _clear_session(phone)
    reply = "Let's start fresh! " + MAIN_MENU
    _log_chat(phone, "bot", reply, cust.id, db); db.commit()
    return reply


def _twiml(body: str) -> Response:
    safe = body.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    xml  = f'<?xml version="1.0" encoding="UTF-8"?><Response><Message>{safe}</Message></Response>'
    return Response(content=xml, media_type="application/xml")


@router.post("/webhook")
async def whatsapp_webhook(request: Request, db: Session = Depends(get_db)):
    content_type = request.headers.get("content-type", "")
    try:
        if "application/x-www-form-urlencoded" in content_type:
            form  = await request.form()
            raw   = dict(form)
            phone = raw.get("From", "").replace("whatsapp:", "")
            text  = raw.get("Body", "").strip()
        else:
            raw   = await request.json()
            phone = raw.get("From", raw.get("phone_number", "")).replace("whatsapp:", "")
            text  = raw.get("Body", raw.get("message_text", "")).strip()

        if not phone or not text:
            return _twiml("Please send a message to get started.")

        logger.info(f"▶ {phone}: {text!r}")
        reply = _process(phone, text, db)
        logger.info(f"◀ {phone}: {reply[:60]!r}…")

        if "From" in raw:
            return _twiml(reply)
        return JSONResponse({"status": "ok", "reply": reply})

    except Exception as e:
        logger.error(f"Webhook error: {e}", exc_info=True)
        return _twiml("Sorry, a technical issue occurred. Please type *menu* to restart.")


@router.get("/webhook")
async def verify_webhook(request: Request):
    challenge = request.query_params.get("hub.challenge")
    if challenge:
        return Response(content=challenge, media_type="text/plain")
    return JSONResponse({"status": "ok"})


@router.get("/test")
async def test_bot(msg: str = "hello", phone: str = "+910000000000",
                   db: Session = Depends(get_db)):
    reply = _process(phone, msg, db)
    return {"phone": phone, "input": msg, "reply": reply}