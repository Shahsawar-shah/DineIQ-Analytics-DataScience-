"""
DineIQ Analytics - Feature Engineering (Spark)

Builds ML-ready feature tables from the cleaned data in processed_data/ with
PySpark DataFrames and Spark SQL:
  menu_item_features.csv, customer_features.csv,
  order_features.csv, location_features.csv

Cancelled orders are excluded from every feature.

Customer churn risk (SRS Step 36) is calculated here from order history —
the generator's customer_segment label is NOT used as an input:
  recent window = last 90 days, prior window = the 90 days before that
  churn_at_risk = recency_days > 60
                  AND orders(recent) < orders(prior)      (frequency dropping)
                  AND spend(recent)  < spend(prior)       (monetary declining)

Run from anywhere:  python spark_jobs/feature_engineering.py
Reads from  <project root>/processed_data/ (*_clean.csv)
Writes to   <project root>/processed_data/features/
"""

USE_SPARK = True

from datetime import datetime, timedelta

from pyspark.sql import functions as F
from pyspark.sql.window import Window

from schemas import SCHEMAS
from spark_utils import (
    FEATURES_DIR, PROCESSED_DATA_DIR, create_spark_session, read_csv,
    track_job, write_single_csv,
)
from pyspark.sql.types import BooleanType, StructField, StructType

PEAK_HOURS = [12, 13, 14, 19, 20, 21]
SPARK_WEEKEND_DAYS = [1, 7]  # Spark dayofweek(): 1 = Sunday ... 7 = Saturday

TREND_WINDOW_DAYS = 90
CHURN_RECENCY_DAYS = 60
HIGH_VALUE_RFM_SCORE = 13
PROMO_DRIVEN_RATIO = 0.5
NEW_CUSTOMER_DAYS = 60


def safe_div(numerator, denominator):
    return F.when(denominator != 0, numerator / denominator)


def with_extra(schema, *names):
    return StructType(schema.fields + [StructField(n, BooleanType()) for n in names])


# ---------------------------------------------------------------------------
# Loaders
# ---------------------------------------------------------------------------
def load_data(spark):
    def load(name, schema):
        return read_csv(spark, PROCESSED_DATA_DIR / f"{name}_clean.csv", schema)

    orders = load("orders", with_extra(SCHEMAS["orders"], "is_cancelled"))
    order_items = load("order_items", with_extra(SCHEMAS["order_items"], "is_loss_making"))
    return {
        "orders": orders.where(~F.col("is_cancelled")).cache(),
        "order_items": order_items,
        "ratings": load("ratings", SCHEMAS["ratings"]),
        "wastage": load("wastage", SCHEMAS["wastage"]),
        "menu_items": load("menu_items", SCHEMAS["menu_items"]),
        "customers": load("customers", SCHEMAS["customers"]),
        "restaurants": load("restaurants", SCHEMAS["restaurants"]),
    }


# ---------------------------------------------------------------------------
# FEATURE TABLE 1: menu_item_features.csv
# ---------------------------------------------------------------------------
def build_menu_item_features(d):
    orders, menu_items = d["orders"], d["menu_items"]
    oi = d["order_items"].join(
        orders.select("order_id", "customer_id", "order_date", "promotion_id"), "order_id"
    ).cache()

    ref_date = orders.agg(F.max("order_date")).first()[0]
    recent_start = ref_date - timedelta(days=TREND_WINDOW_DAYS)
    prior_start = ref_date - timedelta(days=2 * TREND_WINDOW_DAYS)

    # Sales + profitability + sales trend
    sales = oi.groupBy("item_id").agg(
        F.sum("quantity").alias("total_quantity_sold"),
        F.countDistinct("order_id").alias("total_orders"),
        F.sum("line_total").alias("total_revenue"),
        F.avg("unit_price").alias("avg_unit_price"),
        F.avg("cost_price").alias("avg_cost_price"),
        F.sum(F.when(F.col("order_date") > F.lit(recent_start), F.col("quantity")).otherwise(0)).alias("qty_last_90d"),
        F.sum(F.when((F.col("order_date") > F.lit(prior_start)) & (F.col("order_date") <= F.lit(recent_start)),
                     F.col("quantity")).otherwise(0)).alias("qty_prev_90d"),
    )
    sales = (
        sales
        .withColumn("contribution_margin", F.col("avg_unit_price") - F.col("avg_cost_price"))
        .withColumn("profit_percentage", F.col("contribution_margin") / F.col("avg_unit_price") * 100)
        .withColumn("sales_trend", safe_div(F.col("qty_last_90d") - F.col("qty_prev_90d"), F.col("qty_prev_90d")))
    )

    # Rating features: overall + last-30-days vs older
    ratings = d["ratings"]
    rating_cutoff = ratings.agg(F.max("rating_date")).first()[0] - timedelta(days=30)
    rating_agg = ratings.groupBy("item_id").agg(
        F.avg("rating_value").alias("avg_rating"),
        F.count("rating_id").alias("rating_count"),
        F.avg(F.when(F.col("rating_date") > F.lit(rating_cutoff), F.col("rating_value"))).alias("recent_rating"),
        F.avg(F.when(F.col("rating_date") <= F.lit(rating_cutoff), F.col("rating_value"))).alias("older_rating"),
    ).withColumn("rating_trend", F.col("recent_rating") - F.col("older_rating"))

    wastage_agg = d["wastage"].groupBy("item_id").agg(
        F.sum("wastage_quantity").alias("total_wastage"),
        F.sum("wastage_cost").alias("total_wastage_cost"),
    )

    # Behaviour: one row per item/order first
    item_order = oi.select("item_id", "order_id", "customer_id", "order_date", "promotion_id") \
        .dropDuplicates(["item_id", "order_id"])
    behavior = item_order.groupBy("item_id").agg(
        F.countDistinct(F.when(F.dayofweek("order_date").isin(SPARK_WEEKEND_DAYS), F.col("order_id"))).alias("weekend_orders"),
        F.countDistinct("order_id").alias("total_orders_check"),
        F.countDistinct(F.when(F.col("promotion_id").isNotNull(), F.col("order_id"))).alias("promo_orders"),
    )
    repeat = (
        item_order.groupBy("item_id", "customer_id").agg(F.countDistinct("order_id").alias("n"))
        .groupBy("item_id").agg(
            F.count("*").alias("unique_customers"),
            F.sum(F.when(F.col("n") >= 2, 1).otherwise(0)).alias("repeat_customers"),
        )
    )

    features = (
        menu_items.select("item_id", "item_name", "category_id", "base_price", "preparation_cost",
                          "is_seasonal", "launch_date", "preparation_time_minutes")
        .join(sales, "item_id", "left")
        .join(rating_agg, "item_id", "left")
        .join(wastage_agg, "item_id", "left")
        .join(behavior, "item_id", "left")
        .join(repeat, "item_id", "left")
        .fillna(0, subset=["total_wastage", "total_wastage_cost", "weekend_orders", "total_orders_check",
                           "promo_orders", "unique_customers", "repeat_customers"])
        .withColumn("wastage_percentage", safe_div(
            F.col("total_wastage"), F.col("total_quantity_sold") + F.col("total_wastage")) * 100)
        .withColumn("weekend_ratio", safe_div(F.col("weekend_orders"), F.col("total_orders")))
        .withColumn("promotion_dependency", safe_div(F.col("promo_orders"), F.col("total_orders")))
        .withColumn("repeat_purchase_rate", safe_div(F.col("repeat_customers"), F.col("unique_customers")))
        .withColumn("days_since_launch", F.datediff(F.lit(ref_date), F.col("launch_date")))
    )

    features = features.select(
        "item_id", "total_quantity_sold", "total_orders", "total_revenue", "avg_unit_price",
        "avg_cost_price", "contribution_margin", "profit_percentage", "avg_rating", "rating_count",
        "recent_rating", "older_rating", "rating_trend", "total_wastage", "weekend_orders",
        "total_orders_check", "promo_orders", "unique_customers", "repeat_customers",
        "wastage_percentage", "weekend_ratio", "promotion_dependency", "repeat_purchase_rate",
        "item_name", "category_id", "base_price", "preparation_cost", "is_seasonal", "launch_date",
        "preparation_time_minutes", "total_wastage_cost", "qty_last_90d", "qty_prev_90d",
        "sales_trend", "days_since_launch",
    ).orderBy("item_id")

    write_single_csv(features, FEATURES_DIR / "menu_item_features.csv")
    n = features.count()
    print(f"  ✓ Saved menu_item_features.csv: {n:,} items")
    oi.unpersist()
    return features, n


# ---------------------------------------------------------------------------
# FEATURE TABLE 2: customer_features.csv (RFM + churn risk + computed segment)
# ---------------------------------------------------------------------------
def mode_per_key(df, key, value_col, alias):
    counts = df.groupBy(key, value_col).count()
    w = Window.partitionBy(key).orderBy(F.col("count").desc(), F.col(value_col).asc())
    return counts.withColumn("rn", F.row_number().over(w)).where("rn = 1") \
        .select(key, F.col(value_col).alias(alias))


def build_customer_features(d):
    orders = d["orders"]
    ref_date = orders.agg(F.max("order_date")).first()[0]
    recent_start = ref_date - timedelta(days=TREND_WINDOW_DAYS)
    prior_start = ref_date - timedelta(days=2 * TREND_WINDOW_DAYS)
    in_recent = F.col("order_date") > F.lit(recent_start)
    in_prior = (F.col("order_date") > F.lit(prior_start)) & (F.col("order_date") <= F.lit(recent_start))

    rfm = orders.groupBy("customer_id").agg(
        F.max("order_date").alias("last_order_date"),
        F.min("order_date").alias("first_order_date"),
        F.countDistinct("order_id").alias("frequency"),
        F.sum("total_amount").alias("monetary_value"),
        F.sum(F.when(F.col("promotion_id").isNotNull(), 1).otherwise(0)).alias("promo_orders"),
        F.sum(F.when(in_recent, 1).otherwise(0)).alias("orders_recent_90d"),
        F.sum(F.when(in_prior, 1).otherwise(0)).alias("orders_prior_90d"),
        F.sum(F.when(in_recent, F.col("total_amount")).otherwise(0)).alias("spend_recent_90d"),
        F.sum(F.when(in_prior, F.col("total_amount")).otherwise(0)).alias("spend_prior_90d"),
    )
    rfm = (
        rfm
        .withColumn("recency_days", F.datediff(F.lit(ref_date), F.col("last_order_date")))
        .withColumn("avg_order_value", F.col("monetary_value") / F.col("frequency"))
        .withColumn("visit_frequency_days", F.when(
            F.col("frequency") > 1,
            F.datediff("last_order_date", "first_order_date") / (F.col("frequency") - 1)))
        .withColumn("promo_order_ratio", F.col("promo_orders") / F.col("frequency"))
        .withColumn("customer_tenure_days", F.datediff(F.lit(ref_date), F.col("first_order_date")))
    )

    # RFM quintile scores (5 = best)
    rfm = (
        rfm
        .withColumn("recency_score", F.ntile(5).over(Window.orderBy(F.col("recency_days").desc(), "customer_id")))
        .withColumn("frequency_score", F.ntile(5).over(Window.orderBy("frequency", "customer_id")))
        .withColumn("monetary_score", F.ntile(5).over(Window.orderBy("monetary_value", "customer_id")))
        .withColumn("rfm_score", F.col("recency_score") + F.col("frequency_score") + F.col("monetary_score"))
    )

    # Churn risk from actual behaviour
    frequency_declining = F.col("orders_recent_90d") < F.col("orders_prior_90d")
    monetary_declining = F.col("spend_recent_90d") < F.col("spend_prior_90d")
    freq_drop = F.when(F.col("orders_prior_90d") > 0, F.greatest(
        F.lit(0.0), (F.col("orders_prior_90d") - F.col("orders_recent_90d")) / F.col("orders_prior_90d"))).otherwise(0.0)
    spend_drop = F.when(F.col("spend_prior_90d") > 0, F.greatest(
        F.lit(0.0), (F.col("spend_prior_90d") - F.col("spend_recent_90d")) / F.col("spend_prior_90d"))).otherwise(0.0)
    rfm = (
        rfm
        .withColumn("frequency_declining", frequency_declining)
        .withColumn("monetary_declining", monetary_declining)
        .withColumn("churn_at_risk", (F.col("recency_days") > CHURN_RECENCY_DAYS) & frequency_declining & monetary_declining)
        .withColumn("churn_risk_score", F.round(
            40 * F.least(F.col("recency_days") / 180.0, F.lit(1.0)) + 30 * freq_drop + 30 * spend_drop, 1))
        .withColumn("churn_risk_level",
                    F.when(F.col("churn_at_risk"), "High")
                    .when(F.col("churn_risk_score") >= 40, "Medium")
                    .otherwise("Low"))
    )

    # Rule-based behavioural segment computed from the features above
    rfm = rfm.withColumn(
        "computed_segment",
        F.when(F.col("churn_at_risk"), "At-Risk")
        .when((F.col("customer_tenure_days") <= NEW_CUSTOMER_DAYS) & (F.col("frequency") <= 2), "New")
        .when(F.col("rfm_score") >= HIGH_VALUE_RFM_SCORE, "High-Value Loyal")
        .when((F.col("promo_order_ratio") >= PROMO_DRIVEN_RATIO) & (F.col("frequency") >= 2), "Promotion-Driven")
        .when(F.col("frequency_score") >= 4, "Frequent")
        .otherwise("Occasional"),
    )

    preferred_channel = mode_per_key(orders, "customer_id", "order_channel", "preferred_channel")
    oi = d["order_items"].join(orders.select("order_id", "customer_id"), "order_id") \
        .join(F.broadcast(d["menu_items"].select("item_id", "category_id")), "item_id")
    favorite_category = mode_per_key(oi, "customer_id", "category_id", "favorite_category")
    item_agg = oi.groupBy("customer_id").agg(
        F.sum("quantity").alias("total_items_ordered"),
        F.countDistinct("item_id").alias("unique_items_ordered"),
        F.countDistinct("category_id").alias("category_diversity"),
    )

    features = (
        d["customers"].select("customer_id", F.col("customer_segment").alias("generator_segment"))
        .join(rfm, "customer_id", "left")
        .join(preferred_channel, "customer_id", "left")
        .join(favorite_category, "customer_id", "left")
        .join(item_agg, "customer_id", "left")
        .withColumn("computed_segment", F.coalesce(F.col("computed_segment"), F.lit("No Orders")))
        .select(
            "customer_id", "generator_segment", "computed_segment", "recency_days", "frequency",
            "monetary_value", "avg_order_value", "recency_score", "frequency_score", "monetary_score",
            "rfm_score", "visit_frequency_days", "preferred_channel", "favorite_category",
            "total_items_ordered", "unique_items_ordered", "category_diversity", "promo_orders",
            "promo_order_ratio", "customer_tenure_days", "orders_recent_90d", "orders_prior_90d",
            "spend_recent_90d", "spend_prior_90d", "frequency_declining", "monetary_declining",
            "churn_at_risk", "churn_risk_score", "churn_risk_level", "last_order_date",
        )
        .orderBy("customer_id")
    )

    write_single_csv(features, FEATURES_DIR / "customer_features.csv")
    n = features.count()
    print(f"  ✓ Saved customer_features.csv: {n:,} customers")
    return features, n


# ---------------------------------------------------------------------------
# FEATURE TABLE 3: order_features.csv
# ---------------------------------------------------------------------------
def build_order_features(d):
    print("  Calculating basket size, peak hours...")
    basket = d["order_items"].groupBy("order_id").agg(F.count("*").alias("basket_size"))
    features = (
        d["orders"].select("order_id", "order_date", "order_time", "promotion_id", "order_channel", "restaurant_id")
        .join(basket, "order_id", "left")
        .withColumn("basket_size", F.coalesce(F.col("basket_size"), F.lit(0)))
        .withColumn("order_hour", F.substring("order_time", 1, 2).cast("int"))
        .withColumn("is_peak_hour", F.col("order_hour").isin(PEAK_HOURS).cast("int"))
        .withColumn("order_day_of_week", (F.dayofweek("order_date") + 5) % 7)  # Monday = 0
        .withColumn("is_weekend", F.col("order_day_of_week").isin(5, 6).cast("int"))
        .withColumn("has_promotion", F.col("promotion_id").isNotNull().cast("int"))
        .withColumn("order_month", F.month("order_date"))
        .select("order_id", "basket_size", "is_peak_hour", "is_weekend", "has_promotion",
                "order_hour", "order_day_of_week", "order_month", "order_channel", "restaurant_id")
        .orderBy("order_id")
    )
    write_single_csv(features, FEATURES_DIR / "order_features.csv")
    n = features.count()
    print(f"  ✓ Saved order_features.csv: {n:,} orders")
    return features, n


# ---------------------------------------------------------------------------
# FEATURE TABLE 4: location_features.csv (Spark SQL)
# ---------------------------------------------------------------------------
LOCATION_SQL = """
WITH line_totals AS (
    SELECT o.restaurant_id,
           o.order_id,
           o.customer_id,
           SUM(oi.line_total)                  AS revenue,
           SUM(oi.line_total - oi.cost_price * oi.quantity) AS profit
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.order_id
    GROUP BY o.restaurant_id, o.order_id, o.customer_id
),
per_location AS (
    SELECT restaurant_id,
           SUM(revenue)                AS total_revenue,
           SUM(profit)                 AS total_profit,
           COUNT(DISTINCT order_id)    AS total_orders,
           COUNT(DISTINCT customer_id) AS total_customers
    FROM line_totals
    GROUP BY restaurant_id
),
repeaters AS (
    SELECT restaurant_id,
           SUM(CASE WHEN n_orders >= 2 THEN 1 ELSE 0 END) AS repeat_customers
    FROM (SELECT restaurant_id, customer_id, COUNT(*) AS n_orders
          FROM line_totals GROUP BY restaurant_id, customer_id)
    GROUP BY restaurant_id
),
channel_rank AS (
    SELECT restaurant_id, order_channel,
           ROW_NUMBER() OVER (PARTITION BY restaurant_id ORDER BY COUNT(*) DESC, order_channel) AS rn
    FROM orders GROUP BY restaurant_id, order_channel
)
SELECT r.restaurant_id,
       r.restaurant_name,
       p.total_revenue,
       p.total_orders,
       p.total_customers,
       p.total_revenue / p.total_orders                    AS avg_order_value,
       rt.avg_rating,
       w.total_wastage_cost,
       c.order_channel                                     AS top_channel,
       p.total_profit,
       p.total_profit / p.total_revenue * 100              AS profit_margin_pct,
       rp.repeat_customers / p.total_customers             AS repeat_customer_rate
FROM restaurants r
LEFT JOIN per_location p ON p.restaurant_id = r.restaurant_id
LEFT JOIN repeaters rp   ON rp.restaurant_id = r.restaurant_id
LEFT JOIN (SELECT restaurant_id, AVG(rating_value) AS avg_rating FROM ratings GROUP BY restaurant_id) rt
       ON rt.restaurant_id = r.restaurant_id
LEFT JOIN (SELECT restaurant_id, SUM(wastage_cost) AS total_wastage_cost FROM wastage GROUP BY restaurant_id) w
       ON w.restaurant_id = r.restaurant_id
LEFT JOIN channel_rank c ON c.restaurant_id = r.restaurant_id AND c.rn = 1
ORDER BY r.restaurant_id
"""


def build_location_features(spark, d):
    print("  Calculating per restaurant metrics (Spark SQL)...")
    for name in ("orders", "order_items", "ratings", "wastage", "restaurants"):
        d[name].createOrReplaceTempView(name)
    features = spark.sql(LOCATION_SQL)
    write_single_csv(features, FEATURES_DIR / "location_features.csv")
    n = features.count()
    print(f"  ✓ Saved location_features.csv: {n:,} locations")
    return features, n


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    start = datetime.now()
    print("=" * 48)
    print("DineIQ Analytics - Feature Engineering (Spark)")
    print("=" * 48)

    FEATURES_DIR.mkdir(parents=True, exist_ok=True)
    spark = create_spark_session("DineIQ_FeatureEngineering")

    with track_job("feature_engineering", spark) as job:
        d = load_data(spark)

        print("\n[1/4] Menu Item Features...")
        menu_features, n_menu = build_menu_item_features(d)
        print("\n[2/4] Customer Features (RFM + churn risk)...")
        customer_features, n_customers = build_customer_features(d)
        print("\n[3/4] Order Features...")
        _, n_orders = build_order_features(d)
        print("\n[4/4] Location Features...")
        _, n_locations = build_location_features(spark, d)

        print("\n" + "=" * 48)
        print("FEATURE SUMMARY")
        print("=" * 48)
        print(f"Menu features:      {n_menu:,} items")
        print(f"Customer features:  {n_customers:,} customers (RFM + churn)")
        print(f"Order features:     {n_orders:,} orders")
        print(f"Location features:  {n_locations:,} locations")

        print("\nTop 5 items by revenue:")
        menu_features.orderBy(F.col("total_revenue").desc()) \
            .select("item_name", "total_revenue", "profit_percentage").show(5, truncate=False)
        print("Churn risk distribution:")
        customer_features.groupBy("churn_risk_level").count().orderBy("churn_risk_level").show()
        print("Computed segments:")
        customer_features.groupBy("computed_segment").count().orderBy(F.col("count").desc()).show()

        job.set_records(processed=d["order_items"].count() + d["orders"].count(),
                        output=n_menu + n_customers + n_orders + n_locations)

    print(f"Completed in {datetime.now() - start}")
    spark.stop()


if __name__ == "__main__":
    main()
