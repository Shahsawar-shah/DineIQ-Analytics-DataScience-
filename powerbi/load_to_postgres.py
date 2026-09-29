"""
DineIQ Analytics — Power BI data mart loader
=============================================
Loads the cleaned + feature-engineered + ML output CSVs into PostgreSQL
(schema `bi`) as a star schema that Power BI Desktop connects to directly.

Pipeline position:
  generate_dataset.py -> cleaning.py -> feature_engineering.py
  -> python_pipeline/models.py -> **powerbi/load_to_postgres.py** -> Power BI

Run on the VPS (from project root):
  export PG_HOST=localhost PG_DB=dineiq_analytics PG_USER=dineiq_user PG_PASSWORD='***'
  python powerbi/load_to_postgres.py

Re-runnable: every table is dropped and reloaded (idempotent refresh).
"""
import io
import json
import os
import sys
import time
from pathlib import Path

import pandas as pd
import psycopg2

ROOT = Path(__file__).resolve().parent.parent
PROC = ROOT / "processed_data"
FEAT = PROC / "features"
REPORTS = ROOT / "reports"
SQL_FILE = Path(__file__).resolve().parent / "star_schema.sql"

SCHEMA = "bi"

# staging table name -> source csv
SOURCES = {
    "stg_orders": PROC / "orders_clean.csv",
    "stg_order_items": PROC / "order_items_clean.csv",
    "stg_customers": PROC / "customers_clean.csv",
    "stg_menu_items": PROC / "menu_items_clean.csv",
    "stg_menu_categories": PROC / "menu_categories_clean.csv",
    "stg_restaurants": PROC / "restaurants_clean.csv",
    "stg_promotions": PROC / "promotions_clean.csv",
    "stg_ratings": PROC / "ratings_clean.csv",
    "stg_wastage": PROC / "wastage_clean.csv",
    "stg_inventory": PROC / "inventory_clean.csv",
    "stg_pricing_history": PROC / "pricing_history_clean.csv",
    "stg_item_features": FEAT / "menu_item_features.csv",
    "stg_customer_features": FEAT / "customer_features.csv",
    "stg_location_features": FEAT / "location_features.csv",
    "stg_order_features": FEAT / "order_features.csv",
    "stg_menu_classifications": PROC / "python_menu_classifications.csv",
}

# columns that are IDs stored as float in CSV because of NaN -> nullable int
NULLABLE_INT_COLS = {"customer_id", "promotion_id", "item_id", "restaurant_id", "category_id"}


def pg_type(col: str, s: pd.Series) -> str:
    if col.endswith("_date") or col == "launch_date":
        return "DATE"
    if col == "created_at":
        return "TIMESTAMP"
    if col.endswith("_time"):
        return "TIME"
    if pd.api.types.is_bool_dtype(s):
        return "BOOLEAN"
    if pd.api.types.is_integer_dtype(s):
        return "BIGINT"
    if pd.api.types.is_float_dtype(s):
        return "NUMERIC(14,4)"
    return "TEXT"


def load_csv(cur, table: str, path: Path) -> int:
    df = pd.read_csv(path, low_memory=False)
    for c in df.columns:
        if c in NULLABLE_INT_COLS and pd.api.types.is_float_dtype(df[c]):
            df[c] = df[c].astype("Int64")
        # "True"/"False" strings -> bool
        if df[c].dtype == object and set(df[c].dropna().unique()) <= {"True", "False"}:
            df[c] = df[c].map({"True": True, "False": False})

    cols = ", ".join(f'"{c}" {pg_type(c, df[c])}' for c in df.columns)
    cur.execute(f'DROP TABLE IF EXISTS {SCHEMA}."{table}" CASCADE')
    cur.execute(f'CREATE TABLE {SCHEMA}."{table}" ({cols})')

    buf = io.StringIO()
    df.to_csv(buf, index=False, header=False, na_rep="\\N")
    buf.seek(0)
    cur.copy_expert(
        f'COPY {SCHEMA}."{table}" FROM STDIN WITH (FORMAT csv, NULL \'\\N\')', buf
    )
    return len(df)


def load_model_metrics(cur):
    """Flatten reports/spark_model_metrics.json into bi.model_metrics."""
    cur.execute(f"DROP TABLE IF EXISTS {SCHEMA}.model_metrics CASCADE")
    cur.execute(f"""CREATE TABLE {SCHEMA}.model_metrics (
        pipeline TEXT, model TEXT, metric TEXT, value NUMERIC(10,4), trained_at TIMESTAMP)""")
    p = REPORTS / "spark_model_metrics.json"
    if not p.exists():
        return 0
    m = json.loads(p.read_text())
    trained = m.get("trained_at")
    rows = []
    for model, vals in m.items():
        if isinstance(vals, dict):
            for k, v in vals.items():
                if isinstance(v, (int, float)):
                    rows.append(("Spark MLlib", model, k, v, trained))
    cur.executemany(f"INSERT INTO {SCHEMA}.model_metrics VALUES (%s,%s,%s,%s,%s)", rows)
    return len(rows)


def main():
    missing = [str(p) for p in SOURCES.values() if not p.exists()]
    if missing:
        print("Missing input files — run the pipeline first:\n  " + "\n  ".join(missing))
        sys.exit(1)

    conn = psycopg2.connect(
        host=os.getenv("PG_HOST", "localhost"),
        port=os.getenv("PG_PORT", "5432"),
        dbname=os.getenv("PG_DB", "dineiq_analytics"),
        user=os.getenv("PG_USER", "dineiq_user"),
        password=os.getenv("PG_PASSWORD", ""),
    )
    t0 = time.time()
    with conn, conn.cursor() as cur:
        cur.execute(f"CREATE SCHEMA IF NOT EXISTS {SCHEMA}")
        print("Loading staging tables ...")
        for table, path in SOURCES.items():
            n = load_csv(cur, table, path)
            print(f"  ✓ {SCHEMA}.{table:<26} {n:>10,} rows")
        print(f"  ✓ {SCHEMA}.model_metrics {load_model_metrics(cur):>24} rows")

        print("Building star schema (dims, facts, indexes) ...")
        cur.execute(SQL_FILE.read_text())

        # Tables are recreated every run, so re-grant read access each time.
        cur.execute("SELECT 1 FROM pg_roles WHERE rolname='powerbi_reader'")
        if cur.fetchone():
            cur.execute(f"GRANT USAGE ON SCHEMA {SCHEMA} TO powerbi_reader")
            cur.execute(f"GRANT SELECT ON ALL TABLES IN SCHEMA {SCHEMA} TO powerbi_reader")
            print("  ✓ SELECT granted to powerbi_reader")
        else:
            print("  ! powerbi_reader role not found — run powerbi/create_reader.sql as postgres")

        cur.execute(f"""SELECT table_name FROM information_schema.tables
                        WHERE table_schema='{SCHEMA}' AND (table_name LIKE 'dim_%' OR table_name LIKE 'fact_%')
                        ORDER BY 1""")
        print("\nPower BI tables:")
        for (t,) in cur.fetchall():
            cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.{t}")
            print(f"  {t:<28} {cur.fetchone()[0]:>10,}")
    conn.close()
    print(f"\nDone in {time.time() - t0:.1f}s — connect Power BI to schema '{SCHEMA}'.")


if __name__ == "__main__":
    main()
