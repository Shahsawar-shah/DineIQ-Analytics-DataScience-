from fastapi import APIRouter
from pathlib import Path
import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
PROCESSED = PROJECT_ROOT / "processed_data"
FEATURES = PROCESSED / "features"

router = APIRouter()


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

    return {
        "total": len(recommendations),
        "critical": len([r for r in recommendations
                        if r["priority"] == "Critical"]),
        "high": len([r for r in recommendations
                    if r["priority"] == "High"]),
        "medium": len([r for r in recommendations
                      if r["priority"] == "Medium"]),
        "recommendations": recommendations
    }
