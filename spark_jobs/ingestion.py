"""
DineIQ Analytics - Spark Ingestion

Loads all 11 raw CSV files from raw_data/ with explicit schemas,
validates row counts, saves each table as Parquet to parquet_data/,
and registers Spark SQL temp views for a quick sanity-check join.

Run from anywhere:  python spark_jobs/ingestion.py
Reads from  <project root>/raw_data/
Writes to   <project root>/parquet_data/
"""

from datetime import datetime
from pathlib import Path

from pyspark.sql import SparkSession
from pyspark.sql.types import *

PROJECT_ROOT = Path(__file__).resolve().parent.parent
RAW_DATA_DIR = PROJECT_ROOT / "raw_data"
PARQUET_DATA_DIR = PROJECT_ROOT / "parquet_data"


# ---------------------------------------------------------------------------
# Spark session
# ---------------------------------------------------------------------------
def create_spark_session():
    spark = (
        SparkSession.builder
        .appName("DineIQ_Ingestion")
        .master("local[*]")
        .config("spark.driver.memory", "4g")
        .config("spark.sql.shuffle.partitions", "8")
        .getOrCreate()
    )
    spark.sparkContext.setLogLevel("ERROR")
    return spark


# ---------------------------------------------------------------------------
# Explicit schemas
# ---------------------------------------------------------------------------
schema_menu_categories = StructType([
    StructField("category_id", IntegerType()),
    StructField("category_name", StringType()),
    StructField("description", StringType()),
    StructField("is_active", BooleanType()),
    StructField("created_at", TimestampType())
])

schema_menu_items = StructType([
    StructField("item_id", IntegerType()),
    StructField("category_id", IntegerType()),
    StructField("item_name", StringType()),
    StructField("description", StringType()),
    StructField("base_price", DoubleType()),
    StructField("preparation_cost", DoubleType()),
    StructField("preparation_time_minutes", IntegerType()),
    StructField("is_available", BooleanType()),
    StructField("is_seasonal", BooleanType()),
    StructField("launch_date", DateType()),
    StructField("created_at", TimestampType())
])

schema_restaurants = StructType([
    StructField("restaurant_id", IntegerType()),
    StructField("restaurant_name", StringType()),
    StructField("location_city", StringType()),
    StructField("location_area", StringType()),
    StructField("address", StringType()),
    StructField("seating_capacity", IntegerType()),
    StructField("opening_time", StringType()),
    StructField("closing_time", StringType()),
    StructField("is_active", BooleanType()),
    StructField("created_at", TimestampType())
])

schema_customers = StructType([
    StructField("customer_id", IntegerType()),
    StructField("customer_code", StringType()),
    StructField("age_group", StringType()),
    StructField("gender", StringType()),
    StructField("city", StringType()),
    StructField("registration_date", DateType()),
    StructField("preferred_channel", StringType()),
    StructField("customer_segment", StringType()),
    StructField("is_active", BooleanType()),
    StructField("created_at", TimestampType())
])

schema_promotions = StructType([
    StructField("promotion_id", IntegerType()),
    StructField("promo_name", StringType()),
    StructField("promo_type", StringType()),
    StructField("discount_percentage", DoubleType()),
    StructField("discount_amount", DoubleType()),
    StructField("start_date", DateType()),
    StructField("end_date", DateType()),
    StructField("min_order_value", DoubleType()),
    StructField("is_active", BooleanType()),
    StructField("is_promotion_trap", BooleanType()),
    StructField("created_at", TimestampType())
])

schema_pricing_history = StructType([
    StructField("price_id", IntegerType()),
    StructField("item_id", IntegerType()),
    StructField("restaurant_id", IntegerType()),
    StructField("old_price", DoubleType()),
    StructField("new_price", DoubleType()),
    StructField("change_date", DateType()),
    StructField("change_reason", StringType())
])

schema_orders = StructType([
    StructField("order_id", IntegerType()),
    StructField("customer_id", IntegerType()),
    StructField("restaurant_id", IntegerType()),
    StructField("promotion_id", IntegerType()),
    StructField("order_date", DateType()),
    StructField("order_time", StringType()),
    StructField("order_channel", StringType()),
    StructField("order_status", StringType()),
    StructField("subtotal", DoubleType()),
    StructField("discount_amount", DoubleType()),
    StructField("total_amount", DoubleType()),
    StructField("created_at", TimestampType())
])

schema_order_items = StructType([
    StructField("order_item_id", IntegerType()),
    StructField("order_id", IntegerType()),
    StructField("item_id", IntegerType()),
    StructField("quantity", IntegerType()),
    StructField("unit_price", DoubleType()),
    StructField("cost_price", DoubleType()),
    StructField("discount_applied", DoubleType()),
    StructField("line_total", DoubleType()),
    StructField("created_at", TimestampType())
])

schema_ratings = StructType([
    StructField("rating_id", IntegerType()),
    StructField("customer_id", IntegerType()),
    StructField("item_id", IntegerType()),
    StructField("restaurant_id", IntegerType()),
    StructField("rating_value", DoubleType()),
    StructField("review_text", StringType()),
    StructField("rating_date", DateType()),
    StructField("rating_source", StringType()),
    StructField("created_at", TimestampType())
])

schema_inventory = StructType([
    StructField("inventory_id", IntegerType()),
    StructField("item_id", IntegerType()),
    StructField("restaurant_id", IntegerType()),
    StructField("stock_quantity", DoubleType()),
    StructField("reorder_level", DoubleType()),
    StructField("last_restocked_date", DateType()),
    StructField("unit_cost", DoubleType()),
    StructField("created_at", TimestampType())
])

schema_wastage = StructType([
    StructField("wastage_id", IntegerType()),
    StructField("item_id", IntegerType()),
    StructField("restaurant_id", IntegerType()),
    StructField("wastage_date", DateType()),
    StructField("wastage_quantity", DoubleType()),
    StructField("wastage_cost", DoubleType()),
    StructField("wastage_reason", StringType()),
    StructField("recorded_by", StringType()),
    StructField("created_at", TimestampType())
])


# ---------------------------------------------------------------------------
# Load / validate / save
# ---------------------------------------------------------------------------
def load_csv(spark, filename, schema):
    path = str(RAW_DATA_DIR / filename)
    df = spark.read.csv(
        path,
        schema=schema,
        header=True,
        timestampFormat="yyyy-MM-dd HH:mm:ss",
        dateFormat="yyyy-MM-dd",
        nullValue="",
        mode="PERMISSIVE"
    )
    return df


def validate_table(df, table_name, expected_min_rows):
    actual_rows = df.count()
    status = "✓" if actual_rows >= expected_min_rows else "✗"
    print(f"  {status} {table_name}: "
          f"{actual_rows:,} rows")
    return actual_rows


def save_parquet(df, table_name):
    path = str(PARQUET_DATA_DIR / table_name)
    df.write.mode("overwrite") \
        .parquet(path)
    print(f"  Saved parquet: {path}/")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():

    print("=" * 50)
    print("DineIQ Analytics - Spark Ingestion")
    print("=" * 50)

    # Spark Session
    spark = create_spark_session()
    print("Spark Session started")
    print(f"Spark version: {spark.version}\n")

    start = datetime.now()

    # Load all 11 tables
    print("Loading CSV files with explicit schemas...")
    print("-" * 50)

    tables = {
        "menu_categories": (
            "menu_categories.csv",
            schema_menu_categories, 10),
        "menu_items": (
            "menu_items.csv",
            schema_menu_items, 150),
        "restaurants": (
            "restaurants.csv",
            schema_restaurants, 20),
        "customers": (
            "customers.csv",
            schema_customers, 50000),
        "promotions": (
            "promotions.csv",
            schema_promotions, 15),
        "pricing_history": (
            "pricing_history.csv",
            schema_pricing_history, 400),
        "orders": (
            "orders.csv",
            schema_orders, 100000),
        "order_items": (
            "order_items.csv",
            schema_order_items, 1000000),
        "ratings": (
            "ratings.csv",
            schema_ratings, 100000),
        "inventory": (
            "inventory.csv",
            schema_inventory, 3000),
        "wastage": (
            "wastage.csv",
            schema_wastage, 50000),
    }

    dataframes = {}
    for name, (file, schema, min_rows) in tables.items():
        print(f"\nLoading {name}...")
        df = load_csv(spark, file, schema)
        validate_table(df, name, min_rows)
        save_parquet(df, name)
        dataframes[name] = df

    # Register as Spark SQL temp views
    print("\nRegistering Spark SQL temp views...")
    for name, df in dataframes.items():
        df.createOrReplaceTempView(name)
        print(f"  ✓ {name}")

    # Test Spark SQL join
    print("\nTesting Spark SQL join...")
    test_query = spark.sql("""
        SELECT
          mi.item_name,
          mc.category_name,
          COUNT(oi.order_item_id) as total_orders,
          ROUND(SUM(oi.line_total), 2) as total_revenue,
          ROUND(AVG(oi.unit_price), 2) as avg_price
        FROM order_items oi
        JOIN menu_items mi
          ON oi.item_id = mi.item_id
        JOIN menu_categories mc
          ON mi.category_id = mc.category_id
        GROUP BY mi.item_name, mc.category_name
        ORDER BY total_revenue DESC
        LIMIT 10
    """)

    print("\nTop 10 items by revenue:")
    print("-" * 50)
    test_query.show(truncate=False)

    elapsed = datetime.now() - start
    print(f"\nIngestion completed in {elapsed}")
    print("All 11 tables loaded and saved as Parquet")
    print("=" * 50)

    spark.stop()


if __name__ == "__main__":
    main()
