"""
DineIQ Analytics - Data Quality Report (Spark)

Checks the raw CSV files in raw_data/ for missing values, duplicates,
invalid/out-of-range values and broken references before the data goes
anywhere near ML. Every check is a Spark DataFrame aggregation.

Run from anywhere:  python spark_jobs/data_quality.py
Reads from  <project root>/raw_data/
Writes to   <project root>/reports/data_quality_report.txt
            <project root>/reports/data_quality_report.json
"""

USE_SPARK = True

import json
from datetime import datetime

from pyspark.sql import functions as F

from schemas import SCHEMAS
from spark_utils import RAW_DATA_DIR, REPORTS_DIR, create_spark_session, read_csv, track_job

MAX_VALID_WASTAGE_QTY = 1000

lines = []
results = {}


def log(text=""):
    print(text)
    lines.append(text)


def pct(count, total):
    return (count / total * 100) if total else 0.0


def load(spark, name):
    return read_csv(spark, RAW_DATA_DIR / f"{name}.csv", SCHEMAS[name])


def report(table, total, checks, counters):
    """checks: list of (label, count, severity) with severity in error/warning/info."""
    icons = {"error": "✗", "warning": "⚠", "info": "ℹ"}
    log(f"\nTABLE: {table} ({total:,} rows)")
    results[table] = {"rows": total, "checks": []}
    for label, count, severity in checks:
        icon = icons[severity] if count else "✓"
        log(f"  {icon} {label + ':':<30}{count:>8,} ({pct(count, total):.1f}%)")
        results[table]["checks"].append(
            {"check": label, "count": int(count), "pct": round(pct(count, total), 2), "severity": severity})
        if count:
            counters[severity + "s" if severity != "info" else "info"] += 1


def count_where(df, condition):
    return df.where(condition).count()


def check_orders(orders, restaurants, counters):
    total = orders.count()
    valid_restaurants = restaurants.select("restaurant_id")
    duplicates = total - orders.dropDuplicates().count()
    duplicate_ids = total - orders.dropDuplicates(["order_id"]).count()
    invalid_restaurant = orders.join(valid_restaurants, "restaurant_id", "left_anti").count()
    report("orders", total, [
        ("Missing customer_id", count_where(orders, F.col("customer_id").isNull()), "warning"),
        ("Duplicate records", duplicates, "warning"),
        ("Duplicate order_id", duplicate_ids, "warning"),
        ("Invalid dates", count_where(orders, F.col("order_date").isNull()), "error"),
        ("Invalid restaurant reference", invalid_restaurant, "error"),
        ("Negative totals", count_where(orders, F.col("total_amount") < 0), "error"),
        ("Discount > subtotal", count_where(orders, F.col("discount_amount") > F.col("subtotal")), "error"),
        ("Cancelled orders", count_where(orders, F.col("order_status") == "cancelled"), "info"),
    ], counters)


def check_order_items(order_items, menu_items, counters):
    total = order_items.count()
    unknown_item = order_items.join(menu_items.select("item_id"), "item_id", "left_anti").count()
    duplicate_lines = total - order_items.dropDuplicates(["order_item_id"]).count()
    report("order_items", total, [
        ("Missing item_id", count_where(order_items, F.col("item_id").isNull()), "warning"),
        ("Unknown menu item", unknown_item, "error"),
        ("Duplicate order-line records", duplicate_lines, "warning"),
        ("Negative quantities", count_where(order_items, F.col("quantity") < 0), "warning"),
        ("Invalid unit price (<= 0)", count_where(order_items, F.col("unit_price") <= 0), "error"),
        ("Discount > line value", count_where(
            order_items, F.col("discount_applied") > F.col("unit_price") * F.abs(F.col("quantity"))), "error"),
        ("Loss-making lines", count_where(order_items, F.col("line_total") < 0), "info"),
    ], counters)


def check_ratings(ratings, counters):
    total = ratings.count()
    report("ratings", total, [
        ("Missing rating", count_where(ratings, F.col("rating_value").isNull()), "warning"),
        ("Invalid rating > 5", count_where(ratings, F.col("rating_value") > 5), "error"),
        ("Invalid rating < 1", count_where(ratings, F.col("rating_value") < 1), "error"),
        ("Invalid dates", count_where(ratings, F.col("rating_date").isNull()), "error"),
    ], counters)


def check_wastage(wastage, restaurants, counters):
    total = wastage.count()
    invalid_location = wastage.join(restaurants.select("restaurant_id"), "restaurant_id", "left_anti").count()
    report("wastage", total, [
        ("Impossible wastage (> 1000)", count_where(wastage, F.col("wastage_quantity") > MAX_VALID_WASTAGE_QTY), "error"),
        ("Negative wastage", count_where(wastage, F.col("wastage_quantity") < 0), "error"),
        ("Invalid location reference", invalid_location, "error"),
    ], counters)


def check_menu_items(menu_items, counters):
    total = menu_items.count()
    report("menu_items", total, [
        ("Invalid menu price (<= 0)", count_where(menu_items, F.col("base_price") <= 0), "error"),
        ("Missing preparation cost", count_where(menu_items, F.col("preparation_cost").isNull()), "warning"),
        ("Loss-making items", count_where(menu_items, F.col("preparation_cost") > F.col("base_price")), "info"),
    ], counters)


def main():
    start = datetime.now()
    log("=" * 48)
    log("DineIQ Analytics - Data Quality Report (Spark)")
    log("=" * 48)

    spark = create_spark_session("DineIQ_DataQuality")
    counters = {"errors": 0, "warnings": 0, "info": 0}

    with track_job("data_quality", spark) as job:
        restaurants = load(spark, "restaurants")
        menu_items = load(spark, "menu_items")
        orders = load(spark, "orders").cache()
        order_items = load(spark, "order_items").cache()
        ratings = load(spark, "ratings")
        wastage = load(spark, "wastage")

        check_orders(orders, restaurants, counters)
        check_order_items(order_items, menu_items, counters)
        check_ratings(ratings, counters)
        check_wastage(wastage, restaurants, counters)
        check_menu_items(menu_items, counters)

        log("\n" + "=" * 48)
        log("SUMMARY")
        log("=" * 48)
        log(f"✗ ERRORS:    {counters['errors']}  (must fix before ML)")
        log(f"⚠ WARNINGS:  {counters['warnings']}  (clean before ML)")
        log(f"ℹ INFO:      {counters['info']}  (expected/intentional)")
        log("=" * 48)
        log(f"\nCompleted in {datetime.now() - start}")

        job.set_records(processed=sum(t["rows"] for t in results.values()))
        job.add_metric("errors", counters["errors"])
        job.add_metric("warnings", counters["warnings"])

    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    (REPORTS_DIR / "data_quality_report.txt").write_text("\n".join(lines) + "\n")
    (REPORTS_DIR / "data_quality_report.json").write_text(json.dumps({
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "summary": counters,
        "tables": results,
    }, indent=2))
    print(f"\nReport saved to {REPORTS_DIR / 'data_quality_report.txt'}")
    spark.stop()


if __name__ == "__main__":
    main()
