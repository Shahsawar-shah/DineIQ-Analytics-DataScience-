"""
DineIQ Analytics - Feature Engineering

Builds ML-ready feature tables from the cleaned data in processed_data/:
  menu_item_features.csv, customer_features.csv,
  order_features.csv, location_features.csv

Run from anywhere:  python spark_jobs/feature_engineering.py
Reads from  <project root>/processed_data/ (*_clean.csv)
Writes to   <project root>/processed_data/features/
"""

USE_SPARK = False  # Pandas only for now. Flip to True once Spark path is wired up.

from datetime import datetime
from pathlib import Path

import numpy as np
import pandas as pd

# if USE_SPARK:
#     from pyspark.sql import SparkSession
#     from pyspark.sql import functions as F
#     from pyspark.sql.window import Window

PROJECT_ROOT = Path(__file__).resolve().parent.parent
PROCESSED_DATA_DIR = PROJECT_ROOT / "processed_data"
FEATURES_DIR = PROCESSED_DATA_DIR / "features"

PEAK_HOURS = {12, 13, 14, 19, 20, 21}
WEEKEND_DAYS = {5, 6}  # Saturday, Sunday (Monday=0 .. Sunday=6)


def quintile_score(series, reverse=False):
    ranks = series.rank(method="first")
    labels = [5, 4, 3, 2, 1] if reverse else [1, 2, 3, 4, 5]
    return pd.qcut(ranks, 5, labels=labels).astype(int)


def top_value(series):
    return series.value_counts().idxmax()


# ---------------------------------------------------------------------------
# Loaders
# ---------------------------------------------------------------------------
def load_data():
    orders = pd.read_csv(
        PROCESSED_DATA_DIR / "orders_clean.csv", parse_dates=["order_date"]
    )
    order_items = pd.read_csv(PROCESSED_DATA_DIR / "order_items_clean.csv")
    ratings = pd.read_csv(
        PROCESSED_DATA_DIR / "ratings_clean.csv", parse_dates=["rating_date"]
    )
    wastage = pd.read_csv(
        PROCESSED_DATA_DIR / "wastage_clean.csv", parse_dates=["wastage_date"]
    )
    menu_items = pd.read_csv(
        PROCESSED_DATA_DIR / "menu_items_clean.csv", parse_dates=["launch_date"]
    )
    customers = pd.read_csv(PROCESSED_DATA_DIR / "customers_clean.csv")
    restaurants = pd.read_csv(PROCESSED_DATA_DIR / "restaurants_clean.csv")
    return orders, order_items, ratings, wastage, menu_items, customers, restaurants


# ---------------------------------------------------------------------------
# FEATURE TABLE 1: menu_item_features.csv
# ---------------------------------------------------------------------------
def build_menu_item_features(orders, order_items, ratings, wastage, menu_items):
    print(f"  Loading order_items_clean ({len(order_items):,} rows)")
    print(f"  Loading ratings_clean ({len(ratings):,} rows)")
    print(f"  Loading wastage_clean ({len(wastage):,} rows)")

    oi = order_items.merge(
        orders[["order_id", "customer_id", "order_date", "promotion_id"]],
        on="order_id",
        how="left",
    )

    # Sales + profitability features
    sales = oi.groupby("item_id").agg(
        total_quantity_sold=("quantity", "sum"),
        total_orders=("order_id", "nunique"),
        total_revenue=("line_total", "sum"),
        avg_unit_price=("unit_price", "mean"),
        avg_cost_price=("cost_price", "mean"),
    )
    sales["contribution_margin"] = sales["avg_unit_price"] - sales["avg_cost_price"]
    sales["profit_percentage"] = (
        sales["contribution_margin"] / sales["avg_unit_price"] * 100
    )

    # Rating features
    rating_cutoff = ratings["rating_date"].max() - pd.Timedelta(days=30)
    recent_mask = ratings["rating_date"] > rating_cutoff
    rating_agg = ratings.groupby("item_id").agg(
        avg_rating=("rating_value", "mean"),
        rating_count=("rating_id", "count"),
    )
    recent_rating = (
        ratings[recent_mask].groupby("item_id")["rating_value"].mean().rename("recent_rating")
    )
    older_rating = (
        ratings[~recent_mask].groupby("item_id")["rating_value"].mean().rename("older_rating")
    )
    rating_agg = rating_agg.join([recent_rating, older_rating])
    rating_agg["rating_trend"] = rating_agg["recent_rating"] - rating_agg["older_rating"]

    # Wastage features
    wastage_agg = wastage.groupby("item_id").agg(total_wastage=("wastage_quantity", "sum"))

    # Behavior + promotion + repeat purchase (one row per item/order first)
    item_order = oi[["item_id", "order_id", "customer_id", "order_date", "promotion_id"]].drop_duplicates()

    weekend_orders = (
        item_order[item_order["order_date"].dt.dayofweek.isin(WEEKEND_DAYS)]
        .groupby("item_id")["order_id"].nunique().rename("weekend_orders")
    )
    total_orders_check = item_order.groupby("item_id")["order_id"].nunique().rename("total_orders_check")
    promo_orders = (
        item_order[item_order["promotion_id"].notna()]
        .groupby("item_id")["order_id"].nunique().rename("promo_orders")
    )

    customer_item_counts = item_order.groupby(["item_id", "customer_id"])["order_id"].nunique()
    unique_customers = customer_item_counts.groupby("item_id").size().rename("unique_customers")
    repeat_customers = (
        customer_item_counts[customer_item_counts >= 2].groupby("item_id").size().rename("repeat_customers")
    )

    behavior = pd.concat(
        [weekend_orders, total_orders_check, promo_orders, unique_customers, repeat_customers],
        axis=1,
    ).fillna(0)

    print("  Calculating 15 features per item...")

    features = (
        sales.join([rating_agg, wastage_agg, behavior], how="left")
        .reset_index()
    )
    features["total_wastage"] = features["total_wastage"].fillna(0)
    features["wastage_percentage"] = (
        features["total_wastage"]
        / (features["total_quantity_sold"] + features["total_wastage"]).replace(0, np.nan)
        * 100
    )
    features["weekend_ratio"] = features["weekend_orders"] / features["total_orders"].replace(0, np.nan)
    features["promotion_dependency"] = features["promo_orders"] / features["total_orders"].replace(0, np.nan)
    features["repeat_customers"] = features["repeat_customers"].fillna(0)
    features["repeat_purchase_rate"] = (
        features["repeat_customers"] / features["unique_customers"].replace(0, np.nan)
    )

    features = features.merge(
        menu_items[
            [
                "item_id", "item_name", "category_id", "base_price",
                "preparation_cost", "is_seasonal", "launch_date",
                "preparation_time_minutes",
            ]
        ],
        on="item_id",
        how="right",
    )

    features.to_csv(FEATURES_DIR / "menu_item_features.csv", index=False)
    print(f"  ✓ Saved menu_item_features.csv: {len(features):,} items")
    return features


# ---------------------------------------------------------------------------
# FEATURE TABLE 2: customer_features.csv
# ---------------------------------------------------------------------------
def build_customer_features(customers, orders, order_items, menu_items):
    print(f"  Loading customers_clean ({len(customers):,} rows)")
    print(f"  Loading orders_clean ({len(orders):,} rows)")

    reference_date = orders["order_date"].max()

    rfm = orders.groupby("customer_id").agg(
        last_order_date=("order_date", "max"),
        first_order_date=("order_date", "min"),
        frequency=("order_id", "nunique"),
        monetary_value=("total_amount", "sum"),
    )
    rfm["recency_days"] = (reference_date - rfm["last_order_date"]).dt.days
    rfm["avg_order_value"] = rfm["monetary_value"] / rfm["frequency"]
    rfm["visit_frequency_days"] = np.where(
        rfm["frequency"] > 1,
        (rfm["last_order_date"] - rfm["first_order_date"]).dt.days / (rfm["frequency"] - 1),
        np.nan,
    )

    print("  Calculating RFM scores...")
    rfm["recency_score"] = quintile_score(rfm["recency_days"], reverse=True)
    rfm["frequency_score"] = quintile_score(rfm["frequency"], reverse=False)
    rfm["monetary_score"] = quintile_score(rfm["monetary_value"], reverse=False)
    rfm["rfm_score"] = rfm["recency_score"] + rfm["frequency_score"] + rfm["monetary_score"]

    preferred_channel = orders.groupby("customer_id")["order_channel"].agg(top_value).rename("preferred_channel")

    oi = order_items.merge(orders[["order_id", "customer_id"]], on="order_id", how="left")
    oi = oi.merge(menu_items[["item_id", "category_id"]], on="item_id", how="left")

    favorite_category = oi.groupby("customer_id")["category_id"].agg(top_value).rename("favorite_category")
    item_agg = oi.groupby("customer_id").agg(
        total_items_ordered=("quantity", "sum"),
        unique_items_ordered=("item_id", "nunique"),
    )

    features = (
        customers[["customer_id", "customer_segment"]]
        .merge(rfm.reset_index()[[
            "customer_id", "recency_days", "frequency", "monetary_value", "avg_order_value",
            "recency_score", "frequency_score", "monetary_score", "rfm_score", "visit_frequency_days",
        ]], on="customer_id", how="left")
        .merge(preferred_channel.reset_index(), on="customer_id", how="left")
        .merge(favorite_category.reset_index(), on="customer_id", how="left")
        .merge(item_agg.reset_index(), on="customer_id", how="left")
    )

    features.to_csv(FEATURES_DIR / "customer_features.csv", index=False)
    print(f"  ✓ Saved customer_features.csv: {len(features):,} customers")
    return features


# ---------------------------------------------------------------------------
# FEATURE TABLE 3: order_features.csv
# ---------------------------------------------------------------------------
def build_order_features(orders, order_items):
    print("  Calculating basket size, peak hours...")

    basket_size = order_items.groupby("order_id").size().rename("basket_size")

    features = orders[["order_id", "order_date", "order_time", "promotion_id"]].copy()
    features["order_hour"] = pd.to_datetime(features["order_time"], format="%H:%M:%S").dt.hour
    features["is_peak_hour"] = features["order_hour"].isin(PEAK_HOURS).astype(int)
    features["order_day_of_week"] = features["order_date"].dt.dayofweek
    features["is_weekend"] = features["order_day_of_week"].isin(WEEKEND_DAYS).astype(int)
    features["has_promotion"] = features["promotion_id"].notna().astype(int)
    features["order_month"] = features["order_date"].dt.month

    features = features.merge(basket_size, on="order_id", how="left")
    features["basket_size"] = features["basket_size"].fillna(0).astype(int)

    features = features[[
        "order_id", "basket_size", "is_peak_hour", "is_weekend", "has_promotion",
        "order_hour", "order_day_of_week", "order_month",
    ]]

    features.to_csv(FEATURES_DIR / "order_features.csv", index=False)
    print(f"  ✓ Saved order_features.csv: {len(features):,} orders")
    return features


# ---------------------------------------------------------------------------
# FEATURE TABLE 4: location_features.csv
# ---------------------------------------------------------------------------
def build_location_features(restaurants, orders, order_items, ratings, wastage):
    print("  Calculating per restaurant metrics...")

    oi = order_items.merge(orders[["order_id", "restaurant_id", "customer_id", "order_channel"]], on="order_id", how="left")

    revenue_agg = oi.groupby("restaurant_id").agg(
        total_revenue=("line_total", "sum"),
        total_orders=("order_id", "nunique"),
        total_customers=("customer_id", "nunique"),
    )
    revenue_agg["avg_order_value"] = revenue_agg["total_revenue"] / revenue_agg["total_orders"]

    top_channel = orders.groupby("restaurant_id")["order_channel"].agg(top_value).rename("top_channel")
    avg_rating = ratings.groupby("restaurant_id")["rating_value"].mean().rename("avg_rating")
    wastage_cost = wastage.groupby("restaurant_id")["wastage_cost"].sum().rename("total_wastage_cost")

    features = (
        restaurants[["restaurant_id", "restaurant_name"]]
        .merge(revenue_agg.reset_index(), on="restaurant_id", how="left")
        .merge(avg_rating.reset_index(), on="restaurant_id", how="left")
        .merge(wastage_cost.reset_index(), on="restaurant_id", how="left")
        .merge(top_channel.reset_index(), on="restaurant_id", how="left")
    )

    features.to_csv(FEATURES_DIR / "location_features.csv", index=False)
    print(f"  ✓ Saved location_features.csv: {len(features):,} locations")
    return features


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    start = datetime.now()

    print("=" * 48)
    print("DineIQ Analytics - Feature Engineering")
    print("=" * 48)

    FEATURES_DIR.mkdir(parents=True, exist_ok=True)

    orders, order_items, ratings, wastage, menu_items, customers, restaurants = load_data()

    print("\n[1/4] Menu Item Features...")
    menu_features = build_menu_item_features(orders, order_items, ratings, wastage, menu_items)

    print("\n[2/4] Customer Features (RFM)...")
    customer_features = build_customer_features(customers, orders, order_items, menu_items)

    print("\n[3/4] Order Features...")
    order_features = build_order_features(orders, order_items)

    print("\n[4/4] Location Features...")
    location_features = build_location_features(restaurants, orders, order_items, ratings, wastage)

    print("\n" + "=" * 48)
    print("FEATURE SUMMARY")
    print("=" * 48)
    print(f"Menu features:      {len(menu_features):,} items x {menu_features.shape[1]} features")
    print(f"Customer features:  {len(customer_features):,} x {customer_features.shape[1]} features (RFM)")
    print(f"Order features:     {len(order_features):,} x {order_features.shape[1]} features")
    print(f"Location features:  {len(location_features):,} x {location_features.shape[1]} features")

    print("\nTop 5 items by revenue:")
    top_items = menu_features.nlargest(5, "total_revenue")[["item_name", "total_revenue", "profit_percentage"]]
    print(top_items.to_string(index=False))

    print("\nTop 5 customers by RFM score:")
    top_customers = customer_features.nlargest(5, "rfm_score")[["customer_id", "rfm_score", "customer_segment"]]
    print(top_customers.to_string(index=False))

    print("\nFeature files ready for ML training.")
    print("=" * 48)

    elapsed = datetime.now() - start
    print(f"\nCompleted in {elapsed}")


if __name__ == "__main__":
    main()
