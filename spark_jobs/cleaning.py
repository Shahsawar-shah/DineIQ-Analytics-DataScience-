"""
DineIQ Analytics - Data Cleaning Pipeline (Spark)

Applies the documented data-quality rules to each raw table with Spark and
writes clean (and quarantined) data to processed_data/ as CSV — the format
the API reads — plus the two large cleaned tables as Parquet in
parquet_data/processed/ (orders partitioned by location).

Cleaning rules (every decision is written to reports/cleaning_log.txt):
  orders       drop exact duplicates; quarantine missing customer_id or an
               unknown restaurant_id; flag cancelled orders (kept, excluded
               later by feature engineering)
  order_items  drop negative quantities; quarantine unknown item_id; drop
               duplicate order_item_id; flag loss-making lines
  ratings      drop ratings outside 1-5; fill missing rating with the median
  wastage      drop impossible quantities (> 1000) and negative quantities
  others       schema-validated copy

Run from anywhere:  python spark_jobs/cleaning.py
Reads from  <project root>/raw_data/
Writes to   <project root>/processed_data/, parquet_data/processed/,
            reports/cleaning_log.txt, reports/cleaning_summary.json
"""

USE_SPARK = True

import json
from datetime import datetime

from pyspark.sql import functions as F

from schemas import SCHEMAS
from spark_utils import (
    PARQUET_DATA_DIR, PROCESSED_DATA_DIR, RAW_DATA_DIR, REPORTS_DIR,
    create_spark_session, read_csv, track_job, write_single_csv,
)

MAX_VALID_WASTAGE_QTY = 1000

UNCHANGED_TABLES = [
    "menu_categories",
    "menu_items",
    "restaurants",
    "customers",
    "promotions",
    "pricing_history",
    "inventory",
]

lines = []
totals = {"original": 0, "removed": 0, "quarantined": 0, "flagged": 0, "clean": 0}


def log(text=""):
    print(text)
    lines.append(text)


def load(spark, name):
    return read_csv(spark, RAW_DATA_DIR / f"{name}.csv", SCHEMAS[name])


def save(df, name):
    write_single_csv(df, PROCESSED_DATA_DIR / f"{name}.csv")


# ---------------------------------------------------------------------------
# Per-table cleaning
# ---------------------------------------------------------------------------
def clean_orders(spark, restaurants):
    df = load(spark, "orders")
    original = df.count()
    totals["original"] += original
    log(f"\n[ORDERS] Loading {original:,} rows...")

    deduped = df.dropDuplicates()
    removed_duplicates = original - deduped.count()
    log(f"  ✓ Removed {removed_duplicates:,} duplicate records")
    totals["removed"] += removed_duplicates

    valid_restaurant = restaurants.select("restaurant_id").withColumn("_valid_restaurant", F.lit(True))
    tagged = deduped.join(F.broadcast(valid_restaurant), "restaurant_id", "left")
    bad = F.col("customer_id").isNull() | F.col("_valid_restaurant").isNull()
    quarantined = tagged.where(bad).drop("_valid_restaurant").withColumn(
        "quarantine_reason",
        F.when(F.col("customer_id").isNull(), "missing customer_id").otherwise("unknown restaurant_id"),
    )
    clean = tagged.where(~bad).drop("_valid_restaurant")

    quarantined = quarantined.cache()
    n_quarantined = quarantined.count()
    save(quarantined.orderBy("order_id"), "quarantine_orders")
    log(f"  ✓ Quarantined {n_quarantined:,} orders (missing customer_id / unknown restaurant)")
    totals["quarantined"] += n_quarantined

    clean = clean.withColumn("is_cancelled", F.col("order_status") == "cancelled").cache()
    cancelled = clean.where("is_cancelled").count()
    log(f"  ✓ Flagged {cancelled:,} cancelled orders")
    totals["flagged"] += cancelled

    clean = clean.select(*SCHEMAS["orders"].fieldNames(), "is_cancelled").orderBy("order_id")
    save(clean, "orders_clean")
    clean.write.mode("overwrite").partitionBy("restaurant_id").parquet(
        str(PARQUET_DATA_DIR / "processed" / "orders_clean"))
    n_clean = clean.count()
    log(f"  → Saved orders_clean.csv + Parquet (partitioned by restaurant_id): {n_clean:,} rows")
    totals["clean"] += n_clean


def clean_order_items(spark, menu_items):
    df = load(spark, "order_items")
    original = df.count()
    totals["original"] += original
    log(f"\n[ORDER_ITEMS] Loading {original:,} rows...")

    df = df.where(F.col("quantity") >= 0)
    removed_negative = original - df.count()
    log(f"  ✓ Removed {removed_negative:,} negative quantities")
    totals["removed"] += removed_negative

    before = df.count()
    df = df.dropDuplicates(["order_item_id"])
    removed_dupes = before - df.count()
    log(f"  ✓ Removed {removed_dupes:,} duplicate order-line records")
    totals["removed"] += removed_dupes

    known = df.join(F.broadcast(menu_items.select("item_id")), "item_id", "left_semi")
    unknown = df.count() - known.count()
    log(f"  ✓ Quarantined {unknown:,} lines with unknown item_id")
    totals["quarantined"] += unknown

    known = known.withColumn("is_loss_making", F.col("line_total") < 0).cache()
    loss_making = known.where("is_loss_making").count()
    log(f"  ✓ Flagged {loss_making:,} loss-making lines")
    totals["flagged"] += loss_making

    known = known.select(*SCHEMAS["order_items"].fieldNames(), "is_loss_making").orderBy("order_item_id")
    save(known, "order_items_clean")
    known.write.mode("overwrite").parquet(str(PARQUET_DATA_DIR / "processed" / "order_items_clean"))
    n_clean = known.count()
    log(f"  → Saved order_items_clean.csv + Parquet: {n_clean:,} rows")
    totals["clean"] += n_clean


def clean_ratings(spark):
    df = load(spark, "ratings")
    original = df.count()
    totals["original"] += original
    log(f"\n[RATINGS] Loading {original:,} rows...")

    df = df.where(F.col("rating_value").isNull() | F.col("rating_value").between(1, 5))
    removed_invalid = original - df.count()
    log(f"  ✓ Removed {removed_invalid:,} invalid ratings (outside 1-5)")
    totals["removed"] += removed_invalid

    median_rating = df.approxQuantile("rating_value", [0.5], 0.0)[0]
    missing = df.where(F.col("rating_value").isNull()).count()
    df = df.fillna({"rating_value": median_rating})
    log(f"  ✓ Filled {missing:,} missing with median ({median_rating})")
    totals["flagged"] += missing

    save(df.orderBy("rating_id"), "ratings_clean")
    n_clean = df.count()
    log(f"  → Saved ratings_clean.csv: {n_clean:,} rows")
    totals["clean"] += n_clean


def clean_wastage(spark):
    df = load(spark, "wastage")
    original = df.count()
    totals["original"] += original
    log(f"\n[WASTAGE] Loading {original:,} rows...")

    df = df.where(F.col("wastage_quantity").between(0, MAX_VALID_WASTAGE_QTY))
    removed_impossible = original - df.count()
    log(f"  ✓ Removed {removed_impossible:,} impossible records (quantity < 0 or > {MAX_VALID_WASTAGE_QTY})")
    totals["removed"] += removed_impossible

    save(df.orderBy("wastage_id"), "wastage_clean")
    n_clean = df.count()
    log(f"  → Saved wastage_clean.csv: {n_clean:,} rows")
    totals["clean"] += n_clean


def copy_unchanged_tables(spark):
    log("\n[OTHER TABLES] Schema-validated copy...")
    for name in UNCHANGED_TABLES:
        df = load(spark, name)
        save(df, f"{name}_clean")
        n = df.count()
        log(f"  ✓ {name}_clean.csv: {n:,} rows")
        totals["original"] += n
        totals["clean"] += n


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    start = datetime.now()

    log("=" * 48)
    log("DineIQ Analytics - Data Cleaning Pipeline (Spark)")
    log("=" * 48)

    PROCESSED_DATA_DIR.mkdir(parents=True, exist_ok=True)
    spark = create_spark_session("DineIQ_Cleaning")

    with track_job("cleaning", spark) as job:
        restaurants = load(spark, "restaurants").cache()
        menu_items = load(spark, "menu_items").cache()

        clean_orders(spark, restaurants)
        clean_order_items(spark, menu_items)
        clean_ratings(spark)
        clean_wastage(spark)
        copy_unchanged_tables(spark)

        log("\n" + "=" * 48)
        log("CLEANING SUMMARY")
        log("=" * 48)
        log(f"Original records:   {totals['original']:,}")
        log(f"Records removed:    {totals['removed']:,}")
        log(f"Records quarantined: {totals['quarantined']:,}")
        log(f"Records flagged:    {totals['flagged']:,}")
        log(f"Clean records:      {totals['clean']:,}")
        log("\nAll decisions documented above.")
        log("Data ready for feature engineering.")
        log("=" * 48)
        log(f"\nCompleted in {datetime.now() - start}")

        job.set_records(processed=totals["original"], output=totals["clean"])

    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    (REPORTS_DIR / "cleaning_log.txt").write_text("\n".join(lines) + "\n")
    summary = {k: int(v) for k, v in totals.items()}
    summary["data_quality_score"] = round(summary["clean"] / summary["original"] * 100, 1)
    summary["generated_at"] = datetime.now().isoformat(timespec="seconds")
    (REPORTS_DIR / "cleaning_summary.json").write_text(json.dumps(summary, indent=2))
    print(f"\nCleaning log saved to {REPORTS_DIR / 'cleaning_log.txt'}")
    spark.stop()


if __name__ == "__main__":
    main()
