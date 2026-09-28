"""
DineIQ Analytics - Spark MLlib Pipeline (independent of Python pipeline)

Menu Performance Classification into 4 classes:
  0 Profit Driver, 1 Volume Driver, 2 Hidden Opportunity, 3 Low Performer

Trains Random Forest and multinomial Logistic Regression (4-class) plus
Gradient-Boosted Trees (binary: Profit Driver vs rest — GBTClassifier has no
multiclass support) with Spark MLlib on a stratified 70/30 split, picks the
best multiclass model by macro F1, and classifies every menu item with it.

For every model it records accuracy, macro precision / recall / F1,
per-class metrics, the test confusion matrix (computed with a Spark
groupBy) and prediction latency; the best model is saved with a version.

Same label rules, feature set and split rule as python_pipeline/models.py,
so the two pipelines can be compared on the same unseen items.

Run from anywhere:  python spark_jobs/spark_ml_models.py
Reads from  <project root>/processed_data/features/menu_item_features.csv
Writes to   <project root>/processed_data/spark_menu_classifications.csv
            <project root>/reports/spark_model_metrics.json
            <project root>/models/spark_menu_classifier/
"""

import json
import statistics
import time
from datetime import datetime
from pathlib import Path

from pyspark.ml.classification import (
    GBTClassifier,
    LogisticRegression,
    RandomForestClassifier,
)
from pyspark.ml.evaluation import MulticlassClassificationEvaluator
from pyspark.ml.feature import VectorAssembler
from pyspark.ml.functions import vector_to_array
from pyspark.sql import functions as F
from pyspark.sql.types import DoubleType
from pyspark.sql.window import Window

from spark_utils import create_spark_session, track_job

PROJECT_ROOT = Path(__file__).resolve().parent.parent
FEATURES_PATH = PROJECT_ROOT / "processed_data" / "features" / "menu_item_features.csv"
OUTPUT_PATH = PROJECT_ROOT / "processed_data" / "spark_menu_classifications.csv"
METRICS_PATH = PROJECT_ROOT / "reports" / "spark_model_metrics.json"
MODEL_DIR = PROJECT_ROOT / "models" / "spark_menu_classifier"
TEST_SIZE = 0.3
LATENCY_REPEATS = 5

CLASS_NAMES = {
    0: "Profit Driver",
    1: "Volume Driver",
    2: "Hidden Opportunity",
    3: "Low Performer",
}

FEATURE_COLS = [
    "profit_percentage", "total_quantity_sold",
    "avg_rating", "wastage_percentage",
    "promotion_dependency", "weekend_ratio",
    "repeat_purchase_rate", "rating_trend",
    "contribution_margin", "total_revenue"
]


def load_features(spark):
    df = spark.read.csv(str(FEATURES_PATH), header=True, inferSchema=True)
    return df.fillna(0)


def create_labels(df):
    """Same rule-based labels as python_pipeline/models.py: percentile-based
    Volume Driver band, evaluated in Profit Driver -> Volume Driver ->
    Hidden Opportunity -> Low Performer priority order."""
    # Exact, linearly interpolated percentiles (same definition as pandas)
    row = df.agg(
        F.expr("percentile(total_quantity_sold, 0.5)").alias("median_qty"),
        F.expr("percentile(profit_percentage, 0.25)").alias("p25_profit"),
        F.expr("percentile(profit_percentage, 0.60)").alias("p60_profit"),
    ).first()
    median_qty, p25_profit, p60_profit = row["median_qty"], row["p25_profit"], row["p60_profit"]

    df = df.withColumn(
        "label",
        F.when(
            (F.col("profit_percentage") > 50)
            & (F.col("total_quantity_sold") > median_qty)
            & (F.col("wastage_percentage") < 20),
            0,
        )
        .when(
            (F.col("total_quantity_sold") > median_qty * 0.7)
            & (F.col("profit_percentage") >= p25_profit)
            & (F.col("profit_percentage") <= p60_profit),
            1,
        )
        .when(
            (F.col("profit_percentage") > 50)
            & (F.col("total_quantity_sold") <= median_qty)
            & (F.col("avg_rating") >= 4.0),
            2,
        )
        .otherwise(3)
        .cast(DoubleType()),
    )
    return df, median_qty, p25_profit, p60_profit


def stratified_split(df):
    """Same rule as python_pipeline/models.py: within each class, order items
    by a Knuth hash of item_id and send the first floor(n*0.3+0.5) to test."""
    key = (F.col("item_id").cast("long") * F.lit(2654435761)) % F.lit(4294967296)
    by_class = Window.partitionBy("label")
    return (
        df.withColumn("_rank", F.row_number().over(by_class.orderBy(key)) - 1)
        .withColumn("_n", F.count("*").over(by_class))
        .withColumn("is_test", F.col("_rank") < F.floor(F.col("_n") * TEST_SIZE + 0.5))
        .drop("_rank", "_n")
    )


def confusion(pred_df, label_col, labels):
    counts = {(int(r[label_col]), int(r["prediction"])): r["count"]
              for r in pred_df.groupBy(label_col, "prediction").count().collect()}
    return [[counts.get((a, p), 0) for p in labels] for a in labels]


def metrics_from_confusion(cm):
    """Accuracy and macro precision / recall / F1 from a confusion matrix."""
    per_class = []
    for i in range(len(cm)):
        tp = cm[i][i]
        predicted = sum(row[i] for row in cm)
        support = sum(cm[i])
        precision = tp / predicted if predicted else 0.0
        recall = tp / support if support else 0.0
        f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0
        per_class.append({"precision": round(precision, 4), "recall": round(recall, 4),
                          "f1": round(f1, 4), "support": support})
    total = sum(sum(row) for row in cm)
    n = len(per_class)
    return {
        "accuracy": round(sum(cm[i][i] for i in range(n)) / total, 4) if total else 0.0,
        "precision": round(sum(c["precision"] for c in per_class) / n, 4),
        "recall": round(sum(c["recall"] for c in per_class) / n, 4),
        "f1_score": round(sum(c["f1"] for c in per_class) / n, 4),
    }, per_class


def measure_latency(model, test_df):
    timings = []
    n = test_df.count()
    for _ in range(LATENCY_REPEATS):
        started = time.perf_counter()
        model.transform(test_df).select("prediction").collect()
        timings.append((time.perf_counter() - started) * 1000)
    batch_ms = statistics.median(timings)
    return {"batch_ms": round(batch_ms, 3), "per_record_ms": round(batch_ms / n, 4)}


def evaluate_model(model, train, test, label_col, labels, class_names):
    test_pred = model.transform(test)
    cm = confusion(test_pred, label_col, labels)
    test_metrics, per_class = metrics_from_confusion(cm)
    weighted_f1 = MulticlassClassificationEvaluator(
        labelCol=label_col, predictionCol="prediction", metricName="f1").evaluate(test_pred)
    train_metrics, _ = metrics_from_confusion(confusion(model.transform(train), label_col, labels))
    latency = measure_latency(model, test)
    return {
        **test_metrics,
        "weighted_f1": round(weighted_f1, 4),
        "train": train_metrics,
        "per_class": dict(zip(class_names, per_class)),
        "confusion_matrix": cm,
        "prediction_latency_ms": latency["batch_ms"],
        "latency_per_record_ms": latency["per_record_ms"],
    }


def main():
    print("=" * 48)
    print("DineIQ - Spark MLlib Pipeline")
    print("=" * 48)

    METRICS_PATH.parent.mkdir(parents=True, exist_ok=True)
    spark = create_spark_session("DineIQ_MLlib")

    with track_job("spark_ml_models", spark) as job:
        df = load_features(spark)
        df, median_qty, p25_profit, p60_profit = create_labels(df)
        df = df.withColumn("is_profit_driver", F.when(F.col("label") == 0, 1.0).otherwise(0.0))

        total_items = df.count()
        print(f"Dataset: {total_items} menu items")
        print(f"Features: {len(FEATURE_COLS)}")
        print(f"Classes: {len(CLASS_NAMES)}")

        label_counts = {row["label"]: row["count"] for row in df.groupBy("label").count().collect()}
        print("\nLabel Distribution:")
        for class_id, name in CLASS_NAMES.items():
            print(f"  {name + ':':<20}{label_counts.get(float(class_id), 0):>3} items")

        labels = sorted(int(k) for k in label_counts)
        class_names = [CLASS_NAMES[c] for c in labels]

        # Feature vector + stratified 70/30 split
        df_assembled = VectorAssembler(inputCols=FEATURE_COLS, outputCol="features").transform(stratified_split(df))
        df_assembled = df_assembled.cache()
        train = df_assembled.where(~F.col("is_test"))
        test = df_assembled.where(F.col("is_test"))
        train_size, test_size = train.count(), test.count()
        print(f"\nTrain/test split: {train_size} / {test_size} items (70/30, stratified)")

        models = {}
        fitted = {}

        rf = RandomForestClassifier(labelCol="label", featuresCol="features", numTrees=100, maxDepth=5, seed=42)
        fitted["Random Forest"] = rf.fit(train)
        models["Random Forest"] = evaluate_model(fitted["Random Forest"], train, test, "label", labels, class_names)

        lr = LogisticRegression(labelCol="label", featuresCol="features", maxIter=100, regParam=0.01, family="multinomial")
        fitted["Logistic Regression"] = lr.fit(train)
        models["Logistic Regression"] = evaluate_model(fitted["Logistic Regression"], train, test, "label", labels, class_names)

        # GBT: binary task only, reported separately and not eligible as best model
        gbt_model = GBTClassifier(labelCol="is_profit_driver", featuresCol="features", seed=42).fit(train)
        gbt_metrics = evaluate_model(gbt_model, train, test, "is_profit_driver", [0, 1],
                                     ["Other", "Profit Driver"])
        gbt_metrics["note"] = "Binary classification only (Profit Driver vs rest)"

        best_label = max(models, key=lambda name: models[name]["f1_score"])
        best_model = fitted[best_label]
        trained_at = datetime.now()
        model_version = f"spark-menu-{trained_at:%Y%m%d-%H%M%S}"
        best_model.write().overwrite().save(str(MODEL_DIR))

        full_pred = best_model.transform(df_assembled).withColumn(
            "max_prob", F.round(F.array_max(vector_to_array(F.col("probability"))), 2))
        class_map = F.create_map([F.lit(x) for pair in CLASS_NAMES.items() for x in (float(pair[0]), pair[1])])
        output = full_pred.select(
            "item_id",
            "item_name",
            class_map[F.col("label")].alias("actual_class"),
            class_map[F.col("prediction")].alias("spark_class"),
            F.col("max_prob").alias("spark_probability"),
            F.lit(best_label).alias("model_used"),
            F.lit(model_version).alias("model_version"),
            F.when(F.col("is_test"), "test").otherwise("train").alias("split"),
        ).orderBy("item_id")
        output.toPandas().to_csv(OUTPUT_PATH, index=False)

        metrics = {
            "pipeline": "spark",
            "platform": f"Apache Spark MLlib {spark.version}",
            "task": "Menu performance classification (4 classes)",
            "model_version": model_version,
            "trained_at": trained_at.isoformat(timespec="seconds"),
            "train_test_split": "70/30",
            "split_method": "stratified by class, deterministic item_id hash",
            "train_size": train_size,
            "test_size": test_size,
            "features": FEATURE_COLS,
            "classes": class_names,
            "best_model": best_label,
            "best_f1": models[best_label]["f1_score"],
            "models": models,
            "gbt_binary": gbt_metrics,
            "saved_model_path": str(MODEL_DIR.relative_to(PROJECT_ROOT)),
        }
        METRICS_PATH.write_text(json.dumps(metrics, indent=2))
        job.set_records(processed=total_items, output=total_items)
        job.add_metric("best_model", best_label)
        job.add_metric("best_macro_f1", models[best_label]["f1_score"])

        print("\nModel Results (test set):")
        print(f"{'Model':<21}| {'Accuracy':<9}| {'Prec':<5}| {'Recall':<6}| {'F1':<5}| Latency")
        print("─" * 64)
        for name, m in list(models.items()) + [("GBT (binary)", gbt_metrics)]:
            print(f"{name:<21}| {m['accuracy']*100:>6.1f}%  | {m['precision']:.2f} | {m['recall']:.2f}  "
                  f"| {m['f1_score']:.2f} | {m['prediction_latency_ms']:.1f} ms")
        print(f"\nBest Model: {best_label} (macro F1: {models[best_label]['f1_score']:.2f})  version {model_version}")
        print(f"\nSaved: {OUTPUT_PATH.name}, {METRICS_PATH.name}, {MODEL_DIR.name}/")
        print("=" * 48)

    spark.stop()


if __name__ == "__main__":
    main()
