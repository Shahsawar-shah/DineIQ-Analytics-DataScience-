"""
DineIQ Analytics - Data Cleaning Pipeline

Applies the fixes identified in the data quality report to each raw
table and writes clean (and quarantined) CSVs to processed_data/.

Run from anywhere:  python spark_jobs/cleaning.py
Reads from  <project root>/raw_data/
Writes to   <project root>/processed_data/
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
PROCESSED_DATA_DIR = PROJECT_ROOT / "processed_data"
REPORTS_DIR = PROJECT_ROOT / "reports"

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


# ---------------------------------------------------------------------------
# Per-table cleaning
# ---------------------------------------------------------------------------
def clean_orders():
    df = pd.read_csv(RAW_DATA_DIR / "orders.csv")
    original = len(df)
    totals["original"] += original
    log(f"\n[ORDERS] Loading {original:,} rows...")

    before = len(df)
    df = df.drop_duplicates()
    removed_duplicates = before - len(df)
    log(f"  ✓ Removed {removed_duplicates:,} duplicate records")
    totals["removed"] += removed_duplicates

    missing_customer = df["customer_id"].isna()
    quarantined = df[missing_customer]
    df = df[~missing_customer]
    quarantined.to_csv(PROCESSED_DATA_DIR / "quarantine_orders.csv", index=False)
    log(f"  ✓ Quarantined {len(quarantined):,} missing customer_id")
    totals["quarantined"] += len(quarantined)

    cancelled = (df["order_status"] == "cancelled").sum()
    df["is_cancelled"] = df["order_status"] == "cancelled"
    log(f"  ✓ Flagged {cancelled:,} cancelled orders")
    totals["flagged"] += cancelled

    df.to_csv(PROCESSED_DATA_DIR / "orders_clean.csv", index=False)
    log(f"  → Saved orders_clean.csv: {len(df):,} rows")
    totals["clean"] += len(df)


def clean_order_items():
    df = pd.read_csv(RAW_DATA_DIR / "order_items.csv")
    original = len(df)
    totals["original"] += original
    log(f"\n[ORDER_ITEMS] Loading {original:,} rows...")

    before = len(df)
    df = df[df["quantity"] >= 0]
    removed_negative = before - len(df)
    log(f"  ✓ Removed {removed_negative:,} negative quantities")
    totals["removed"] += removed_negative

    loss_making = (df["line_total"] < 0).sum()
    df["is_loss_making"] = df["line_total"] < 0
    log(f"  ✓ Flagged {loss_making:,} loss-making lines")
    totals["flagged"] += loss_making

    df.to_csv(PROCESSED_DATA_DIR / "order_items_clean.csv", index=False)
    log(f"  → Saved order_items_clean.csv: {len(df):,} rows")
    totals["clean"] += len(df)


def clean_ratings():
    df = pd.read_csv(RAW_DATA_DIR / "ratings.csv")
    original = len(df)
    totals["original"] += original
    log(f"\n[RATINGS] Loading {original:,} rows...")

    before = len(df)
    df = df[~((df["rating_value"] > 5) | (df["rating_value"] < 1))]
    removed_invalid = before - len(df)
    log(f"  ✓ Removed {removed_invalid:,} invalid ratings")
    totals["removed"] += removed_invalid

    missing = df["rating_value"].isna()
    median_rating = df["rating_value"].median()
    df.loc[missing, "rating_value"] = median_rating
    log(f"  ✓ Filled {missing.sum():,} missing with median")
    totals["flagged"] += missing.sum()

    df.to_csv(PROCESSED_DATA_DIR / "ratings_clean.csv", index=False)
    log(f"  → Saved ratings_clean.csv: {len(df):,} rows")
    totals["clean"] += len(df)


def clean_wastage():
    df = pd.read_csv(RAW_DATA_DIR / "wastage.csv")
    original = len(df)
    totals["original"] += original
    log(f"\n[WASTAGE] Loading {original:,} rows...")

    before = len(df)
    df = df[df["wastage_quantity"] <= 1000]
    removed_impossible = before - len(df)
    log(f"  ✓ Removed {removed_impossible:,} impossible records")
    totals["removed"] += removed_impossible

    df.to_csv(PROCESSED_DATA_DIR / "wastage_clean.csv", index=False)
    log(f"  → Saved wastage_clean.csv: {len(df):,} rows")
    totals["clean"] += len(df)


def copy_unchanged_tables():
    log("\n[OTHER TABLES] Copying unchanged...")
    for name in UNCHANGED_TABLES:
        df = pd.read_csv(RAW_DATA_DIR / f"{name}.csv")
        df.to_csv(PROCESSED_DATA_DIR / f"{name}_clean.csv", index=False)
        log(f"  ✓ {name}_clean.csv: {len(df):,} rows")
        totals["original"] += len(df)
        totals["clean"] += len(df)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    start = datetime.now()

    log("=" * 48)
    log("DineIQ Analytics - Data Cleaning Pipeline")
    log("=" * 48)

    PROCESSED_DATA_DIR.mkdir(parents=True, exist_ok=True)

    clean_orders()
    clean_order_items()
    clean_ratings()
    clean_wastage()
    copy_unchanged_tables()

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

    elapsed = datetime.now() - start
    log(f"\nCompleted in {elapsed}")

    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    report_path = REPORTS_DIR / "cleaning_log.txt"
    report_path.write_text("\n".join(lines) + "\n")
    print(f"\nCleaning log saved to {report_path}")


if __name__ == "__main__":
    main()
