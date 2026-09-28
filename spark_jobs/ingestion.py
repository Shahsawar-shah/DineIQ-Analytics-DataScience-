"""
DineIQ Analytics - Spark Ingestion

Loads all 11 raw CSV files from raw_data/ with explicit schemas, compares
them against Spark's inferred schema (data-type validation), validates row
counts, saves each table as Parquet to parquet_data/ (tables that carry a
restaurant_id are partitioned by location), and registers Spark SQL temp
views for a sanity-check join.

Run from anywhere:  python spark_jobs/ingestion.py
Reads from  <project root>/raw_data/
Writes to   <project root>/parquet_data/
"""

from datetime import datetime

from schemas import SCHEMAS
from spark_utils import (
    PARQUET_DATA_DIR, RAW_DATA_DIR, create_spark_session, read_csv, track_job,
)

# table -> minimum expected rows (SRS dataset minimums)
MIN_ROWS = {
    "menu_categories": 10,
    "menu_items": 150,
    "restaurants": 20,
    "customers": 50000,
    "promotions": 15,
    "pricing_history": 400,
    "orders": 100000,
    "order_items": 1000000,
    "ratings": 100000,
    "inventory": 3000,
    "wastage": 50000,
}

# Restaurant id is the location key in this dataset; partitioning by it
# lets location-filtered queries read only that location's files.
PARTITION_COLUMN = "restaurant_id"


def validate_table(df, table_name, expected_min_rows):
    actual_rows = df.count()
    status = "✓" if actual_rows >= expected_min_rows else "✗"
    print(f"  {status} {table_name}: {actual_rows:,} rows (min {expected_min_rows:,})")
    return actual_rows


def validate_types(spark, table_name, explicit_df):
    """Schema inference vs the explicit schema: report columns whose inferred
    type differs, which is how malformed columns in a new dataset show up."""
    inferred = spark.read.csv(
        str(RAW_DATA_DIR / f"{table_name}.csv"), header=True, inferSchema=True,
        samplingRatio=0.1,
    )
    inferred_types = {f.name: f.dataType.simpleString() for f in inferred.schema.fields}
    mismatches = []
    for field in explicit_df.schema.fields:
        inferred_type = inferred_types.get(field.name)
        if inferred_type is None:
            mismatches.append(f"{field.name}: missing from file")
        elif inferred_type != field.dataType.simpleString():
            mismatches.append(f"{field.name}: explicit {field.dataType.simpleString()} / inferred {inferred_type}")
    if mismatches:
        print(f"  ℹ type differences (explicit schema wins): {', '.join(mismatches)}")
    return mismatches


def save_parquet(df, table_name):
    path = str(PARQUET_DATA_DIR / table_name)
    writer = df.write.mode("overwrite")
    if PARTITION_COLUMN in df.columns:
        writer = writer.partitionBy(PARTITION_COLUMN)
        print(f"  Partitioned by {PARTITION_COLUMN}")
    writer.parquet(path)
    print(f"  Saved parquet: {path}/")


def main():
    print("=" * 50)
    print("DineIQ Analytics - Spark Ingestion")
    print("=" * 50)

    spark = create_spark_session("DineIQ_Ingestion")
    print(f"Spark version: {spark.version}\n")
    start = datetime.now()

    with track_job("ingestion", spark) as job:
        print("Loading CSV files with explicit schemas...")
        print("-" * 50)

        dataframes = {}
        total_rows = 0
        for name, schema in SCHEMAS.items():
            print(f"\nLoading {name}...")
            df = read_csv(spark, RAW_DATA_DIR / f"{name}.csv", schema)
            total_rows += validate_table(df, name, MIN_ROWS[name])
            validate_types(spark, name, df)
            save_parquet(df, name)
            dataframes[name] = df

        print("\nRegistering Spark SQL temp views...")
        for name, df in dataframes.items():
            df.createOrReplaceTempView(name)
            print(f"  ✓ {name}")

        print("\nTesting Spark SQL join...")
        spark.sql("""
            SELECT mi.item_name,
                   mc.category_name,
                   COUNT(oi.order_item_id)  AS total_orders,
                   ROUND(SUM(oi.line_total), 2) AS total_revenue,
                   ROUND(AVG(oi.unit_price), 2) AS avg_price
            FROM order_items oi
            JOIN menu_items mi      ON oi.item_id = mi.item_id
            JOIN menu_categories mc ON mi.category_id = mc.category_id
            GROUP BY mi.item_name, mc.category_name
            ORDER BY total_revenue DESC
            LIMIT 10
        """).show(truncate=False)

        # Partition pruning check: reads a single location's files only
        one_location = spark.read.parquet(str(PARQUET_DATA_DIR / "orders")).where("restaurant_id = 1").count()
        print(f"Partition pruning check — orders at restaurant 1: {one_location:,}")

        job.set_records(processed=total_rows, output=total_rows)

    print(f"\nIngestion completed in {datetime.now() - start}")
    print("All 11 tables loaded and saved as Parquet")
    print("=" * 50)
    spark.stop()


if __name__ == "__main__":
    main()
