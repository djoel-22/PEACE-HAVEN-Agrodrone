"""
AgroDrone — Complete Backend (Single File)
==========================================
Uses only: fastapi, uvicorn, sqlite3 (built-in), requests (built-in-ish)
Run: python -m uvicorn app.server:app --reload --port 8000
"""

import sqlite3
import json
import logging
import re
import sys
import os
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, Request, Response
from fastapi.responses import FileResponse, JSONResponse, HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# ── Config (SECURE: use .env) ────────────────────────────────────────────────
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY      = os.getenv("GEMINI_API_KEY")
OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY")
TWILIO_ACCOUNT_SID  = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN   = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER")
NGROK_URL           = os.getenv("NGROK_URL", "http://localhost:8000")
DB_PATH             = str(Path(__file__).parent.parent / "agrodrone.db")

RATES = {
    "pesticide_spray": 1200, "fertilizer_spray": 1000,
    "crop_monitoring": 800,  "field_mapping": 1500, "soil_analysis": 2000,
}
MIN_CHARGE = 1500

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
log = logging.getLogger("agrodrone")

# ── Gemini (optional) ─────────────────────────────────────────────────────────
_gemini = None
try:
    import google.generativeai as genai
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY not set in environment")
    genai.configure(api_key=GEMINI_API_KEY)
    for _mn in ["gemini-1.5-flash", "gemini-pro", "gemini-1.0-pro"]:
        try:
            _gemini = genai.GenerativeModel(_mn)
            log.info(f"✅ Gemini ready: {_mn}")
            break
        except Exception:
            continue
except Exception as e:
    log.warning(f"Gemini unavailable: {e} — AI answers disabled")

# ── DB ────────────────────────────────────────────────────────────────────────

def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn

def init_db():
    with get_conn() as conn:
        conn.executescript("""
        CREATE TABLE IF NOT EXISTS customers (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            name            TEXT,
            phone_number    TEXT UNIQUE,
            district        TEXT,
            registration_date TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS service_requests (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id     INTEGER,
            service_type    TEXT DEFAULT 'pesticide_spray',
            crop_type       TEXT,
            area_hectares   REAL DEFAULT 1.0,
            field_location  TEXT,
            status          TEXT DEFAULT 'pending',
            estimated_cost  REAL DEFAULT 0,
            actual_cost     REAL,
            scheduled_date  TEXT,
            requested_date  TEXT DEFAULT (datetime('now')),
            created_date    TEXT DEFAULT (datetime('now')),
            time_slot       TEXT,
            source          TEXT DEFAULT 'whatsapp',
            notes           TEXT,
            assigned_pilot  TEXT,
            assigned_drone  TEXT
        );
        CREATE TABLE IF NOT EXISTS drones (
            id                  INTEGER PRIMARY KEY AUTOINCREMENT,
            drone_id            TEXT UNIQUE,
            model               TEXT,
            status              TEXT DEFAULT 'standby',
            pilot_name          TEXT,
            current_location    TEXT,
            battery_level       INTEGER DEFAULT 100,
            flight_hours_today  REAL DEFAULT 0,
            total_flight_hours  REAL DEFAULT 0,
            next_maintenance    TEXT,
            notes               TEXT
        );
        CREATE TABLE IF NOT EXISTS chat_messages (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id INTEGER,
            phone       TEXT,
            role        TEXT,
            message     TEXT,
            timestamp   TEXT DEFAULT (datetime('now'))
        );
        """)
        # Seed drone fleet if empty
        if conn.execute("SELECT COUNT(*) FROM drones").fetchone()[0] == 0:
            conn.executemany(
                "INSERT INTO drones(drone_id,model,status,pilot_name,current_location,battery_level,flight_hours_today,total_flight_hours,notes) VALUES(?,?,?,?,?,?,?,?,?)",
                [
                    ("AGR-001","DJI Agras T30","active","Muthu Vel","Coimbatore",85,3.5,245.5,None),
                    ("AGR-002","DJI Agras T30","active","Kumar Raja","Salem",72,4.2,189.2,None),
                    ("AGR-003","DJI Agras T40","maintenance",None,"Service Center",23,0,412.0,"Motor check"),
                    ("AGR-004","DJI Agras T30","active","Senthil Kumar","Erode",91,3.1,178.6,None),
                    ("AGR-005","DJI Agras MG-1P","active","Ravi Kumar","Madurai",67,5.8,302.1,None),
                    ("AGR-006","DJI Agras T30","standby","Available","Chennai Depot",100,0,98.4,None),
                ]
            )
            log.info("✅ Seeded 6 drones")
    log.info(f"✅ DB ready: {DB_PATH}")

# ── DB helpers ────────────────────────────────────────────────────────────────

def get_or_create_customer(phone: str, name: str = None) -> int:
    with get_conn() as conn:
        row = conn.execute("SELECT id FROM customers WHERE phone_number=?", (phone,)).fetchone()
        if row:
            return row["id"]
        display = name or f"Farmer {phone[-4:]}"
        cur = conn.execute("INSERT INTO customers(name,phone_number) VALUES(?,?)", (display, phone))
        return cur.lastrowid

def log_chat(phone: str, customer_id: int, role: str, message: str):
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO chat_messages(customer_id,phone,role,message) VALUES(?,?,?,?)",
            (customer_id, phone, role, message[:2000])
        )

# ── Weather ───────────────────────────────────────────────────────────────────

TN_CITIES = {
    "Chennai":    "Chennai,IN",    "Coimbatore": "Coimbatore,IN",
    "Madurai":    "Madurai,IN",    "Salem":      "Salem,IN",
    "Erode":      "Erode,IN",      "Trichy":     "Tiruchirappalli,IN",
    "Tirunelveli":"Tirunelveli,IN","Vellore":    "Vellore,IN",
    "Thanjavur":  "Thanjavur,IN",  "Tirupur":    "Tiruppur,IN",
}

def fetch_weather(city: str = "Chennai") -> dict:
    fallback = {
        "city": city, "temperature": 28, "feels_like": 31, "humidity": 65,
        "wind_speed": 8.0, "wind_direction": "NW", "visibility": 10.0,
        "pressure": 1012, "condition": "Partly Cloudy", "condition_icon": "02d",
        "suitable_for_spraying": True, "source": "Estimated",
        "last_updated": datetime.now().strftime("%d %b %Y, %I:%M %p"),
        "wind_gust": 5, "temp_min": 24, "temp_max": 34,
    }
    if not OPENWEATHER_API_KEY:
        return fallback
    try:
        import urllib.request, urllib.parse
        q = TN_CITIES.get(city, city + ",IN")
        url = f"http://api.openweathermap.org/data/2.5/weather?q={urllib.parse.quote(q)}&appid={OPENWEATHER_API_KEY}&units=metric"
        with urllib.request.urlopen(url, timeout=6) as resp:
            d = json.loads(resp.read())
        wind  = round(d["wind"]["speed"] * 3.6, 1)
        temp  = round(d["main"]["temp"], 1)
        hum   = d["main"]["humidity"]
        dirs  = ["N","NE","E","SE","S","SW","W","NW"]
        wdir  = dirs[round(d.get("wind",{}).get("deg",0)/45)%8]
        icon  = d["weather"][0]["icon"] if d.get("weather") else "01d"
        return {
            "city": city, "temperature": temp,
            "feels_like": round(d["main"].get("feels_like", temp), 1),
            "temp_min": round(d["main"].get("temp_min", temp), 1),
            "temp_max": round(d["main"].get("temp_max", temp), 1),
            "humidity": hum, "wind_speed": wind, "wind_direction": wdir,
            "wind_gust": round(d.get("wind",{}).get("gust",0)*3.6, 1),
            "visibility": round(d.get("visibility",10000)/1000, 1),
            "pressure": d["main"]["pressure"],
            "condition": d["weather"][0]["description"].title() if d.get("weather") else "Clear",
            "condition_icon": icon,
            "suitable_for_spraying": wind < 15 and hum < 90 and 10 < temp < 38,
            "source": "OpenWeatherMap",
            "last_updated": datetime.now().strftime("%d %b %Y, %I:%M %p"),
        }
    except Exception as e:
        log.warning(f"Weather fetch failed for {city}: {e}")
        return {**fallback, "city": city}

# ── WhatsApp session store ────────────────────────────────────────────────────

_sessions: dict = {}

def get_session(phone: str) -> dict:
    if phone not in _sessions:
        _sessions[phone] = {"state": "main_menu", "data": {}}
    return _sessions[phone]

def clear_session(phone: str):
    _sessions[phone] = {"state": "main_menu", "data": {}}

# ── WhatsApp menu strings ─────────────────────────────────────────────────────

MAIN_MENU = """\
🚁 *Welcome to AgroDrone Services!*
Professional Agricultural Drone Services — Tamil Nadu

Reply with a number:
1️⃣  Place New Service Booking
2️⃣  Track My Order
3️⃣  Pricing & Services
4️⃣  My Booking History
5️⃣  Ask a Question (AI Support)\
"""

SERVICE_MENU = """\
✅ *Select Service Type:*

1️⃣  Pesticide Spraying    — ₹1,200/ha
2️⃣  Crop Monitoring       — ₹800/ha
3️⃣  Field Mapping         — ₹1,500/ha
4️⃣  Soil Analysis         — ₹2,000/ha
5️⃣  Fertilizer Application — ₹1,000/ha

0️⃣  Back to Main Menu\
"""

DISTRICT_MENU = """\
📍 *Select your district:*

1️⃣  Coimbatore    2️⃣  Salem
3️⃣  Erode         4️⃣  Madurai
5️⃣  Tirunelveli   6️⃣  Trichy
7️⃣  Vellore       8️⃣  Thanjavur
9️⃣  Other — type your district name

0️⃣  Back\
"""

CROP_MENU = """\
🌾 *Select your crop type:*

1️⃣  Rice / Paddy   2️⃣  Wheat
3️⃣  Cotton         4️⃣  Sugarcane
5️⃣  Vegetables     6️⃣  Fruits
7️⃣  Pulses         8️⃣  Other

0️⃣  Back\
"""

AREA_PROMPT = "📐 *Enter your field area in hectares:*\n\nType a number (e.g. *5* or *2.5*)\nMinimum 0.5 ha · Maximum 500 ha"

PRICING = """\
💰 *AgroDrone Service Rates:*

🌿 Pesticide Spraying    ₹1,200/ha
🔍 Crop Monitoring       ₹800/ha
🗺️ Field Mapping          ₹1,500/ha
🧪 Soil Analysis          ₹2,000/ha
🌱 Fertilizer Application ₹1,000/ha

*Included in every service:*
✅ Certified pilot & GPS precision
✅ Weather monitoring
✅ Service report within 24–48 hrs

⚠️ Pesticides & chemicals must be
   provided by the farmer.
Min charge: ₹1,500 per booking.

0️⃣  Back to Main Menu\
"""

SVC_MAP  = {"1":"pesticide_spray","2":"crop_monitoring","3":"field_mapping","4":"soil_analysis","5":"fertilizer_spray"}
SVC_NAME = {"pesticide_spray":"Pesticide Spraying","fertilizer_spray":"Fertilizer Application","crop_monitoring":"Crop Monitoring","field_mapping":"Field Mapping & Analysis","soil_analysis":"Soil Analysis"}
SVC_EMO  = {"pesticide_spray":"🌿","fertilizer_spray":"🌱","crop_monitoring":"🔍","field_mapping":"🗺️","soil_analysis":"🧪"}
DIST_MAP = {"1":"Coimbatore","2":"Salem","3":"Erode","4":"Madurai","5":"Tirunelveli","6":"Trichy","7":"Vellore","8":"Thanjavur"}
CROP_MAP = {"1":"rice","2":"wheat","3":"cotton","4":"sugarcane","5":"vegetables","6":"fruits","7":"pulses","8":"other"}

def _date_menu():
    lines = ["📅 *Select your preferred service date:*\n"]
    today = datetime.now()
    for i in range(1, 6):
        d = today + timedelta(days=i)
        lines.append(f"{i}️⃣  {d.strftime('%A, %d %b %Y')}")
    lines.append(f"\n6️⃣  Next week  ({(today + timedelta(days=7)).strftime('%d %b')})")
    lines.append("\n0️⃣  Back")
    return "\n".join(lines)

def _order_summary(data: dict) -> str:
    name = SVC_NAME.get(data.get("service_type",""), "Service")
    emo  = SVC_EMO.get(data.get("service_type",""), "🛠️")
    return f"""\
📋 *ORDER SUMMARY — Please review*

{emo}  Service:  *{name}*
📐  Area:      *{data.get('area_hectares','—')} hectares*
📍  Location:  *{data.get('location','—')}*
🌾  Crop:      *{str(data.get('crop_type','—')).replace('_',' ').title()}*
📅  Date:      *{data.get('scheduled_display','—')}*
💰  Total:     *₹{data.get('estimated_cost',0):,}*

⚠️  You must bring your own pesticides/chemicals.

Reply *YES* to confirm ✅
Reply *NO* to cancel ❌\
"""

def _is_question(text: str) -> bool:
    t = text.strip().lower()
    if re.fullmatch(r"[\d\.\,]+", t): return False
    if t in ("yes","y","no","n","ok","hi","hello","menu","start","help","back","0","confirm","cancel"): return False
    qwords = ("what","how","when","why","which","where","is ","are ","can ","do ","does ","will ","should ","?","tell me","explain","difference","which pesticide","good for","best for")
    if any(w in t for w in qwords): return True
    if len(t.split()) >= 5: return True
    return False

_AI_PROMPT = """You are Agro, assistant for AgroDrone Services in Tamil Nadu.
We provide drone spraying services only — we do NOT sell drones.
Services: Pesticide Spray ₹1200/ha, Fertilizer ₹1000/ha, Crop Monitoring ₹800/ha,
Field Mapping ₹1500/ha, Soil Analysis ₹2000/ha.
Answer the farmer's question in 2-3 sentences. Be friendly and helpful.
End with: Type *menu* to continue your booking."""

def ask_gemini(question: str, context: dict) -> str:
    if not _gemini:
        return ("I'm unable to answer questions right now. "
                "Please call us at +91-81485-13157 for help.\n\nType *menu* to continue your booking.")
    try:
        ctx = ""
        if context.get("service_type"): ctx += f"Booking: {context['service_type']}. "
        if context.get("crop_type"):    ctx += f"Crop: {context['crop_type']}. "
        prompt = f"{_AI_PROMPT}\n\nContext: {ctx}\nFarmer: {question}"
        resp = _gemini.generate_content(prompt)
        return resp.text.strip() if resp and resp.text else _gemini_fallback()
    except Exception as e:
        log.warning(f"Gemini error: {e}")
        return _gemini_fallback()

def _gemini_fallback():
    return "I couldn't process that right now. Type *menu* to continue your booking."

def track_orders(phone: str) -> str:
    with get_conn() as conn:
        cust = conn.execute("SELECT id FROM customers WHERE phone_number=?", (phone,)).fetchone()
        if not cust:
            return "No bookings found.\n\nType *1* to place your first order."
        rows = conn.execute(
            "SELECT * FROM service_requests WHERE customer_id=? ORDER BY created_date DESC LIMIT 5",
            (cust["id"],)
        ).fetchall()
        if not rows:
            return "No bookings yet.\n\nType *1* to place your first order."
        SE = {"scheduled":"📅","pending":"⏳","in_progress":"🚁","completed":"✅","cancelled":"❌"}
        lines = ["📋 *Your Recent Bookings:*\n"]
        for r in rows:
            e = SE.get(r["status"],"📋")
            name = SVC_NAME.get(r["service_type"], r["service_type"].replace("_"," ").title())
            dt = r["scheduled_date"][:10] if r["scheduled_date"] else "TBD"
            lines.append(f"{e} *#AGR{r['id']:04d}* — {r['status'].replace('_',' ').title()}")
            lines.append(f"   {name} · {r['area_hectares']} ha · ₹{int(r['estimated_cost'] or 0):,}")
            lines.append(f"   {r['field_location']} · {dt}\n")
        lines.append("Type *menu* to return.")
        return "\n".join(lines)

def process_whatsapp(phone: str, text: str) -> str:
    text    = text.strip()
    session = get_session(phone)
    state   = session["state"]
    data    = session["data"]

    cust_id = get_or_create_customer(phone)
    log_chat(phone, cust_id, "user", text)

    def reply(msg: str) -> str:
        log_chat(phone, cust_id, "bot", msg)
        return msg

    # Global resets
    if text.lower() in ("hi","hello","start","menu","help"):
        clear_session(phone)
        return reply(MAIN_MENU)

    if text == "0" or text.lower() == "back":
        state_back = {
            "select_service":"main_menu","enter_area":"select_service",
            "select_district":"enter_area","enter_custom_district":"select_district",
            "select_crop":"select_district","select_date":"select_crop",
            "confirm_order":"select_date","ai_question":"main_menu",
        }
        session["state"] = state_back.get(state, "main_menu")
        menus = {
            "main_menu":MAIN_MENU,"select_service":SERVICE_MENU,
            "enter_area":AREA_PROMPT,"select_district":DISTRICT_MENU,
            "select_crop":CROP_MENU,"select_date":_date_menu(),
            "confirm_order":_order_summary(data),
        }
        return reply(menus.get(session["state"], MAIN_MENU))

    # Mid-flow AI question
    if state not in ("main_menu","ai_question") and _is_question(text):
        ai_resp = ask_gemini(text, data)
        svc = session["state"].replace("_"," ")
        full = ai_resp + f"\n\n_(Resuming: {svc})_"
        log_chat(phone, cust_id, "ai", full)
        return full

    # ── State machine ─────────────────────────────────────────────────────────

    if state == "main_menu":
        if text == "1": session["state"] = "select_service"; return reply(SERVICE_MENU)
        elif text == "2": return reply(track_orders(phone))
        elif text == "3": return reply(PRICING)
        elif text == "4": return reply(track_orders(phone))
        elif text == "5":
            session["state"] = "ai_question"
            return reply("🤖 *AI Support*\n\nAsk me anything about drone services, pesticides, crops, or scheduling!\n\nType *menu* to go back.")
        else: return reply("Please reply with a number 1–5.\n\n" + MAIN_MENU)

    if state == "ai_question":
        resp = ask_gemini(text, data)
        log_chat(phone, cust_id, "ai", resp)
        return resp

    if state == "select_service":
        if text in SVC_MAP:
            svc = SVC_MAP[text]
            data["service_type"] = svc
            data["service_name"] = SVC_NAME[svc]
            data["rate"]         = RATES[svc]
            session["state"]     = "enter_area"
            return reply(f"✅ Selected: *{SVC_EMO[svc]} {SVC_NAME[svc]}*\nRate: ₹{RATES[svc]:,}/ha\n\n" + AREA_PROMPT)
        return reply("Please reply 1–5 or 0 to go back.\n\n" + SERVICE_MENU)

    if state == "enter_area":
        try:
            area = float(text.replace(",","."))
            if area < 0.5: return reply("⚠️ Minimum area is 0.5 ha.\n\n" + AREA_PROMPT)
            if area > 500: return reply("⚠️ Maximum area is 500 ha.\n\n" + AREA_PROMPT)
            data["area_hectares"]  = area
            cost = max(round(area * data["rate"] / 50) * 50, MIN_CHARGE)
            data["estimated_cost"] = cost
            session["state"]       = "select_district"
            return reply(f"✅ Area: *{area} ha* · Estimated: *₹{cost:,}*\n\n" + DISTRICT_MENU)
        except ValueError:
            return reply("Please enter a valid number (e.g. *5* or *2.5*).\n\n" + AREA_PROMPT)

    if state == "select_district":
        if text in DIST_MAP:
            data["location"] = DIST_MAP[text]
            session["state"] = "select_crop"
            return reply(f"✅ Location: *{data['location']}*\n\n" + CROP_MENU)
        elif text == "9":
            session["state"] = "enter_custom_district"
            return reply("Please type your district name:")
        return reply("Please reply 1–9 or 0 to go back.\n\n" + DISTRICT_MENU)

    if state == "enter_custom_district":
        if len(text) < 2: return reply("Please enter a valid district name:")
        data["location"] = text.title()
        session["state"] = "select_crop"
        return reply(f"✅ Location: *{data['location']}*\n\n" + CROP_MENU)

    if state == "select_crop":
        if text in CROP_MAP:
            data["crop_type"] = CROP_MAP[text]
            session["state"]  = "select_date"
            return reply(_date_menu())
        return reply("Please reply 1–8 or 0 to go back.\n\n" + CROP_MENU)

    if state == "select_date":
        try:
            ch = int(text)
            if 1 <= ch <= 5:   chosen = datetime.now() + timedelta(days=ch)
            elif ch == 6:       chosen = datetime.now() + timedelta(days=7)
            else: return reply("Please reply 1–6 or 0 to go back.\n\n" + _date_menu())
            data["scheduled_date"]    = chosen.strftime("%Y-%m-%d")
            data["scheduled_display"] = chosen.strftime("%A, %d %B %Y")
            session["state"]          = "confirm_order"
            return reply(_order_summary(data))
        except ValueError:
            return reply("Please reply with a number.\n\n" + _date_menu())

    if state == "confirm_order":
        if text.upper() in ("YES","Y","CONFIRM","OK","1"):
            try:
                sched_dt = data["scheduled_date"] + "T06:00:00"
                with get_conn() as conn:
                    conn.execute(
                        """INSERT INTO service_requests
                           (customer_id,service_type,crop_type,area_hectares,field_location,
                            estimated_cost,status,scheduled_date,source,notes)
                           VALUES (?,?,?,?,?,?,?,?,?,?)""",
                        (cust_id, data["service_type"], data.get("crop_type"),
                         data["area_hectares"], data["location"],
                         data["estimated_cost"], "scheduled", sched_dt,
                         "whatsapp",
                         f"Crop: {data.get('crop_type','unknown')} | Date: {data.get('scheduled_display','TBD')}")
                    )
                    oid = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
                clear_session(phone)
                name = SVC_NAME.get(data["service_type"],"Service")
                msg = f"""\
✅ *BOOKING CONFIRMED!*

🎉 Thank you for choosing AgroDrone!

📋 *Booking Details:*
• Booking ID:  *#AGR{oid:04d}*
• Service:     {SVC_EMO.get(data['service_type'],'🛠️')} {name}
• Area:        {data['area_hectares']} ha
• Location:    {data['location']}
• Crop:        {str(data.get('crop_type','')).replace('_',' ').title()}
• Date:        {data['scheduled_display']}
• Total:       ₹{data['estimated_cost']:,}

📞 Our team will contact you within 2 hours.
⚠️  Please have your pesticides/chemicals ready.

Type *menu* to return or *2* to track this order.\
"""
                return reply(msg)
            except Exception as e:
                log.error(f"Order creation error: {e}")
                return reply("❌ Error saving order. Please try again or type *menu*.")

        elif text.upper() in ("NO","N","CANCEL","2"):
            clear_session(phone)
            return reply("❌ Booking cancelled.\n\nType *menu* to start a new booking.")
        else:
            return reply("Please reply *YES* to confirm or *NO* to cancel.\n\n" + _order_summary(data))

    clear_session(phone)
    return reply("Let's start fresh!\n\n" + MAIN_MENU)

def _twiml(body: str) -> Response:
    safe = body.replace("&","&amp;").replace("<","&lt;").replace(">","&gt;")
    xml = f'<?xml version="1.0" encoding="UTF-8"?><Response><Message>{safe}</Message></Response>'
    return Response(content=xml, media_type="application/xml")

# ── FastAPI App ───────────────────────────────────────────────────────────────

init_db()

app = FastAPI(title="AgroDrone", version="2.0.0", docs_url="/api/docs", redoc_url=None)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True,
                   allow_methods=["*"], allow_headers=["*"])

# Static files
_static = Path(__file__).parent / "static"
_static.mkdir(exist_ok=True)
(_static/"js").mkdir(exist_ok=True)
(_static/"css").mkdir(exist_ok=True)
app.mount("/static", StaticFiles(directory=str(_static)), name="static")

# ── Dashboard ─────────────────────────────────────────────────────────────────
@app.get("/", include_in_schema=False)
async def dashboard():
    p = _static / "dashboard.html"
    if p.exists():
        return FileResponse(str(p))
    return JSONResponse({"status":"running","docs":"/api/docs","webhook":"/api/v1/whatsapp/webhook"})

# ── Health ────────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status":"ok","service":"AgroDrone","version":"2.0.0"}

@app.get("/api/test")
def test():
    return {"status":"ok","message":"AgroDrone API is working!"}

# ── Stats ─────────────────────────────────────────────────────────────────────
@app.get("/api/stats")
def api_stats():
    with get_conn() as conn:
        total     = conn.execute("SELECT COUNT(*) FROM service_requests").fetchone()[0]
        today     = datetime.utcnow().strftime("%Y-%m-%d")
        today_n   = conn.execute("SELECT COUNT(*) FROM service_requests WHERE date(created_date)=?",(today,)).fetchone()[0]
        pending   = conn.execute("SELECT COUNT(*) FROM service_requests WHERE status='pending'").fetchone()[0]
        scheduled = conn.execute("SELECT COUNT(*) FROM service_requests WHERE status='scheduled'").fetchone()[0]
        revenue   = conn.execute("SELECT COALESCE(SUM(COALESCE(actual_cost,estimated_cost,0)),0) FROM service_requests WHERE status='completed'").fetchone()[0]
        farmers   = conn.execute("SELECT COUNT(*) FROM customers").fetchone()[0]
        act_dr    = conn.execute("SELECT COUNT(*) FROM drones WHERE status='active'").fetchone()[0]
        hours     = conn.execute("SELECT COALESCE(SUM(flight_hours_today),0) FROM drones").fetchone()[0]
    return {
        "total_services": total,   "total_bookings": total,
        "active_requests": pending+scheduled,
        "operational_hours": round(float(hours),1),
        "total_revenue": round(float(revenue)),
        "efficiency_rate": 95.8,
        "total_customers": farmers, "total_farmers": farmers,
        "messages_today": today_n*6, "orders_today": today_n,
        "bookings_today": today_n,  "avg_response_time": "< 1 sec",
        "active_drones": act_dr,    "satisfaction_rate": 97.8,
    }

# ── Requests ──────────────────────────────────────────────────────────────────
@app.get("/api/requests")
def api_requests(status: Optional[str] = None, limit: int = 500, offset: int = 0):
    with get_conn() as conn:
        q = """SELECT sr.*, c.name as farmer_name, c.phone_number as phone
               FROM service_requests sr
               LEFT JOIN customers c ON c.id=sr.customer_id"""
        params: list = []
        if status:
            q += " WHERE sr.status=?"
            params.append(status)
        q += " ORDER BY sr.created_date DESC LIMIT ? OFFSET ?"
        params += [limit, offset]
        rows = conn.execute(q, params).fetchall()
    return [{
        "id": r["id"], "farmer_name": r["farmer_name"] or "Unknown",
        "phone": r["phone"] or "", "service_type": r["service_type"],
        "crop_type": r["crop_type"] or "", "area_hectares": float(r["area_hectares"] or 0),
        "location": r["field_location"] or "Tamil Nadu",
        "field_location": r["field_location"] or "Tamil Nadu",
        "status": r["status"], "estimated_cost": float(r["estimated_cost"] or 0),
        "actual_cost": float(r["actual_cost"] or 0),
        "scheduled_date": r["scheduled_date"], "scheduled_for": r["scheduled_date"],
        "created_date": r["created_date"],   "created_at": r["created_date"],
        "time_slot": r["time_slot"] or "", "source": r["source"] or "whatsapp",
        "notes": r["notes"] or "", "assigned_pilot": r["assigned_pilot"] or "",
        "assigned_drone": r["assigned_drone"] or "",
    } for r in rows]

@app.put("/api/requests/{req_id}/status")
async def update_req_status(req_id: int, request: Request):
    body = await request.json()
    new_status = body.get("status") or body.get("new_status")
    if not new_status:
        return JSONResponse({"error": "status required"}, status_code=400)
    with get_conn() as conn:
        extra = ", completed_date=datetime('now')" if new_status == "completed" else ""
        if body.get("assigned_pilot"):
            conn.execute("UPDATE service_requests SET assigned_pilot=? WHERE id=?",
                         (body["assigned_pilot"], req_id))
        conn.execute(f"UPDATE service_requests SET status=?{extra} WHERE id=?",
                     (new_status, req_id))
    return {"success": True, "id": req_id, "status": new_status}

@app.put("/api/requests/{req_id}/schedule")
async def schedule_req(req_id: int, request: Request):
    body = await request.json()
    date_str = body.get("scheduled_date","")
    slot     = body.get("time_slot","06:00-09:00")
    hour     = {"06:00-09:00":6,"09:00-12:00":9,"12:00-15:00":12,"15:00-18:00":15}.get(slot,6)
    sched_dt = f"{date_str}T{hour:02d}:00:00" if date_str else None
    with get_conn() as conn:
        conn.execute("UPDATE service_requests SET scheduled_date=?,time_slot=?,status='scheduled' WHERE id=?",
                     (sched_dt, slot, req_id))
    return {"success": True, "scheduled_date": sched_dt, "time_slot": slot}

@app.post("/api/requests/new")
async def new_req(request: Request):
    body = await request.json()
    phone  = (body.get("phone") or "").strip()
    name   = (body.get("farmer_name") or "").strip()
    svc    = body.get("service_type","pesticide_spray")
    area   = float(body.get("area_hectares") or 1)
    loc    = (body.get("location") or "Tamil Nadu").strip()
    date_s = body.get("scheduled_date","")
    slot   = body.get("time_slot","06:00-09:00")
    hour   = {"06:00-09:00":6,"09:00-12:00":9,"12:00-15:00":12,"15:00-18:00":15}.get(slot,6)
    sched  = f"{date_s}T{hour:02d}:00:00" if date_s else None
    status = "scheduled" if sched else "pending"
    cost   = max(round(area * RATES.get(svc,1200) / 50)*50, MIN_CHARGE)
    cid    = get_or_create_customer(phone, name)
    with get_conn() as conn:
        cur = conn.execute(
            "INSERT INTO service_requests(customer_id,service_type,area_hectares,field_location,estimated_cost,status,scheduled_date,time_slot,source,notes) VALUES(?,?,?,?,?,?,?,?,?,?)",
            (cid,svc,area,loc,cost,status,sched,slot if sched else None,"dashboard",body.get("notes",""))
        )
        rid = cur.lastrowid
    return {"success": True, "request_id": rid, "id": rid, "estimated_cost": cost, "status": status}

# ── Farmers ───────────────────────────────────────────────────────────────────
@app.get("/api/farmers")
def api_farmers():
    with get_conn() as conn:
        custs = conn.execute("SELECT * FROM customers ORDER BY registration_date DESC").fetchall()
        result = []
        for c in custs:
            rows = conn.execute("SELECT * FROM service_requests WHERE customer_id=?", (c["id"],)).fetchall()
            last = max(rows, key=lambda r: r["created_date"], default=None) if rows else None
            total_area = sum(float(r["area_hectares"] or 0) for r in rows)
            result.append({
                "id": c["id"],
                "name": c["name"] or f"Farmer {c['phone_number'][-4:]}",
                "phone": c["phone_number"], "phone_number": c["phone_number"],
                "whatsapp": c["phone_number"],
                "location": c["district"] or "Tamil Nadu",
                "address": c["district"] or "Tamil Nadu",
                "total_services": len(rows), "total_bookings": len(rows),
                "total_area_hectares": round(total_area, 1),
                "last_service": last["created_date"] if last else None,
                "last_booking": last["created_date"] if last else None,
                "joined": c["registration_date"],
                "total_spent": round(sum(float(r["estimated_cost"] or 0) for r in rows), 2),
            })
    return result

# ── Fleet ─────────────────────────────────────────────────────────────────────
@app.get("/api/fleet")
def api_fleet():
    with get_conn() as conn:
        drones = conn.execute("SELECT * FROM drones ORDER BY drone_id").fetchall()
    return {
        "total":       len(drones),
        "active":      sum(1 for d in drones if d["status"]=="active"),
        "standby":     sum(1 for d in drones if d["status"]=="standby"),
        "maintenance": sum(1 for d in drones if d["status"]=="maintenance"),
        "drones": [{
            "id": d["id"], "drone_id": d["drone_id"], "model": d["model"] or "—",
            "status": d["status"],
            "pilot": d["pilot_name"] or "—",
            "pilot_name": d["pilot_name"] or "—",
            "battery_level": d["battery_level"] or 0,
            "current_location": d["current_location"] or "—",
            "flight_hours_today": d["flight_hours_today"] or 0,
            "total_flight_hours": d["total_flight_hours"] or 0,
            "next_maintenance": d["next_maintenance"],
            "notes": d["notes"] or "",
        } for d in drones],
    }

@app.put("/api/fleet/{drone_id}/update")
async def update_drone(drone_id: int, request: Request):
    body = await request.json()
    updates, params = [], []
    if body.get("status"):               updates.append("status=?");               params.append(body["status"])
    if body.get("battery_level") is not None: updates.append("battery_level=?");  params.append(int(body["battery_level"]))
    if body.get("current_location"):     updates.append("current_location=?");     params.append(body["current_location"])
    if body.get("pilot_name"):           updates.append("pilot_name=?");           params.append(body["pilot_name"])
    if body.get("flight_hours_today") is not None: updates.append("flight_hours_today=?"); params.append(float(body["flight_hours_today"]))
    if body.get("notes"):                updates.append("notes=?");                params.append(body["notes"])
    if updates:
        params.append(drone_id)
        with get_conn() as conn:
            conn.execute(f"UPDATE drones SET {','.join(updates)} WHERE id=?", params)
    return {"success": True}

# ── Analytics ─────────────────────────────────────────────────────────────────
@app.get("/api/analytics")
def api_analytics():
    with get_conn() as conn:
        rows = conn.execute("SELECT * FROM service_requests").fetchall()
    by_type, by_status, by_month = {}, {}, {}
    for r in rows:
        svc = r["service_type"] or "unknown"
        by_type[svc] = by_type.get(svc,0) + 1
        st = r["status"] or "pending"
        by_status[st] = by_status.get(st,0) + 1
        if r["created_date"]:
            try:
                m = r["created_date"][:7]
                mo = datetime.strptime(m, "%Y-%m").strftime("%b")
                by_month[mo] = by_month.get(mo,0) + float(r["estimated_cost"] or 0)
            except Exception: pass
    total_rev = sum(float(r["actual_cost"] or r["estimated_cost"] or 0)
                    for r in rows if r["status"]=="completed")
    return {
        "by_type": by_type, "by_status": by_status,
        "monthly_revenue": by_month,
        "total_revenue": round(total_rev),
        "total_requests": len(rows), "total_bookings": len(rows),
    }

# ── Conversations ─────────────────────────────────────────────────────────────
@app.get("/api/conversations")
def api_conversations(limit: int = 50):
    with get_conn() as conn:
        custs = conn.execute(
            "SELECT * FROM customers ORDER BY registration_date DESC LIMIT ?", (limit,)
        ).fetchall()
        result = []
        for c in custs:
            lm = conn.execute(
                "SELECT message,timestamp FROM chat_messages WHERE customer_id=? ORDER BY timestamp DESC LIMIT 1",
                (c["id"],)
            ).fetchone()
            cnt = conn.execute("SELECT COUNT(*) FROM service_requests WHERE customer_id=?", (c["id"],)).fetchone()[0]
            val = conn.execute("SELECT COALESCE(SUM(estimated_cost),0) FROM service_requests WHERE customer_id=?", (c["id"],)).fetchone()[0]
            result.append({
                "phone": c["phone_number"],
                "name": c["name"] or f"Farmer {c['phone_number'][-4:]}",
                "last_message": lm["message"][:100] if lm else "New customer",
                "last_activity": (lm["timestamp"] if lm else c["registration_date"]) or "",
                "total_orders": cnt, "total_value": round(float(val),2),
                "status": "active" if cnt > 0 else "new_customer",
            })
        result.sort(key=lambda x: x["last_activity"], reverse=True)
    return result

# ── Weather ───────────────────────────────────────────────────────────────────
@app.get("/api/weather")
def api_weather(city: str = "Chennai"):
    return fetch_weather(city)

@app.get("/api/weather/all-cities")
def api_weather_all():
    return [fetch_weather(c) for c in list(TN_CITIES.keys())]

# ── Calendar ──────────────────────────────────────────────────────────────────
@app.get("/api/calendar")
def api_calendar(year: Optional[int] = None, month: Optional[int] = None):
    now = datetime.utcnow()
    y   = year  or now.year
    m   = month or now.month
    start = f"{y}-{m:02d}-01"
    end   = f"{y+1}-01-01" if m==12 else f"{y}-{m+1:02d}-01"
    COLOR = {"scheduled":"#4a9fd4","in_progress":"#e8a040","completed":"#7ab648","cancelled":"#d45a4a"}
    with get_conn() as conn:
        rows = conn.execute(
            """SELECT sr.*, c.name as farmer_name, c.phone_number as phone
               FROM service_requests sr
               LEFT JOIN customers c ON c.id=sr.customer_id
               WHERE sr.scheduled_date >= ? AND sr.scheduled_date < ?
                 AND sr.status IN ('scheduled','in_progress','completed')""",
            (start, end)
        ).fetchall()
    events = []
    for r in rows:
        sn  = SVC_NAME.get(r["service_type"], r["service_type"].replace("_"," ").title())
        loc = r["field_location"] or "TN"
        sd  = r["scheduled_date"]
        try:
            ed = (datetime.fromisoformat(sd) + timedelta(hours=3)).isoformat()
        except Exception:
            ed = sd
        events.append({
            "id": r["id"], "title": f"{sn} — {loc}",
            "start": sd, "end": ed,
            "color": COLOR.get(r["status"],"#4a9fd4"),
            "farmer": r["farmer_name"] or "Unknown",
            "phone": r["phone"] or "",
            "service": sn, "area": float(r["area_hectares"] or 0),
            "location": loc, "status": r["status"],
            "cost": float(r["estimated_cost"] or 0), "pilot": r["assigned_pilot"] or "",
        })
    return events

# ── WhatsApp Webhook ──────────────────────────────────────────────────────────
@app.post("/api/v1/whatsapp/webhook")
async def wa_webhook(request: Request):
    ct = request.headers.get("content-type","")
    try:
        if "application/x-www-form-urlencoded" in ct:
            form  = await request.form()
            raw   = dict(form)
            phone = raw.get("From","").replace("whatsapp:","")
            text  = raw.get("Body","").strip()
        else:
            raw   = await request.json()
            phone = raw.get("From", raw.get("phone_number","")).replace("whatsapp:","")
            text  = raw.get("Body", raw.get("message_text","")).strip()

        if not phone or not text:
            return _twiml("Please send a message to get started.")

        log.info(f"▶ WA {phone}: {text!r}")
        resp = process_whatsapp(phone, text)
        log.info(f"◀ WA {phone}: {resp[:60]!r}…")

        if "From" in raw:
            return _twiml(resp)
        return JSONResponse({"status":"ok","reply":resp})
    except Exception as e:
        log.error(f"WA webhook error: {e}", exc_info=True)
        return _twiml("Sorry, a technical issue occurred. Please type *menu* to restart.")

@app.get("/api/v1/whatsapp/webhook")
async def wa_verify(request: Request):
    challenge = request.query_params.get("hub.challenge")
    if challenge:
        return Response(content=challenge, media_type="text/plain")
    return JSONResponse({"status":"ok"})

log.info("🚁 AgroDrone ready — http://localhost:8000")
log.info(f"📊 Dashboard: http://localhost:8000")
log.info(f"📱 Webhook:   {NGROK_URL}/api/v1/whatsapp/webhook")
log.info(f"📖 API docs:  http://localhost:8000/api/docs")
