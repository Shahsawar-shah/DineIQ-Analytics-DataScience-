"""
Central configuration for the DineIQ backend.

Every secret (database URL, JWT key) comes from config/.env or the process
environment — nothing sensitive is hard-coded in source files.
"""

import os
from pathlib import Path

from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(PROJECT_ROOT / "config" / ".env")

PROCESSED = PROJECT_ROOT / "processed_data"
FEATURES = PROCESSED / "features"
REPORTS = PROJECT_ROOT / "reports"

DATABASE_URL = os.getenv("DATABASE_URL")
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

if not SECRET_KEY:
    raise RuntimeError(
        "SECRET_KEY is not set. Add it to config/.env (see config/.env.example).")
