"""
migrate_db_v3.py — Final complete migration for AgroDrone Enhanced
Run: python migrate_db_v3.py
"""
import sqlite3, os, sys, hashlib

DB_PATH = os.path.join(os.path.dirname(__file__), "agrodrone.db")
if not os.path.exists(DB_PATH):
    print(f"ERROR: Database not found at {DB_PATH}")
    sys.exit(1)

print(f"Migrating: {DB_PATH}\n")
conn = sqlite3.connect(DB_PATH)
conn.execute("PRAGMA journal_mode=WAL")
cur = conn.cursor()

def col_exists(table, col):
    cur.execute(f"PRAGMA table_info({table})")
    return any(r[1] == col for r in cur.fetchall())

def add_col(table, col, typedef):
    if not col_exists(table, col):
        cur.execute(f"ALTER TABLE {table} ADD COLUMN {col} {typedef}")
        print(f"  + {table}.{col}")
    else:
        print(f"  . {table}.{col} (exists)")

# ── service_requests ──────────────────────────────────────────────────────────
print("[service_requests]")
add_col("service_requests", "completed_date", "DATETIME")
add_col("service_requests", "tracking_token", "TEXT")
add_col("service_requests", "status_history", "TEXT DEFAULT '[]'")

# ── customers ─────────────────────────────────────────────────────────────────
print("\n[customers]")
add_col("customers", "notes", "TEXT")

# ── chat_messages ─────────────────────────────────────────────────────────────
print("\n[chat_messages]")
add_col("chat_messages", "is_ai",  "INTEGER DEFAULT 0")
add_col("chat_messages", "intent", "TEXT")

# ── drones — SQLite forbids DEFAULT (datetime('now')) in ALTER TABLE ───────────
print("\n[drones]")
add_col("drones", "last_maintenance",   "DATETIME")
add_col("drones", "next_maintenance",   "DATETIME")
add_col("drones", "notes",              "TEXT")
add_col("drones", "registered_at",      "DATETIME")          # no default — SQLite limitation
add_col("drones", "flight_hours_today", "REAL DEFAULT 0.0")
add_col("drones", "battery_level",      "INTEGER DEFAULT 100")

# Backfill registered_at with a static timestamp for existing rows
cur.execute("UPDATE drones SET registered_at = datetime('now') WHERE registered_at IS NULL")
print("  . registered_at backfilled for existing rows")

# ── New tables ────────────────────────────────────────────────────────────────
print("\n[New tables]")
cur.executescript("""
CREATE TABLE IF NOT EXISTS drone_batteries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    drone_db_id INTEGER UNIQUE REFERENCES drones(id),
    drone_id TEXT,
    cycle_count INTEGER DEFAULT 0,
    max_cycles INTEGER DEFAULT 300,
    health_percentage REAL DEFAULT 100.0,
    alert_level TEXT DEFAULT 'good',
    last_charged_at DATETIME,
    total_flight_hours REAL DEFAULT 0.0,
    notes TEXT,
    created_at DATETIME DEFAULT (datetime('now')),
    updated_at DATETIME DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS scheduled_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_request_id INTEGER REFERENCES service_requests(id),
    drone_id_str TEXT,
    pilot_name TEXT,
    title TEXT,
    scheduled_start DATETIME NOT NULL,
    scheduled_end DATETIME,
    location TEXT,
    status TEXT DEFAULT 'pending',
    notes TEXT,
    color TEXT DEFAULT '#22c55e',
    created_at DATETIME DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password_hash TEXT,
    full_name TEXT,
    role TEXT DEFAULT 'admin',
    is_active INTEGER DEFAULT 1,
    last_login DATETIME,
    created_at DATETIME DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS ai_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT,
    prompt TEXT,
    response TEXT,
    model TEXT,
    intent TEXT,
    latency_ms INTEGER,
    error TEXT,
    created_at DATETIME DEFAULT (datetime('now'))
);
""")
print("  . drone_batteries, scheduled_jobs, admin_users, ai_logs — ready")

# ── Fix Enum case mismatch in models.py ───────────────────────────────────────
print("\n[Enum fix]")
cur.execute("SELECT DISTINCT service_type FROM service_requests LIMIT 3")
rows = [r[0] for r in cur.fetchall() if r[0]]
if rows and any(v == v.lower() for v in rows):
    models_path = os.path.join(os.path.dirname(__file__), "app", "db", "models.py")
    with open(models_path, "r") as f:
        content = f.read()
    patched = content
    for enum_name in ["ServiceType", "ServiceStatus", "DroneStatus", "BatteryAlertLevel", "JobStatus"]:
        patched = patched.replace(
            f"Column(Enum({enum_name})",
            f"Column(Enum({enum_name}, native_enum=False)"
        )
    if patched != content:
        with open(models_path, "w") as f:
            f.write(patched)
        print("  ✅ models.py patched — native_enum=False applied to all Enum columns")
    else:
        print("  . models.py already patched")
else:
    print("  . No enum fix needed (no existing data or already correct)")

# ── Seed admin user ───────────────────────────────────────────────────────────
print("\n[Admin user]")
cur.execute("SELECT COUNT(*) FROM admin_users")
if cur.fetchone()[0] == 0:
    pw = hashlib.sha256(b"agrodrone2024").hexdigest()
    cur.execute(
        "INSERT INTO admin_users (username,password_hash,full_name,role) VALUES (?,?,?,?)",
        ("admin", pw, "Administrator", "admin")
    )
    print("  + Created: admin / agrodrone2024")
else:
    print("  . Admin user already exists")

# ── Seed battery records for any drones that don't have one ───────────────────
print("\n[Battery records]")
cur.execute("SELECT id, drone_id, total_flight_hours FROM drones")
for db_id, d_id, hrs in cur.fetchall():
    cur.execute("SELECT id FROM drone_batteries WHERE drone_db_id=?", (db_id,))
    if not cur.fetchone():
        cur.execute("""
            INSERT INTO drone_batteries
            (drone_db_id,drone_id,cycle_count,max_cycles,health_percentage,alert_level,total_flight_hours)
            VALUES (?,?,0,300,100.0,'good',?)
        """, (db_id, d_id, hrs or 0.0))
        print(f"  + Battery record for {d_id}")
    else:
        print(f"  . {d_id} already has battery record")

conn.commit()
conn.close()

print("\n✅ Migration complete!")
print("\nRestart the server:")
print("   python -m uvicorn app.main:app --reload --port 8000")