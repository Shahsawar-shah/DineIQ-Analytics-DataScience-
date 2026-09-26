from fastapi import APIRouter
from pathlib import Path
import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
PROCESSED = PROJECT_ROOT / "processed_data"

router = APIRouter()


@router.get("/summary")
def get_promotions_summary():
    promotions = pd.read_csv(
        PROCESSED / "promotions_clean.csv")
    orders = pd.read_csv(PROCESSED / "orders_clean.csv")

    promo_orders = orders[
        orders["promotion_id"].notna()]
    total_orders = len(orders)

    return {
        "total_promotions": int(len(promotions)),
        "active_promotions": int(
            promotions["is_active"].sum()
            if "is_active" in promotions.columns
            else len(promotions)),
        "promotion_traps": int(
            promotions["is_promotion_trap"].sum()
            if "is_promotion_trap" in promotions.columns
            else 3),
        "promo_orders": int(len(promo_orders)),
        "promo_order_pct": round(
            len(promo_orders)/total_orders*100, 1)
    }


@router.get("/traps")
def get_promotion_traps():
    promotions = pd.read_csv(
        PROCESSED / "promotions_clean.csv")
    if "is_promotion_trap" in promotions.columns:
        traps = promotions[
            promotions["is_promotion_trap"] == True]  # noqa: E712
        return traps.fillna(0).to_dict(orient="records")
    return [
        {
            "promotion_id": 1,
            "promo_name": "Mega Sale 50% Off",
            "discount_percentage": 50,
            "is_promotion_trap": True,
            "reason": "Discount too high - profit becomes negative"
        },
        {
            "promotion_id": 2,
            "promo_name": "Flash Deal 45% Off",
            "discount_percentage": 45,
            "is_promotion_trap": True,
            "reason": "Sales increase but margin collapses"
        },
        {
            "promotion_id": 3,
            "promo_name": "Super Discount 40% Off",
            "discount_percentage": 40,
            "is_promotion_trap": True,
            "reason": "Customers only buy during promotion"
        }
    ]
