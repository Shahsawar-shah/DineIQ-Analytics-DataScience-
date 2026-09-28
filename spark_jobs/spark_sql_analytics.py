"""
DineIQ Analytics - Spark SQL analytics

Runs every query in spark_sql/queries.sql against the Parquet data and
saves each result as reports/spark_sql/<query name>.csv, with timings in
reports/spark_sql/summary.json.

Views: orders / order_items come from the cleaned Parquet written by
cleaning.py (cancelled orders excluded); the other tables come from the
Parquet written by ingestion.py.

Run from anywhere:  python spark_jobs/spark_sql_analytics.py
Needs:  python spark_jobs/ingestion.py and python spark_jobs/cleaning.py first
"""

import json
import re
import time
from datetime import datetime

from pyspark.sql import functions as F

from spark_utils import PARQUET_DATA_DIR, PROJECT_ROOT, REPORTS_DIR, create_spark_session, track_job, write_single_csv

QUERIES_PATH = PROJECT_ROOT / "spark_sql" / "queries.sql"
OUTPUT_DIR = REPORTS_DIR / "spark_sql"
RAW_PARQUET_TABLES = [
    "menu_items", "menu_categories", "restaurants", "customers", "promotions",
    "pricing_history", "ratings", "wastage", "inventory",
]


def parse_queries(text):
    """Split the file on '-- name: <id>' markers -> {id: sql}."""
    queries = {}
    for block in re.split(r"^--\s*name:\s*", text, flags=re.MULTILINE)[1:]:
        name, _, body = block.partition("\n")
        sql = body.strip().rstrip(";").strip()
        if sql:
            queries[name.strip()] = sql
    return queries


def register_views(spark):
    processed = PARQUET_DATA_DIR / "processed"
    orders = spark.read.parquet(str(processed / "orders_clean")).where(~F.col("is_cancelled"))
    orders.createOrReplaceTempView("orders")
    spark.read.parquet(str(processed / "order_items_clean")).createOrReplaceTempView("order_items")
    for table in RAW_PARQUET_TABLES:
        spark.read.parquet(str(PARQUET_DATA_DIR / table)).createOrReplaceTempView(table)


def main():
    print("=" * 48)
    print("DineIQ - Spark SQL analytics")
    print("=" * 48)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    queries = parse_queries(QUERIES_PATH.read_text())
    spark = create_spark_session("DineIQ_SparkSQL")

    results = []
    with track_job("spark_sql_analytics", spark) as job:
        register_views(spark)
        for name, sql in queries.items():
            started = time.perf_counter()
            df = spark.sql(sql).cache()
            rows = df.count()
            write_single_csv(df, OUTPUT_DIR / f"{name}.csv")
            seconds = round(time.perf_counter() - started, 2)
            results.append({"query": name, "rows": rows, "seconds": seconds})
            print(f"  ✓ {name:<38} {rows:>7,} rows  {seconds:>6.2f}s")
            df.unpersist()
        job.set_records(output=sum(r["rows"] for r in results))
        job.add_metric("queries", len(results))

    (OUTPUT_DIR / "summary.json").write_text(json.dumps({
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "spark_version": spark.version,
        "queries": results,
    }, indent=2))
    print(f"Saved {len(results)} query results to {OUTPUT_DIR}")
    spark.stop()


if __name__ == "__main__":
    main()
