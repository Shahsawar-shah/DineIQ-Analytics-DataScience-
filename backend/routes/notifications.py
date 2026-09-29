"""
Notifications for the bell in the top bar.

Every signed-in user gets a one-time welcome message. Admin, Restaurant
Manager and Inventory Manager also get the current Critical / High
anomalies (real detections from routes/anomalies.py). Dismissing a
notification stores it in notification_dismissals, so it is gone for that
user permanently, on every device.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from middleware.auth_middleware import ANALYTICS_ROLES, verify_token
from models.notifications import dismiss, dismissed_keys
from routes import anomalies

router = APIRouter()

ALERT_SEVERITIES = ("Critical", "High")
SEVERITY_ORDER = {"Critical": 0, "High": 1}

WELCOME_TEXT = {
    "Admin": "Manage users and roles, run the Spark and Python pipelines, and review every dashboard.",
    "Restaurant Manager": "Menu, customer, forecast, pricing and promotion intelligence for all locations.",
    "Inventory Manager": "Stock, wastage and demand forecasts to plan purchasing.",
    "Cashier": "Orders and menu at a glance.",
    "Customer": "Your orders, favourites, ratings and personalised recommendations.",
}


class DismissRequest(BaseModel):
    keys: list[str]


def _user_key(payload):
    email = payload.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Token has no email")
    return email


def build_notifications(payload):
    role = payload.get("role")
    items = [{
        "key": "welcome",
        "type": "welcome",
        "severity": "Info",
        "title": f"Welcome to DineIQ Analytics, {payload.get('name') or 'there'}",
        "text": WELCOME_TEXT.get(role, "Restaurant intelligence from your own Spark and Python pipelines."),
        "time": "New",
        "link": None,
    }]
    if role in ANALYTICS_ROLES:
        try:
            detected = anomalies.sales_anomalies() + anomalies.rating_anomalies()
        except HTTPException:  # pipeline outputs not generated yet
            detected = []
        alerts = sorted(
            (a for a in detected if a["severity"] in ALERT_SEVERITIES),
            key=lambda a: (SEVERITY_ORDER[a["severity"]], a["type"], a["item_name"]),
        )
        items += [{
            "key": f"anomaly:{a['rule']}:{a['item_id']}:{a['date']}:{a['type']}",
            "type": "anomaly",
            "severity": a["severity"],
            "title": f"{a['type']}: {a['item_name']}",
            "text": a["description"],
            "time": a["date"] or a["severity"],
            "link": "anomalies",
        } for a in alerts]
    return items


@router.get("")
def list_notifications(payload: dict = Depends(verify_token)):
    items = build_notifications(payload)
    try:
        hidden = dismissed_keys(_user_key(payload))
        persisted = True
    except HTTPException:
        raise
    except Exception:  # database unreachable: still show notifications
        hidden, persisted = set(), False
    visible = [n for n in items if n["key"] not in hidden]
    return {"unread": len(visible), "persisted": persisted, "notifications": visible}


@router.post("/dismiss")
def dismiss_notifications(req: DismissRequest, payload: dict = Depends(verify_token)):
    valid = {n["key"] for n in build_notifications(payload)}
    keys = [k for k in req.keys if k in valid]
    try:
        dismiss(_user_key(payload), keys)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Could not save dismissal: {exc}")
    return {"dismissed": len(keys)}


@router.post("/dismiss-all")
def dismiss_all_notifications(payload: dict = Depends(verify_token)):
    keys = [n["key"] for n in build_notifications(payload)]
    try:
        dismiss(_user_key(payload), keys)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Could not save dismissal: {exc}")
    return {"dismissed": len(keys)}
