from fastapi import APIRouter, Depends, HTTPException
from pathlib import Path
import pandas as pd

from middleware.auth_middleware import require_analytics
from routes.common import REPORTS, read_csv, read_json

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
PROCESSED = PROJECT_ROOT / "processed_data"
FEATURES = PROCESSED / "features"

router = APIRouter(dependencies=[Depends(require_analytics)])


@router.get("/all")
def get_recommendations():
    menu = pd.read_csv(FEATURES / "menu_item_features.csv")
    classifications = pd.read_csv(
        PROCESSED / "python_menu_classifications.csv")
    merged = menu.merge(
        classifications[["item_id", "python_class"]],
        on="item_id", how="left")

    recommendations = []

    # Hidden Opportunities → Promote
    hidden = merged[
        merged["python_class"] == "Hidden Opportunity"]
    for _, row in hidden.iterrows():
        recommendations.append({
            "item_id": int(row["item_id"]),
            "item_name": str(row["item_name"]),
            "action": "Promote",
            "priority": "High",
            "evidence": {
                "profit_percentage": round(
                    float(row["profit_percentage"]), 1),
                "avg_rating": round(
                    float(row["avg_rating"]), 2),
                "wastage_percentage": round(
                    float(row["wastage_percentage"]), 1),
                "total_quantity_sold": int(
                    row["total_quantity_sold"])
            },
            "reason": (
                f"High margin ({round(float(row['profit_percentage']), 1)}%) "
                f"with low visibility. "
                f"Rating: {round(float(row['avg_rating']), 2)}. "
                f"Promoting could increase revenue significantly."
            ),
            "estimated_impact": f"+{round(float(row['profit_percentage'])*10)}% revenue potential"
        })

    # High wastage → Reduce prep
    high_wastage = merged[
        merged["wastage_percentage"] > 35].nlargest(5, "wastage_percentage")
    for _, row in high_wastage.iterrows():
        recommendations.append({
            "item_id": int(row["item_id"]),
            "item_name": str(row["item_name"]),
            "action": "Reduce Preparation Quantity",
            "priority": "Critical",
            "evidence": {
                "wastage_percentage": round(
                    float(row["wastage_percentage"]), 1),
                "total_wastage": round(
                    float(row["total_wastage"]), 0),
                "wastage_cost_estimate": round(
                    float(row["total_wastage"]) *
                    float(row["avg_cost_price"]), 2)
            },
            "reason": (
                f"Wastage at {round(float(row['wastage_percentage']), 1)}% "
                f"is critically high. "
                f"Reducing prep quantity by 30% recommended."
            ),
            "estimated_impact": f"Save ~${round(float(row['total_wastage'])*float(row['avg_cost_price'])*0.3, 0)}"
        })

    # Low performers → Review/Remove
    low = merged[
        merged["python_class"] == "Low Performer"
    ].nlargest(5, "wastage_percentage")
    for _, row in low.iterrows():
        recommendations.append({
            "item_id": int(row["item_id"]),
            "item_name": str(row["item_name"]),
            "action": "Review or Remove",
            "priority": "Medium",
            "evidence": {
                "profit_percentage": round(
                    float(row["profit_percentage"]), 1),
                "total_quantity_sold": int(
                    row["total_quantity_sold"]),
                "avg_rating": round(
                    float(row["avg_rating"]), 2)
            },
            "reason": (
                f"Low performer with "
                f"{round(float(row['profit_percentage']), 1)}% margin. "
                f"Consider redesigning or removing from menu."
            ),
            "estimated_impact": "Improve menu efficiency"
        })

    # Promotion dependent → Review promotion
    promo_dep = merged[
        merged["promotion_dependency"] > 0.6
    ].head(3)
    for _, row in promo_dep.iterrows():
        recommendations.append({
            "item_id": int(row["item_id"]),
            "item_name": str(row["item_name"]),
            "action": "Review Promotion Strategy",
            "priority": "Medium",
            "evidence": {
                "promotion_dependency": round(
                    float(row["promotion_dependency"]), 2),
                "profit_percentage": round(
                    float(row["profit_percentage"]), 1)
            },
            "reason": (
                f"{round(float(row['promotion_dependency'])*100)}% "
                f"of sales during promotions. "
                f"Risk of promotion trap."
            ),
            "estimated_impact": "Reduce promotion cost"
        })

    recommendations += analysis_recommendations(merged)

    return {
        "total": len(recommendations),
        "critical": len([r for r in recommendations
                        if r["priority"] == "Critical"]),
        "high": len([r for r in recommendations
                    if r["priority"] == "High"]),
        "medium": len([r for r in recommendations
                      if r["priority"] == "Medium"]),
        "low": len([r for r in recommendations
                   if r["priority"] == "Low"]),
        "recommendations": recommendations
    }


def _optional(name):
    try:
        return read_json(REPORTS / name)
    except HTTPException:
        return None


def analysis_recommendations(merged):
    """Recommendations backed by the basket, pricing, promotion and
    churn analyses (SRS Step 37). Each carries its evidence."""
    recs = []

    basket = _optional("basket_results.json")
    if basket:
        for combo in basket["combos"][:3]:
            recs.append({
                "item_id": combo["antecedents"][0]["item_id"],
                "item_name": combo["rule"],
                "action": "Bundle Frequently Purchased Items",
                "priority": "Medium",
                "evidence": {"support": combo["support"], "confidence": combo["confidence"],
                             "lift": combo["lift"], "orders_together": combo["order_count"]},
                "reason": combo["reason"],
                "estimated_impact": "Higher basket size on orders that already contain one of the items",
            })

    pricing = _optional("price_sensitivity.json")
    if pricing:
        for item in pricing["items"]:
            if item["sensitivity"] in ("Highly Price Sensitive", "Moderately Price Sensitive"):
                recs.append({
                    "item_id": item["item_id"],
                    "item_name": item["item_name"],
                    "action": "Review Pricing",
                    "priority": "High" if item["sensitivity"] == "Highly Price Sensitive" else "Medium",
                    "evidence": {"elasticity": item["elasticity"],
                                 "significant_price_changes": item["significant_changes"],
                                 "profit_percentage": item["profit_percentage"]},
                    "reason": (f"{item['sensitivity']}: demand moved {abs(item['elasticity']):.2f}% for every 1% "
                               f"price change, with {item['significant_changes']} statistically significant shift(s)"),
                    "estimated_impact": "Avoid further price rises; test small discounts instead",
                })

    promotions = _optional("promotion_analysis.json")
    if promotions:
        for promo in promotions["promotions"]:
            if promo["is_trap"]:
                recs.append({
                    "item_id": None,
                    "item_name": promo["promo_name"],
                    "action": "Review Ineffective Promotion",
                    "priority": "Critical",
                    "evidence": {"promo_margin_pct": promo["promo_margin_pct"],
                                 "regular_margin_pct": promo["regular_margin_pct"],
                                 "sales_change_pct": promo["sales_change_pct"],
                                 "profit_change_pct": promo["profit_change_pct"],
                                 "promo_profit": promo["promo_profit"]},
                    "reason": "; ".join(r["evidence"] for r in promo["trap_rules"]),
                    "estimated_impact": f"Stops a promotion that returned {promo['promo_profit']:,.0f} profit",
                })

    customers = read_csv(FEATURES / "customer_features.csv",
                         usecols=["churn_at_risk", "monetary_value", "spend_prior_90d", "spend_recent_90d"])
    at_risk = customers[customers["churn_at_risk"].fillna(False).astype(bool)]
    if len(at_risk):
        lost_spend = float((at_risk["spend_prior_90d"] - at_risk["spend_recent_90d"]).sum())
        recs.append({
            "item_id": None,
            "item_name": "At-Risk customer segment",
            "action": "Target Customer Segment",
            "priority": "High",
            "evidence": {"customers": int(len(at_risk)),
                         "spend_decline_90d": round(lost_spend, 2),
                         "avg_lifetime_value": round(float(at_risk["monetary_value"].mean()), 2)},
            "reason": (f"{len(at_risk):,} customers inactive for 60+ days with falling order frequency and "
                       f"spend, {lost_spend:,.0f} less spend than the previous 90 days"),
            "estimated_impact": "Win-back campaign on their favourite category",
        })
    return recs
