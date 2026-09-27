"""
DineIQ Analytics - Spark MLlib Pipeline (independent of Python pipeline)

Menu Performance Classification into 4 classes:
  0 Profit Driver, 1 Volume Driver, 2 Hidden Opportunity, 3 Low Performer

Trains Random Forest, Gradient Boosted Trees (binary: Profit Driver vs rest)
and multinomial Logistic Regression with Spark MLlib, picks the best of the
two directly-comparable multiclass models (RF / LogReg) by macro F1, and
classifies every menu item with it. Same label rules and feature set as
python_pipeline/models.py, so results are cross-validated against it.

Run from anywhere:  python spark_jobs/spark_ml_models.py
Reads from  <project root>/processed_data/features/menu_item_features.csv
Writes to   <project root>/processed_data/spark_menu_classifications.csv
            <project root>/reports/spark_model_metrics.json
"""

from pyspark.sql import SparkSession
from pyspark.ml.feature import VectorAssembler, StringIndexer
from pyspark.ml.classification import (
    RandomForestClassifier,
    GBTClassifier,
    LogisticRegression
)
from pyspark.ml.evaluation import MulticlassClassificationEvaluator
from pyspark.ml.functions import vector_to_array
from pyspark.sql import functions as F
from pyspark.sql.types import *
from pathlib import Path
from datetime import datetime
import json

PROJECT_ROOT = Path(__file__).resolve().parent.parent
FEATURES_PATH = PROJECT_ROOT / "processed_data" / "features" / "menu_item_features.csv"
OUTPUT_PATH = PROJECT_ROOT / "processed_data" / "spark_menu_classifications.csv"
METRICS_PATH = PROJECT_ROOT / "reports" / "spark_model_metrics.json"

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


def create_spark_session():
    spark = (
        SparkSession.builder
        .master("local[2]")
        .config("spark.driver.memory", "4g")
        .config("spark.sql.shuffle.partitions", "8")
        .appName("DineIQ_MLlib")
        .getOrCreate()
    )
    spark.sparkContext.setLogLevel("ERROR")
    return spark


def load_features(spark):
    df = spark.read.csv(str(FEATURES_PATH), header=True, inferSchema=True)
    return df.fillna(0)


def create_labels(df):
    """Same rule-based labels as python_pipeline/models.py: percentile-based
    Volume Driver band, evaluated in Profit Driver -> Volume Driver ->
    Hidden Opportunity -> Low Performer priority order."""
    median_qty = df.approxQuantile("total_quantity_sold", [0.5], 0.01)[0]
    p25_profit = df.approxQuantile("profit_percentage", [0.25], 0.01)[0]
    p60_profit = df.approxQuantile("profit_percentage", [0.60], 0.01)[0]

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


def main():
    print("=" * 48)
    print("DineIQ - Spark MLlib Pipeline")
    print("=" * 48)

    METRICS_PATH.parent.mkdir(parents=True, exist_ok=True)

    spark = create_spark_session()
    df = load_features(spark)
    df, median_qty, p25_profit, p60_profit = create_labels(df)
    df = df.withColumn(
        "is_profit_driver",
        F.when(F.col("label") == 0, 1.0).otherwise(0.0),
    )

    total_items = df.count()
    print(f"Dataset: {total_items} menu items")
    print(f"Features: {len(FEATURE_COLS)}")
    print(f"Classes: {len(CLASS_NAMES)}")

    label_counts = {row["label"]: row["count"] for row in df.groupBy("label").count().collect()}
    print("\nLabel Distribution:")
    for class_id, name in CLASS_NAMES.items():
        print(f"  {name + ':':<20}{label_counts.get(float(class_id), 0):>3} items")

    # STEP 4 - feature vector
    assembler = VectorAssembler(inputCols=FEATURE_COLS, outputCol="features")
    df_assembled = assembler.transform(df)

    # STEP 5 - train/test split
    train, test = df_assembled.randomSplit([0.7, 0.3], seed=42)

    metrics = {}

    # STEP 6.1 - Random Forest (multiclass)
    rf = RandomForestClassifier(
        labelCol="label", featuresCol="features",
        numTrees=100, maxDepth=5, seed=42,
    )
    rf_model = rf.fit(train)
    rf_test_pred = rf_model.transform(test)

    f1_eval = MulticlassClassificationEvaluator(labelCol="label", predictionCol="prediction", metricName="f1")
    acc_eval = MulticlassClassificationEvaluator(labelCol="label", predictionCol="prediction", metricName="accuracy")

    metrics["random_forest"] = {
        "accuracy": round(acc_eval.evaluate(rf_test_pred), 4),
        "f1": round(f1_eval.evaluate(rf_test_pred), 4),
    }

    # STEP 6.2 - GBT (binary: Profit Driver vs rest — GBTClassifier has no
    # multiclass support in Spark MLlib, so it is trained/evaluated on its own
    # binary task and reported separately, not compared against RF/LogReg).
    gbt = GBTClassifier(labelCol="is_profit_driver", featuresCol="features", seed=42)
    gbt_model = gbt.fit(train)
    gbt_test_pred = gbt_model.transform(test)
    gbt_acc_eval = MulticlassClassificationEvaluator(labelCol="is_profit_driver", predictionCol="prediction", metricName="accuracy")
    gbt_f1_eval = MulticlassClassificationEvaluator(labelCol="is_profit_driver", predictionCol="prediction", metricName="f1")
    gbt_metrics = {
        "accuracy": round(gbt_acc_eval.evaluate(gbt_test_pred), 4),
        "f1": round(gbt_f1_eval.evaluate(gbt_test_pred), 4),
        "task": "binary: Profit Driver vs rest",
    }

    # STEP 6.3 - Logistic Regression (multiclass)
    lr = LogisticRegression(
        labelCol="label", featuresCol="features",
        maxIter=100, regParam=0.01, family="multinomial",
    )
    lr_model = lr.fit(train)
    lr_test_pred = lr_model.transform(test)
    metrics["logistic_regression"] = {
        "accuracy": round(acc_eval.evaluate(lr_test_pred), 4),
        "f1": round(f1_eval.evaluate(lr_test_pred), 4),
    }

    # STEP 8 - best model among the two directly-comparable multiclass models
    best_name = max(metrics, key=lambda name: metrics[name]["f1"])
    best_label = "Random Forest" if best_name == "random_forest" else "Logistic Regression"
    best_model = rf_model if best_name == "random_forest" else lr_model

    full_pred = best_model.transform(df_assembled)
    full_pred = full_pred.withColumn("max_prob", F.round(F.array_max(vector_to_array(F.col("probability"))), 2))

    class_name_udf = F.create_map([F.lit(x) for pair in CLASS_NAMES.items() for x in (float(pair[0]), pair[1])])

    output = full_pred.select(
        "item_id",
        "item_name",
        class_name_udf[F.col("label")].alias("actual_class"),
        class_name_udf[F.col("prediction")].alias("spark_class"),
        F.col("max_prob").alias("spark_probability"),
        F.lit(best_label).alias("model_used"),
    ).orderBy("item_id")

    # STEP 8 - save classifications
    output.toPandas().to_csv(OUTPUT_PATH, index=False)

    # STEP 9 - save metrics
    metrics["best_model"] = best_label
    metrics["best_f1"] = metrics[best_name]["f1"]
    metrics["gbt_binary"] = gbt_metrics
    metrics["trained_at"] = datetime.now().isoformat()
    with open(METRICS_PATH, "w") as f:
        json.dump(metrics, f, indent=2)

    # STEP 10 - report
    print("\nModel Results:")
    print(f"{'Model':<21}| {'Accuracy':<9}| F1-Score")
    print("─" * 41)
    print(f"{'Random Forest':<21}| {metrics['random_forest']['accuracy']*100:>6.1f}%  | {metrics['random_forest']['f1']:.2f}")
    print(f"{'Logistic Regression':<21}| {metrics['logistic_regression']['accuracy']*100:>6.1f}%  | {metrics['logistic_regression']['f1']:.2f}")
    print(f"{'GBT (binary)':<21}| {gbt_metrics['accuracy']*100:>6.1f}%  | {gbt_metrics['f1']:.2f}  (Profit Driver vs rest — not compared above)")

    print(f"\nBest Model: {best_label} (F1: {metrics['best_f1']:.2f})")

    print("\nSample Classifications (first 5):")
    print(f"{'item_name':<24}| {'spark_class':<20}| prob")
    print("─" * 51)
    sample = output.limit(5).toPandas()
    for _, row in sample.iterrows():
        print(f"{row['item_name']:<24}| {row['spark_class']:<20}| {row['spark_probability']:.2f}")

    print(f"\nSaved: {OUTPUT_PATH.name}")
    print(f"Saved: {METRICS_PATH.name}")
    print("=" * 48)

    spark.stop()


if __name__ == "__main__":
    main()
