"""
DineIQ Analytics - Data Quality Report

Checks raw CSV files in raw_data/ for missing values, duplicates,
and invalid/out-of-range values before the data goes anywhere near ML.

Run from anywhere:  python spark_jobs/data_quality.py
Reads from  <project root>/raw_data/
Writes to   <project root>/reports/data_quality_report.txt
"""

USE_SPARK = False  # Pandas only for now. Flip to True once Spark path is wired up.

from datetime import datetime
from pathlib import Path

import pandas as pd

# if USE_SPARK:
#     from pyspark.sql import SparkSession
#     from pyspark.sql import functions as F
#     from pyspark.sql.types import *

PROJECT_ROOT = Path(__file__).resolve().parent.parent
RAW_DATA_DIR = PROJECT_ROOT / "raw_data"
REPORTS_DIR = PROJECT_ROOT / "reports"

lines = []


def log(text=""):
    print(text)
    lines.append(text)


def pct(count, total):
    return (count / total * 100) if total else 0.0


# ---------------------------------------------------------------------------
# Per-table checks
# ---------------------------------------------------------------------------
def check_orders(counters):
    df = pd.read_csv(RAW_DATA_DIR / "orders.csv")
    total = len(df)

    missing_customer = df["customer_id"].isna().sum()
    duplicates = df.duplicated().sum()
    cancelled = (df["order_status"] == "cancelled").sum()
    negative_totals = (df["total_amount"] < 0).sum()

    log(f"\nTABLE: orders ({total:,} rows)")
    log(f"  ⚠ Missing customer_id:  {missing_customer:,} ({pct(missing_customer, total):.1f}%)")
    log(f"  ⚠ Duplicate records:    {duplicates:,} ({pct(duplicates, total):.1f}%)")
    log(f"  ℹ Cancelled orders:     {cancelled:,} ({pct(cancelled, total):.1f}%)")
    log(f"  ✓ Negative totals:      {negative_totals:,} ({pct(negative_totals, total):.1f}%)")

    counters["warnings"] += (missing_customer > 0) + (duplicates > 0)
    counters["info"] += 1
    counters["errors"] += (negative_totals > 0)


def check_order_items(counters):
    df = pd.read_csv(RAW_DATA_DIR / "order_items.csv")
    total = len(df)

    negative_qty = (df["quantity"] < 0).sum()
    loss_making = (df["line_total"] < 0).sum()

    log(f"\nTABLE: order_items ({total:,} rows)")
    log(f"  ⚠ Negative quantities:  {negative_qty:,} ({pct(negative_qty, total):.1f}%)")
    log(f"  ℹ Loss-making lines:    {loss_making:,} ({pct(loss_making, total):.1f}%)")

    counters["warnings"] += (negative_qty > 0)
    counters["info"] += 1


def check_ratings(counters):
    df = pd.read_csv(RAW_DATA_DIR / "ratings.csv")
    total = len(df)

    missing_rating = df["rating_value"].isna().sum()
    too_high = (df["rating_value"] > 5).sum()
    too_low = (df["rating_value"] < 1).sum()

    log(f"\nTABLE: ratings ({total:,} rows)")
    log(f"  ⚠ Missing rating:       {missing_rating:,} ({pct(missing_rating, total):.1f}%)")
    log(f"  ✗ Invalid rating > 5:   {too_high:,} ({pct(too_high, total):.1f}%)")
    log(f"  ✓ Invalid rating < 1:   {too_low:,} ({pct(too_low, total):.1f}%)")

    counters["warnings"] += (missing_rating > 0)
    counters["errors"] += (too_high > 0)
    counters["errors"] += (too_low > 0)


def check_wastage(counters):
    df = pd.read_csv(RAW_DATA_DIR / "wastage.csv")
    total = len(df)

    impossible = (df["wastage_quantity"] > 1000).sum()

    log(f"\nTABLE: wastage ({total:,} rows)")
    log(f"  ✗ Impossible wastage:   {impossible:,} ({pct(impossible, total):.1f}%)")

    counters["errors"] += (impossible > 0)


def check_menu_items(counters):
    df = pd.read_csv(RAW_DATA_DIR / "menu_items.csv")
    total = len(df)

    loss_making = (df["preparation_cost"] > df["base_price"]).sum()

    log(f"\nTABLE: menu_items ({total:,} rows)")
    log(f"  ℹ Loss-making items:    {loss_making:,} ({pct(loss_making, total):.1f}%)")

    counters["info"] += 1


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    start = datetime.now()

    log("=" * 48)
    log("DineIQ Analytics - Data Quality Report")
    log("=" * 48)

    counters = {"errors": 0, "warnings": 0, "info": 0}

    check_orders(counters)
    check_order_items(counters)
    check_ratings(counters)
    check_wastage(counters)
    check_menu_items(counters)

    log("\n" + "=" * 48)
    log("SUMMARY")
    log("=" * 48)
    log(f"✗ ERRORS:    {counters['errors']}  (must fix before ML)")
    log(f"⚠ WARNINGS:  {counters['warnings']}  (clean before ML)")
    log(f"ℹ INFO:      {counters['info']}  (expected/intentional)")
    log("=" * 48)

    elapsed = datetime.now() - start
    log(f"\nCompleted in {elapsed}")

    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    report_path = REPORTS_DIR / "data_quality_report.txt"
    report_path.write_text("\n".join(lines) + "\n")
    print(f"\nReport saved to {report_path}")


if __name__ == "__main__":
    main()
