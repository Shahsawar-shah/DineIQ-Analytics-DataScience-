"""
Market-basket API (SRS Steps 17-18): association rules with support,
confidence and lift, plus bundle / cross-sell / upsell recommendations.
Serves reports/basket_results.json from python_pipeline/market_basket.py.
"""

from fastapi import APIRouter, Depends, Query

from middleware.auth_middleware import require_analytics
from routes.common import REPORTS, read_json

router = APIRouter(dependencies=[Depends(require_analytics)])


def _results():
    return read_json(REPORTS / "basket_results.json")


@router.get("/rules")
def get_rules(
    min_lift: float = Query(1.0, ge=0),
    min_confidence: float = Query(0.0, ge=0, le=1),
    include_loss_items: bool = Query(True),
    limit: int = Query(50, ge=1, le=500),
):
    data = _results()
    rules = [
        r for r in data["rules"]
        if r["lift"] >= min_lift and r["confidence"] >= min_confidence
        and (include_loss_items or not r["has_loss_making_item"])
    ]
    return {
        "summary": data["summary"],
        "parameters": data["parameters"],
        "algorithm": data["algorithm"],
        "total_matching": len(rules),
        "rules": rules[:limit],
    }


@router.get("/bundles")
def get_bundles():
    data = _results()
    return {
        "min_lift": data["parameters"]["bundle_min_lift"],
        "combos": data["combos"],
        "frequently_paired": data["frequently_paired"],
        "loss_warnings": data["loss_warnings"],
    }


@router.get("/recommendations")
def get_basket_recommendations():
    data = _results()
    recs = []
    for kind, rows in (("Combo Meal", data["combos"]), ("Cross-Sell", data["cross_sell"]),
                       ("Upsell", data["upsell"]), ("Do Not Bundle", data["loss_warnings"])):
        for r in rows:
            recs.append({
                "type": kind,
                "recommendation": r["recommendation"],
                "reason": r["reason"],
                "rule": r["rule"],
                "support": r["support"],
                "confidence": r["confidence"],
                "lift": r["lift"],
                "order_count": r["order_count"],
                "priority": "High" if kind == "Do Not Bundle" or r["lift"] >= 2.5 else "Medium",
            })
    return {"total": len(recs), "summary": data["summary"], "recommendations": recs}
