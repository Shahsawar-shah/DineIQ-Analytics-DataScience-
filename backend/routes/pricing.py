"""
Price intelligence API (SRS Steps 25-26): per-item price elasticity and
High / Moderate / Low sensitivity class, with the price-change events that
support it. Serves reports/price_sensitivity.json.
"""

from fastapi import APIRouter, Depends, HTTPException, Query

from middleware.auth_middleware import require_analytics
from routes.common import REPORTS, read_json

router = APIRouter(dependencies=[Depends(require_analytics)])


def _results():
    return read_json(REPORTS / "price_sensitivity.json")


def item_elasticities():
    """item_id -> elasticity for the what-if simulator. Positive measured
    values are noise (demand never rises because of a price rise), so they
    are capped at 0; unmeasured items are left out."""
    try:
        return {r["item_id"]: min(r["elasticity"], 0.0)
                for r in _results()["items"] if r["elasticity"] is not None}
    except HTTPException:
        return {}


@router.get("/sensitivity")
def get_sensitivity(sensitivity: str | None = Query(None)):
    data = _results()
    items = [{k: v for k, v in r.items() if k != "events"} for r in data["items"]]
    if sensitivity:
        items = [r for r in items if r["sensitivity"] == sensitivity]
    return {
        "method": data["method"],
        "thresholds": data["thresholds"],
        "summary": data["summary"],
        "items": items,
    }


@router.get("/items/{item_id}")
def get_item_price_history(item_id: int):
    for r in _results()["items"]:
        if r["item_id"] == item_id:
            return r
    raise HTTPException(status_code=404, detail="Item has no price history")
