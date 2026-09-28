from fastapi import APIRouter, Depends, HTTPException, Query

from middleware.auth_middleware import require_analytics
from routes.common import FEATURES, PROCESSED, REPORTS, read_csv, read_json, records

router = APIRouter(dependencies=[Depends(require_analytics)])

HIGH_WASTAGE_PCT = 50


def _impossible_removed():
    """Rows dropped by the cleaning rule, from the Spark data-quality report."""
    try:
        checks = read_json(REPORTS / "data_quality_report.json")["tables"]["wastage"]["checks"]
    except (HTTPException, KeyError):
        return None
    return sum(c["count"] for c in checks if c["check"].startswith(("Impossible", "Negative")))


@router.get("/summary")
def get_wastage_summary():
    df = read_csv(PROCESSED / "wastage_clean.csv")
    menu = read_csv(FEATURES / "menu_item_features.csv")
    return {
        "total_records": int(len(df)),
        "total_wastage_quantity": round(float(df["wastage_quantity"].sum()), 2),
        "total_wastage_cost": round(float(df["wastage_cost"].sum()), 2),
        "avg_wastage_quantity": round(float(df["wastage_quantity"].mean()), 2),
        "by_reason": df["wastage_reason"].value_counts().to_dict(),
        "high_wastage_items": int((menu["wastage_percentage"] > HIGH_WASTAGE_PCT).sum()),
        "avg_wastage_pct": round(float(menu["wastage_percentage"].mean()), 2),
        "impossible_removed": _impossible_removed(),
    }


@router.get("/high-risk")
def get_high_risk(limit: int = Query(default=10, ge=1, le=150)):
    menu = read_csv(FEATURES / "menu_item_features.csv")
    high = menu.nlargest(limit, "wastage_percentage")
    return records(high[[
        "item_id", "item_name", "wastage_percentage", "total_wastage", "total_wastage_cost",
        "total_revenue", "profit_percentage",
    ]])


@router.get("/by-reason")
def get_by_reason():
    df = read_csv(PROCESSED / "wastage_clean.csv")
    grouped = df.groupby("wastage_reason").agg(count=("wastage_id", "size"), cost=("wastage_cost", "sum"))
    grouped = grouped.sort_values("count", ascending=False).reset_index()
    grouped["percentage"] = (grouped["count"] / len(df) * 100).round(1)
    grouped["cost"] = grouped["cost"].round(2)
    return records(grouped.rename(columns={"wastage_reason": "reason"}))


@router.get("/trends")
def get_wastage_trends():
    df = read_csv(PROCESSED / "wastage_clean.csv", usecols=["wastage_date", "wastage_quantity", "wastage_cost"])
    month = df["wastage_date"].str[:7]
    monthly = df.groupby(month).agg(quantity=("wastage_quantity", "sum"), cost=("wastage_cost", "sum"),
                                    records=("wastage_cost", "size")).round(2).reset_index()
    return records(monthly.rename(columns={"wastage_date": "month"}))


@router.get("/by-location")
def get_wastage_by_location():
    df = read_csv(PROCESSED / "wastage_clean.csv", usecols=["restaurant_id", "wastage_quantity", "wastage_cost"])
    restaurants = read_csv(PROCESSED / "restaurants_clean.csv", usecols=["restaurant_id", "restaurant_name"])
    grouped = df.groupby("restaurant_id").agg(quantity=("wastage_quantity", "sum"), cost=("wastage_cost", "sum")) \
        .round(2).reset_index().merge(restaurants, on="restaurant_id", how="left") \
        .sort_values("cost", ascending=False)
    return records(grouped)
