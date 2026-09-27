"""Creates the standard demo accounts (one per role) used for competition judging."""
import psycopg2
import bcrypt

DATABASE_URL = "postgresql://dineiq_user:DineIQ2024Strong@187.127.98.233:5432/dineiq_analytics"

DEMO_USERS = [
    {"name": "Admin User", "email": "admin@dineiq.demo", "password": "Demo@12345", "role": "Admin"},
    {"name": "Restaurant Manager", "email": "manager@dineiq.demo", "password": "Demo@12345", "role": "Restaurant Manager"},
    {"name": "Inventory Manager", "email": "inventory@dineiq.demo", "password": "Demo@12345", "role": "Inventory Manager"},
    {"name": "Demo Customer", "email": "customer@dineiq.demo", "password": "Demo@12345", "role": "Customer"},
]


def main():
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    try:
        for u in DEMO_USERS:
            password_hash = bcrypt.hashpw(
                u["password"].encode(), bcrypt.gensalt()).decode()
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
