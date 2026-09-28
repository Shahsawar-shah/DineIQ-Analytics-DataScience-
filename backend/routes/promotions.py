"""
Promotion effectiveness and trap detection API (SRS Steps 27-28).

Serves reports/promotion_analysis.json from
python_pipeline/promotion_analysis.py, which detects traps from actual order
and profit data — the generator's is_promotion_trap flag is not used.
"""

from fastapi import APIRouter, Depends

from middleware.auth_middleware import require_analytics
from routes.common import REPORTS, read_json

router = APIRouter(dependencies=[Depends(require_analytics)])


def _results():
    return read_json(REPORTS / "promotion_analysis.json")


@router.get("/summary")
def get_promotions_summary():
    data = _results()
    summary = data["summary"]
    return {
        "total_promotions": summary["total_promotions"],
        "promotion_traps": summary["traps_detected"],
        "effective_promotions": summary["effective"],
        "neutral_promotions": summary["neutral"],
        "promo_orders": summary["promo_orders"],
        "promo_order_pct": summary["promo_order_pct"],
        "thresholds": data["thresholds"],
        "validation": summary["validation"],
        "generated_at": data["generated_at"],
    }


@router.get("/effectiveness")
def get_promotion_effectiveness():
    return _results()["promotions"]


@router.get("/traps")
def get_promotion_traps():
    return [p for p in _results()["promotions"] if p["is_trap"]]
