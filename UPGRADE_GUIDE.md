# AgroDrone Enhanced — Upgrade Guide

## What's New (v2.0)

### Feature 1: Battery Cycle Tracking
- `app/db/models.py` — Added `DroneBattery` model
- `app/services/battery_service.py` — Full cycle tracking logic
- `app/api/battery_api.py` — REST endpoints
- Admin Portal → Battery Health tab shows color-coded health bars and alerts

### Feature 2: Dual Portal Architecture
- `app/static/admin/index.html` — Full admin SaaS dashboard
- `app/static/client/index.html` — Mobile-first farmer portal
- Routes: `/admin` for admin, `/client` for farmers

### Feature 3: WhatsApp Bot Upgrade
- `app/api/whatsapp_webhook.py` — Enhanced (original flow preserved)
- Added Gemini AI fallback for open-ended questions
- Context tracking: remembers last order and intent
- AI logs stored in `ai_logs` table

### Feature 4: Order Tracking
- `app/db/models.py` — Added `tracking_token` + `status_history` to `ServiceRequest`
- `app/services/tracking_service.py` — Token-based tracking
- `app/api/tracking_api.py` — Public + admin tracking endpoints
- Client Portal → Track Order page with visual progress steps

### Feature 5: Scheduling System
- `app/db/models.py` — Added `ScheduledJob` model
- `app/api/scheduling_api.py` — Calendar CRUD with conflict detection
- Admin Portal → Scheduling tab with interactive monthly calendar

### Feature 6: Weather Integration
- `app/services/weather_service.py` — Weather + spraying safety assessment
- Admin Portal → Weather Monitor with 6-city grid
- Client Portal → Weather widget with spray recommendation

## Migration Steps

1. **Back up existing DB** before running anything
2. Run: `python init_db.py`  — creates new tables safely
3. Start server: `uvicorn app.main:app --reload --port 8000`

## Default Credentials
- Admin Portal: `http://localhost:8000/admin`
- Username: `admin`  Password: `agrodrone2024`

## API Endpoints Added
```
GET  /admin               → Admin portal HTML
GET  /client              → Client portal HTML
GET  /track/{booking_id}  → Client tracking page

POST /api/admin/login         → Get auth token
GET  /api/admin/summary       → Dashboard stats
GET  /api/admin/drones        → List drones
POST /api/admin/drones        → Add drone
GET  /api/admin/ai-logs       → AI interaction logs

GET  /api/battery/all             → All battery statuses
POST /api/battery/{id}/charge     → Record charge cycle
PUT  /api/battery/{id}            → Update battery data
GET  /api/battery/alerts/active   → Only warning/critical

GET  /api/track/order/{booking_id}    → Public order tracking
GET  /api/track/customer/{phone}      → Track by phone
PUT  /api/track/admin/{id}/status     → Update order status

GET  /api/schedule/jobs               → List scheduled jobs
POST /api/schedule/jobs               → Create job
PUT  /api/schedule/jobs/{id}          → Update job
DELETE /api/schedule/jobs/{id}        → Delete job
GET  /api/schedule/pending-orders     → Orders to schedule
GET  /api/schedule/available-drones   → Available drones
```

## File Structure
```
agrodrone_enhanced/
├── app/
│   ├── api/
│   │   ├── admin_api.py          ← NEW
│   │   ├── battery_api.py        ← NEW
│   │   ├── dashboard_api.py      ← ORIGINAL (unchanged)
│   │   ├── scheduling_api.py     ← NEW
│   │   ├── tracking_api.py       ← NEW
│   │   └── whatsapp_webhook.py   ← ENHANCED (backward compatible)
│   ├── db/
│   │   ├── database.py           ← ORIGINAL
│   │   └── models.py             ← EXTENDED (original models preserved)
│   ├── services/
│   │   ├── ai_service.py         ← NEW
│   │   ├── battery_service.py    ← NEW
│   │   ├── tracking_service.py   ← NEW
│   │   └── weather_service.py    ← NEW
│   ├── static/
│   │   ├── admin/index.html      ← NEW admin portal
│   │   ├── client/index.html     ← NEW client portal
│   │   └── dashboard.html        ← ORIGINAL (unchanged)
│   ├── utils/
│   │   └── auth.py               ← NEW
│   ├── config.py                 ← ORIGINAL
│   └── main.py                   ← REPLACED (wires all modules)
├── init_db.py                    ← UPDATED
└── requirements.txt              ← UPDATED
```
