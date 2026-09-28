"""PostgreSQL connection helper. The URL is read from config/.env via settings."""

import psycopg2

from settings import DATABASE_URL


def get_connection():
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL is not set. Add it to config/.env.")
    return psycopg2.connect(DATABASE_URL, connect_timeout=5)
