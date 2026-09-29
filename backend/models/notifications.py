"""
Per-user notification dismissals.

Notifications themselves are generated on request (a welcome message plus the
current Critical / High anomalies); this table only remembers which ones a
user has dismissed, so a dismissed notification never comes back for them.
"""

import logging

from database import get_connection

logger = logging.getLogger("dineiq.notifications")

DDL = """
CREATE TABLE IF NOT EXISTS notification_dismissals (
    user_email        VARCHAR(255) NOT NULL,
    notification_key  VARCHAR(255) NOT NULL,
    dismissed_at      TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (user_email, notification_key)
)
"""


def ensure_notifications_table():
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(DDL)
        conn.commit()
    finally:
        conn.close()


def dismissed_keys(user_email):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT notification_key FROM notification_dismissals WHERE user_email=%s", (user_email,))
            return {row[0] for row in cur.fetchall()}
    finally:
        conn.close()


def dismiss(user_email, keys):
    if not keys:
        return 0
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.executemany(
                """INSERT INTO notification_dismissals (user_email, notification_key)
                   VALUES (%s, %s) ON CONFLICT DO NOTHING""",
                [(user_email, key) for key in keys],
            )
        conn.commit()
        return len(keys)
    finally:
        conn.close()
