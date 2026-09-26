from fastapi import APIRouter, Query
from pathlib import Path
import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
PROCESSED = PROJECT_ROOT / "processed_data"
FEATURES = PROCESSED / "features"

router = APIRouter()


@router.get("/summary")
def get_wastage_summary():
    df = pd.read_csv(PROCESSED / "wastage_clean.csv")
    menu = pd.read_csv(FEATURES / "menu_item_features.csv")
    return {
        "total_records": int(len(df)),
        "total_wastage_cost": round(
            float(df["wastage_cost"].sum()), 2),
        "avg_wastage_quantity": round(
            float(df["wastage_quantity"].mean()), 2),
        "by_reason": df["wastage_reason"].value_counts().to_dict(),
        "high_wastage_items": int(
            len(menu[menu["wastage_percentage"] > 50])),
        "avg_wastage_pct": round(
            float(menu["wastage_percentage"].mean()), 2),
        "impossible_removed": 500
    }


@router.get("/high-risk")
def get_high_risk(limit: int = Query(default=10)):
    menu = pd.read_csv(FEATURES / "menu_item_features.csv")
    high = menu.nlargest(limit, "wastage_percentage")
    return high[[
        "item_id", "item_name", "wastage_percentage",
        "total_wastage", "total_revenue", "profit_percentage"
    ]].to_dict(orient="records")


@router.get("/by-reason")
def get_by_reason():
    df = pd.read_csv(PROCESSED / "wastage_clean.csv")
    reasons = df["wastage_reason"].value_counts()
    total = len(df)
    return [
        {
            "reason": reason,
            "count": int(count),
            "percentage": round(count/total*100, 1),
            "cost": round(float(
                df[df["wastage_reason"] == reason
                   ]["wastage_cost"].sum()), 2)
        }
        for reason, count in reasons.items()
    ]
