"""API tests: role-based access, real (not hard-coded) metrics, forecast
configuration and rating anomaly rules."""

import json

import pandas as pd
import pytest

from conftest import REPORTS, requires_processed_data


# --- Security: authentication + role-based access ---------------------------
@requires_processed_data
def test_requests_without_token_are_rejected(client):
    assert client.get("/api/menu/summary").status_code == 401
    assert client.get("/api/dashboard/summary").status_code == 401


@requires_processed_data
@pytest.mark.parametrize("role, path, expected", [
    ("Cashier", "/api/menu/summary", 200),
    ("Cashier", "/api/orders/by-channel", 200),
    ("Cashier", "/api/dashboard/summary", 403),
    ("Cashier", "/api/customers/summary", 403),
    ("Restaurant Manager", "/api/customers/segments", 200),
    ("Restaurant Manager", "/api/admin/spark-jobs", 403),
    ("Admin", "/api/admin/spark-jobs", 200),
    ("Super Admin", "/api/admin/spark-jobs", 403),   # role no longer exists
    ("Customer", "/api/forecast/comparison", 403),
])
def test_role_based_access(client, token_for, role, path, expected):
    assert client.get(path, headers=token_for(role)).status_code == expected


def test_forged_token_is_rejected(client):
    headers = {"Authorization": "Bearer not-a-real-token"}
    assert client.get("/api/menu/summary", headers=headers).status_code == 401


class _FakeCursor:
    """Stands in for PostgreSQL: reports existing users and records any INSERT."""

    def __init__(self, log):
        self.log = log

    def execute(self, sql, params=None):
        self.log.append(sql)

    def fetchone(self):
        return (5,)

    def close(self):
        pass


class _FakeConnection:
    def __init__(self, log):
        self.log = log

    def cursor(self):
        return _FakeCursor(self.log)

    def commit(self):
        pass

    def rollback(self):
        pass

    def close(self):
        pass


def test_public_registration_cannot_create_admins(client, monkeypatch):
    import routes.auth as auth_routes

    executed = []
    monkeypatch.setattr(auth_routes, "get_connection", lambda: _FakeConnection(executed))
    for role in ("Admin", "Cashier"):
        res = client.post("/api/auth/register", json={
            "name": "x", "email": f"blocked-{role}@test.local", "password": "Passw0rd!", "role": role})
        assert res.status_code == 403
    assert not any("INSERT" in sql for sql in executed)


# --- Metrics come from the pipeline reports ---------------------------------
@requires_processed_data
def test_ml_metrics_endpoint_serves_the_saved_reports(client, token_for):
    body = client.get("/api/dashboard/ml-metrics", headers=token_for("Admin")).json()
    spark = json.loads((REPORTS / "spark_model_metrics.json").read_text())
    python = json.loads((REPORTS / "python_model_metrics.json").read_text())
    assert body["spark_pipeline"]["best_model"] == spark["best_model"]
    assert body["spark_pipeline"]["model_version"] == spark["model_version"]
    assert body["python_pipeline"]["best_model"] == python["best_model"]
    best = body["python_pipeline"]["models"][python["best_model"]]
    for key in ("precision", "recall", "f1_score", "confusion_matrix", "prediction_latency_ms"):
        assert key in best
    cm = best["confusion_matrix"]
    assert sum(map(sum, cm)) == python["test_size"]


# --- Forecast configuration -------------------------------------------------
@requires_processed_data
@pytest.mark.parametrize("horizon", [7, 30, 90])
def test_forecast_horizon_is_configurable(client, token_for, horizon):
    body = client.get(f"/api/forecast/demand?level=overall&horizon={horizon}", headers=token_for("Admin")).json()
    assert len(body["future"]) == horizon
    assert body["test_period"]["start"] > body["train_period"]["end"]  # chronological split


@requires_processed_data
def test_forecast_rejects_out_of_range_horizon(client, token_for):
    assert client.get("/api/forecast/demand?horizon=500", headers=token_for("Admin")).status_code == 400


# --- Rating anomaly rules (SRS Step 30) -------------------------------------
def test_rating_anomaly_rules_detect_injected_patterns():
    from routes.anomalies import detect_rating_anomalies

    days = pd.date_range("2026-01-01", periods=40, freq="D")
    rows = []
    for i, d in enumerate(days):
        # item 1: steady 3.0 for 20 days, then 4.8 -> rating spike
        rows += [{"item_id": 1, "rating_date": d.strftime("%Y-%m-%d"), "rating_value": 3.0 if i < 20 else 4.8}] * 2
        # item 2: stable 4.0 -> no shift
        rows += [{"item_id": 2, "rating_date": d.strftime("%Y-%m-%d"), "rating_value": 4.0}] * 2
    # item 3: 25 identical 5-star ratings on one day
    rows += [{"item_id": 3, "rating_date": "2026-01-10", "rating_value": 5.0}] * 25
    found = detect_rating_anomalies(pd.DataFrame(rows), {1: "Spike item", 2: "Stable item", 3: "Fake item"})

    types = {(a["item_id"], a["type"]) for a in found}
    assert (1, "Sudden Rating Spike") in types
    assert (3, "Excessive Identical Ratings") in types
    assert not any(a["item_id"] == 2 and a["rule"] == "RATING_SHIFT" for a in found)


# --- Audit event classification ---------------------------------------------
def test_audit_event_classification():
    from middleware.audit_middleware import classify

    assert classify("POST", "/api/auth/login") == ("auth", "auth.login")
    assert classify("GET", "/api/forecast/demand")[0] == "ml"
    assert classify("PUT", "/api/auth/users/4")[0] == "auth"
    assert classify("POST", "/api/whatif/simulate")[0] == "crud"
    assert classify("GET", "/api/menu/items")[0] == "view"


# --- Pipeline runner (does not launch Spark) ---------------------------------
def test_pipeline_runner_access_and_validation(client, token_for):
    body = {"preset": "core"}
    assert client.post("/api/admin/run-pipeline", json=body, headers=token_for("Cashier")).status_code == 403
    assert client.post("/api/admin/run-pipeline", json=body, headers=token_for("Restaurant Manager")).status_code == 403
    assert client.post("/api/admin/run-pipeline", json={"preset": "nope"}, headers=token_for("Admin")).status_code == 400

    presets = client.get("/api/admin/run-pipeline/presets", headers=token_for("Admin")).json()
    assert presets["core"] == [
        "spark_jobs/ingestion.py", "spark_jobs/data_quality.py", "spark_jobs/cleaning.py",
        "spark_jobs/feature_engineering.py", "spark_jobs/spark_ml_models.py",
        "python_pipeline/models.py", "python_pipeline/comparison.py",
    ]
    assert set(presets["core"]) <= set(presets["full"])
    status = client.get("/api/admin/run-pipeline/status", headers=token_for("Admin"))
    assert status.status_code == 200 and "steps" in status.json()



# --- Single Admin role: the last active Admin is protected --------------------
class _ScriptedCursor:
    """Fake cursor that answers each SELECT from a queue and records UPDATEs."""

    def __init__(self, answers, log):
        self.answers, self.log = list(answers), log

    def execute(self, sql, params=None):
        self.log.append(sql)

    def fetchone(self):
        return self.answers.pop(0)

    def close(self):
        pass


class _ScriptedConnection(_FakeConnection):
    def __init__(self, answers, log):
        super().__init__(log)
        self.answers = answers

    def cursor(self):
        return _ScriptedCursor(self.answers, self.log)


@pytest.mark.parametrize("change, answers, expected", [
    # demote the only Admin -> blocked
    ({"name": "A", "role": "Cashier", "is_active": True}, [("Admin",), (0,)], 409),
    # deactivate the only Admin via update -> blocked
    ({"name": "A", "role": "Admin", "is_active": False}, [("Admin",), (0,)], 409),
    # demote an Admin while another active Admin exists -> allowed
    ({"name": "A", "role": "Cashier", "is_active": True}, [("Admin",), (1,)], 200),
    # promote a Cashier to Admin -> allowed (Admin has full rights)
    ({"name": "C", "role": "Admin", "is_active": True}, [("Cashier",)], 200),
])
def test_last_admin_cannot_be_removed(client, token_for, monkeypatch, change, answers, expected):
    import routes.auth as auth_routes

    executed = []
    monkeypatch.setattr(auth_routes, "get_connection", lambda: _ScriptedConnection(list(answers), executed))
    res = client.put("/api/auth/users/7", json=change, headers=token_for("Admin"))
    assert res.status_code == expected
    assert any(sql.startswith("UPDATE") for sql in executed) == (expected == 200)


def test_last_admin_cannot_be_deactivated(client, token_for, monkeypatch):
    import routes.auth as auth_routes

    monkeypatch.setattr(auth_routes, "get_connection", lambda: _ScriptedConnection([("Admin",), (0,)], []))
    assert client.delete("/api/auth/users/7", headers=token_for("Admin")).status_code == 409
