"""
Audit trail storage (SRS lxiii).

The audit_logs table already exists on the server with
(id, user_id, action, details, created_at); ensure_audit_table() creates it
if missing and adds the request-level columns the middleware records.
"""

import logging
import os

import psycopg2

from database import get_connection

logger = logging.getLogger("dineiq.audit")

# Tests set AUDIT_ENABLED=false so they never write to the real database.
AUDIT_ENABLED = os.getenv("AUDIT_ENABLED", "true").lower() != "false"

INSERT_SQL = """
    INSERT INTO audit_logs
        (user_id, user_email, user_role, action, event_type, method,
         endpoint, status_code, result, duration_ms, ip_address, details)
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
"""

AUDIT_DDL = [
    """
    CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        action VARCHAR(120),
        details TEXT,
        created_at TIMESTAMP DEFAULT NOW()
    )
    """,
    "ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_email VARCHAR(255)",
    "ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_role VARCHAR(50)",
    "ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS event_type VARCHAR(20)",
    "ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS method VARCHAR(10)",
    "ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS endpoint VARCHAR(255)",
    "ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS status_code INTEGER",
    "ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS result VARCHAR(20)",
    "ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS duration_ms DOUBLE PRECISION",
    "ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ip_address VARCHAR(64)",
    "CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at DESC)",
]


def ensure_audit_table():
    if not AUDIT_ENABLED:
        return
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            for statement in AUDIT_DDL:
                cur.execute(statement)
        conn.commit()
    finally:
        conn.close()


def write_audit_log(entry: dict):
    """Insert one audit row. Failures are logged, never raised: auditing
    must not take the API down with it."""
    if not AUDIT_ENABLED:
        return
    try:
        conn = get_connection()
    except Exception as exc:  # database unreachable
        logger.warning("audit log skipped: %s", exc)
        return
    values = [
        entry.get("user_id"), entry.get("user_email"), entry.get("user_role"),
        entry.get("action"), entry.get("event_type"), entry.get("method"),
        entry.get("endpoint"), entry.get("status_code"), entry.get("result"),
        entry.get("duration_ms"), entry.get("ip_address"), entry.get("details"),
    ]
    try:
        with conn.cursor() as cur:
            try:
                cur.execute(INSERT_SQL, values)
            except psycopg2.errors.ForeignKeyViolation:
                # token of a user that no longer exists: keep the row, drop the link
                conn.rollback()
                values[0] = None
                cur.execute(INSERT_SQL, values)
        conn.commit()
    except Exception as exc:
        logger.warning("audit log insert failed: %s", exc)
    finally:
        conn.close()


def fetch_audit_logs(limit=200, event_type=None, search=None):
    clauses, params = [], []
    if event_type:
        clauses.append("event_type = %s")
        params.append(event_type)
    if search:
        clauses.append("(user_email ILIKE %s OR action ILIKE %s OR endpoint ILIKE %s)")
        params.extend([f"%{search}%"] * 3)
    where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
    params.append(limit)

    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT id, created_at, user_email, user_role, action, event_type,
                       method, endpoint, status_code, result, duration_ms, ip_address, details
                FROM audit_logs {where}
                ORDER BY created_at DESC
                LIMIT %s
                """,
                params,
            )
            columns = [c[0] for c in cur.description]
            rows = [dict(zip(columns, r)) for r in cur.fetchall()]
            cur.execute("SELECT event_type, COUNT(*) FROM audit_logs GROUP BY event_type")
            by_type = {t or "unknown": n for t, n in cur.fetchall()}
    finally:
        conn.close()

    for row in rows:
        row["created_at"] = row["created_at"].isoformat() if row["created_at"] else None
    return {"total": sum(by_type.values()), "by_type": by_type, "logs": rows}
