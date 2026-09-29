"""
Shared pytest setup.

* Makes backend/ importable (the API imports its modules as top-level names).
* Sets a test JWT secret and turns the audit log off, so tests never write
  to the real PostgreSQL database.
* load_module() imports pipeline scripts by path (python_pipeline/models.py
  would otherwise clash with the backend's `models` package).
"""

import importlib.util
import os
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
os.environ.setdefault("SECRET_KEY", "test-secret-key")
os.environ["AUDIT_ENABLED"] = "false"
os.environ["DB_SETUP_ON_STARTUP"] = "false"
sys.path.insert(0, str(ROOT / "backend"))

PROCESSED = ROOT / "processed_data"
REPORTS = ROOT / "reports"


def load_module(relative_path, name):
    spec = importlib.util.spec_from_file_location(name, ROOT / relative_path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


requires_processed_data = pytest.mark.skipif(
    not (PROCESSED / "features" / "menu_item_features.csv").exists(),
    reason="processed_data/ not generated — run the data pipeline first",
)


@pytest.fixture(scope="session")
def client():
    from fastapi.testclient import TestClient

    import main

    with TestClient(main.app) as c:
        yield c


@pytest.fixture(scope="session")
def token_for():
    from middleware.auth_middleware import create_token

    def make(role):
        token = create_token({"user_id": None, "email": f"{role}@test.local", "name": "Test", "role": role})
        return {"Authorization": f"Bearer {token}"}

    return make
