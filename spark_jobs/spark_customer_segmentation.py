"""
DineIQ Analytics - Customer Segmentation, Spark MLlib side of the dual pipeline

Builds RFM behaviour features from orders_clean.csv with Spark, fits
StandardScaler + K-Means (k=5) on the training customers and assigns every
customer to a segment. python_pipeline/customer_segmentation.py does the
same job independently with pandas + scikit-learn; comparison.py then
compares the two on the held-out customers.

Split (identical rule in both pipelines, no shared files):
    customer_id % 10 < 7  -> train (70%)     otherwise -> test (30%, unseen)

Segment naming (identical rule in both pipelines), from each cluster's
mean behaviour on the training customers:
    highest mean spend           -> High-Value Loyal
    then highest mean recency    -> At-Risk
    then highest promo share     -> Promotion-Driven
    then highest mean frequency  -> Frequent
    remaining cluster            -> Occasional

Run from anywhere:  python spark_jobs/spark_customer_segmentation.py
Writes  processed_data/spark_customer_segments.csv
        reports/spark_segmentation_metrics.json
        models/spark_customer_kmeans/
"""

import json
import time
from datetime import datetime

from pyspark.ml import Pipeline
from pyspark.ml.clustering import KMeans
from pyspark.ml.evaluation import ClusteringEvaluator
from pyspark.ml.feature import StandardScaler, VectorAssembler
from pyspark.ml.functions import vector_to_array
from pyspark.sql import functions as F
from pyspark.sql.types import BooleanType, StructField, StructType

from schemas import SCHEMAS
from spark_utils import (
    PROCESSED_DATA_DIR, PROJECT_ROOT, REPORTS_DIR, create_spark_session, read_csv, track_job,
)

K = 5
SEED = 42
OUTPUT_PATH = PROCESSED_DATA_DIR / "spark_customer_segments.csv"
METRICS_PATH = REPORTS_DIR / "spark_segmentation_metrics.json"
MODEL_DIR = PROJECT_ROOT / "models" / "spark_customer_kmeans"

RAW_FEATURES = ["recency_days", "frequency", "monetary_value", "avg_order_value", "promo_order_ratio"]
MODEL_FEATURES = ["log_recency", "log_frequency", "log_monetary", "log_aov", "promo_order_ratio"]
NAMING_ORDER = [
    ("High-Value Loyal", "monetary_value"),
    ("At-Risk", "recency_days"),
    ("Promotion-Driven", "promo_order_ratio"),
    ("Frequent", "frequency"),
]


def build_features(spark):
    schema = StructType(SCHEMAS["orders"].fields + [StructField("is_cancelled", BooleanType())])
    orders = read_csv(spark, PROCESSED_DATA_DIR / "orders_clean.csv", schema).where(~F.col("is_cancelled"))
    ref_date = orders.agg(F.max("order_date")).first()[0]
    customers = (
        orders.groupBy("customer_id").agg(
            F.max("order_date").alias("last_order_date"),
            F.countDistinct("order_id").alias("frequency"),
            F.sum("total_amount").alias("monetary_value"),
            F.avg(F.col("promotion_id").isNotNull().cast("double")).alias("promo_order_ratio"),
        )
        .withColumn("recency_days", F.datediff(F.lit(ref_date), F.col("last_order_date")))
        .withColumn("avg_order_value", F.col("monetary_value") / F.col("frequency"))
        .withColumn("log_recency", F.log1p("recency_days"))
        .withColumn("log_frequency", F.log1p("frequency"))
        .withColumn("log_monetary", F.log1p("monetary_value"))
        .withColumn("log_aov", F.log1p("avg_order_value"))
        .withColumn("split", F.when(F.col("customer_id") % 10 < 7, "train").otherwise("test"))
    )
    return customers


def name_clusters(train_pred):
    profile = train_pred.groupBy("cluster").agg(*[F.avg(c).alias(c) for c in RAW_FEATURES]).collect()
    remaining = {r["cluster"]: r.asDict() for r in profile}
    names = {}
    for name, metric in NAMING_ORDER:
        cluster = max(remaining, key=lambda c: remaining[c][metric])
        names[cluster] = name
        remaining.pop(cluster)
    for cluster in remaining:
        names[cluster] = "Occasional"
    return names, {r["cluster"]: {c: round(r[c], 3) for c in RAW_FEATURES} for r in profile}


def main():
    print("=" * 48)
    print("DineIQ - Spark Customer Segmentation (K-Means)")
    print("=" * 48)
    spark = create_spark_session("DineIQ_CustomerSegmentation")

    with track_job("spark_customer_segmentation", spark) as job:
        customers = build_features(spark).cache()
        train = customers.where("split = 'train'")
        n_train, n_total = train.count(), customers.count()
        print(f"Customers with orders: {n_total:,}  (train {n_train:,} / test {n_total - n_train:,})")

        pipeline = Pipeline(stages=[
            VectorAssembler(inputCols=MODEL_FEATURES, outputCol="raw_features"),
            StandardScaler(inputCol="raw_features", outputCol="features", withMean=True, withStd=True),
            KMeans(k=K, seed=SEED, maxIter=50, featuresCol="features", predictionCol="cluster"),
        ])
        model = pipeline.fit(train)
        kmeans = model.stages[-1]
        centers = [c.tolist() for c in kmeans.clusterCenters()]

        started = time.perf_counter()
        predicted = model.transform(customers).cache()
        predicted.count()
        latency_ms = (time.perf_counter() - started) * 1000

        # Distance to the assigned centroid and to the runner-up (margin = confidence)
        feature_arr = vector_to_array("features")
        distances = F.array(*[
            F.sqrt(F.aggregate(
                F.zip_with(feature_arr, F.array(*[F.lit(v) for v in center]), lambda a, b: (a - b) * (a - b)),
                F.lit(0.0), lambda acc, x: acc + x))
            for center in centers
        ])
        predicted = predicted.withColumn("_d", distances).withColumn("_sorted", F.array_sort("_d"))

        names, profiles = name_clusters(predicted.where("split = 'train'"))
        name_map = F.create_map([F.lit(x) for c, n in names.items() for x in (c, n)])

        test_silhouette = ClusteringEvaluator(featuresCol="features", predictionCol="cluster") \
            .evaluate(predicted.where("split = 'test'"))

        trained_at = datetime.now()
        model_version = f"spark-kmeans-{trained_at:%Y%m%d-%H%M%S}"
        model.write().overwrite().save(str(MODEL_DIR))

        output = predicted.select(
            "customer_id", "split",
            F.col("cluster").alias("spark_cluster"),
            name_map[F.col("cluster")].alias("spark_segment"),
            F.round(F.col("_sorted")[0], 4).alias("spark_distance"),
            F.round(F.col("_sorted")[1] - F.col("_sorted")[0], 4).alias("spark_margin"),
            F.lit(model_version).alias("model_version"),
        ).orderBy("customer_id")
        output.toPandas().to_csv(OUTPUT_PATH, index=False)

        sizes = {names[r["cluster"]]: r["count"] for r in predicted.groupBy("cluster").count().collect()}
        METRICS_PATH.write_text(json.dumps({
            "pipeline": "spark",
            "platform": f"Apache Spark MLlib {spark.version}",
            "algorithm": "StandardScaler + KMeans (k-means||)",
            "k": K,
            "model_version": model_version,
            "trained_at": trained_at.isoformat(timespec="seconds"),
            "features": MODEL_FEATURES,
            "train_size": n_train,
            "test_size": n_total - n_train,
            "test_silhouette": round(test_silhouette, 4),
            "prediction_latency_ms": round(latency_ms, 1),
            "segment_sizes": sizes,
            "segment_profiles": {names[c]: p for c, p in profiles.items()},
        }, indent=2))

        job.set_records(processed=n_total, output=n_total)
        job.add_metric("test_silhouette", round(test_silhouette, 4))

        print(f"Test silhouette: {test_silhouette:.3f}")
        print("Segment sizes:", sizes)
        print(f"Saved: {OUTPUT_PATH.name}, {METRICS_PATH.name}  version {model_version}")

    spark.stop()


if __name__ == "__main__":
    main()
