"""Creates the standard demo accounts (one per role) used for competition judging.

The database URL is read from config/.env (DATABASE_URL) — never hard-coded.
Run:  python scripts/create_demo_accounts.py
"""
import os
from pathlib import Path

import bcrypt
import psycopg2
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / "config" / ".env")

DATABASE_URL = os.getenv("DATABASE_URL")
DEMO_PASSWORD = os.getenv("DEMO_ACCOUNT_PASSWORD", "Demo@12345")

DEMO_USERS = [
    # The single administrator (formerly "Super Admin"; the plain admin@ login was removed)
    {"name": "Admin", "email": "superadmin@dineiq.demo", "role": "Admin"},
    {"name": "Restaurant Manager", "email": "manager@dineiq.demo", "role": "Restaurant Manager"},
    {"name": "Inventory Manager", "email": "inventory@dineiq.demo", "role": "Inventory Manager"},
    {"name": "Cashier", "email": "cashier@dineiq.demo", "role": "Cashier"},
    {"name": "Demo Customer", "email": "customer@dineiq.demo", "role": "Customer"},
]


def main():
    if not DATABASE_URL:
        raise SystemExit("DATABASE_URL is not set — add it to config/.env")
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    try:
        for u in DEMO_USERS:
            password_hash = bcrypt.hashpw(
                DEMO_PASSWORD.encode(), bcrypt.gensalt()).decode()
            cur.execute(
                """
                INSERT INTO users (name, email, password_hash, role, is_active)
                VALUES (%s, %s, %s, %s, TRUE)
                ON CONFLICT (email) DO UPDATE SET
                    name = EXCLUDED.name,
                    password_hash = EXCLUDED.password_hash,
                    role = EXCLUDED.role,
                    is_active = TRUE
                """,
                (u["name"], u["email"], password_hash, u["role"])
            )
            conn.commit()
            print(f"Success: {u['role']} account ready -> {u['email']}")
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    main()
