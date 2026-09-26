from fastapi import APIRouter, Query
from pathlib import Path
import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
PROCESSED = PROJECT_ROOT / "processed_data"
FEATURES = PROCESSED / "features"

router = APIRouter()


@router.get("/summary")
def get_locations_summary():
    df = pd.read_csv(FEATURES / "location_features.csv")
    restaurants = pd.read_csv(
        PROCESSED / "restaurants_clean.csv")
    # location_features.csv already has restaurant_name — only bring in
    # location_city from restaurants_clean.csv to avoid a duplicate-column merge.
    merged = df.merge(
        restaurants[["restaurant_id", "location_city"]],
        on="restaurant_id", how="left")
    return merged[[
        "restaurant_id", "restaurant_name",
        "location_city", "total_revenue",
        "total_orders", "avg_order_value",
        "total_customers", "avg_rating",
        "total_wastage_cost", "top_channel"
    ]].fillna(0).to_dict(orient="records")


@router.get("/top")
def get_top_locations(limit: int = Query(default=5)):
    df = pd.read_csv(FEATURES / "location_features.csv")
    restaurants = pd.read_csv(
        PROCESSED / "restaurants_clean.csv")
    merged = df.merge(
        restaurants[["restaurant_id", "location_city"]],
        on="restaurant_id", how="left")
    top = merged.nlargest(limit, "total_revenue")
    return top[[
        "restaurant_id", "restaurant_name",
        "location_city", "total_revenue",
        "total_orders", "avg_rating"
    ]].fillna(0).to_dict(orient="records")
