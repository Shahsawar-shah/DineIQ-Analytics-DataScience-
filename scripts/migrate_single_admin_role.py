"""One-off migration: the Super Admin becomes the only Admin.

The platform now has a single administrator role, "Admin", with everything
the old "Super Admin" could do (user management incl. granting Admin,
pipeline runner, all analytics). This script:
  1. renames the role of every "Super Admin" user to "Admin" (and the display
     name "Super Admin" to "Admin") — the account, email and password stay
  2. deactivates the old plain-admin demo login admin@dineiq.demo

Safe to run more than once. Run:  python3 scripts/migrate_single_admin_role.py
"""
import os
from pathlib import Path

import psycopg2
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / "config" / ".env")

OLD_PLAIN_ADMIN = "admin@dineiq.demo"


def main():
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise SystemExit("DATABASE_URL is not set — add it to config/.env")
    conn = psycopg2.connect(database_url)
    try:
        with conn.cursor() as cur:
            cur.execute("UPDATE users SET name='Admin' WHERE role='Super Admin' AND name='Super Admin'")
            cur.execute("UPDATE users SET role='Admin' WHERE role='Super Admin'")
            print(f"Super Admin accounts renamed to Admin: {cur.rowcount}")
            cur.execute("UPDATE users SET is_active=FALSE WHERE email=%s AND is_active=TRUE", (OLD_PLAIN_ADMIN,))
            print(f"Plain admin login {OLD_PLAIN_ADMIN} deactivated: {cur.rowcount}")
            cur.execute("SELECT email, is_active FROM users WHERE role='Admin' ORDER BY id")
            for email, active in cur.fetchall():
                print(f"  Admin: {email} ({'active' if active else 'inactive'})")
        conn.commit()
    finally:
        conn.close()


if __name__ == "__main__":
    main()
