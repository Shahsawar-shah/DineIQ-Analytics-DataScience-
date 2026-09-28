"""
DineIQ Analytics - Python ML Pipeline (independent of Spark)

Menu Performance Classification into 4 classes:
  0 Profit Driver, 1 Volume Driver, 2 Hidden Opportunity, 3 Low Performer

Trains XGBoost, Random Forest, and Decision Tree on a stratified 70/30
split, picks the best by macro F1, and classifies every menu item with it.

For every model it records accuracy, macro precision / recall / F1,
per-class metrics, the test confusion matrix and prediction latency, and
stamps the run with a model version.

Run from anywhere:  python python_pipeline/models.py
Reads from  <project root>/processed_data/features/menu_item_features.csv
Writes to   <project root>/models/, <project root>/processed_data/
            <project root>/reports/python_model_metrics.json
"""

import json
import time
from datetime import datetime
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score, confusion_matrix, f1_score, precision_recall_fscore_support,
    precision_score, recall_score,
)
from sklearn.preprocessing import LabelEncoder
from sklearn.tree import DecisionTreeClassifier
from xgboost import XGBClassifier

PROJECT_ROOT = Path(__file__).resolve().parent.parent
FEATURES_PATH = PROJECT_ROOT / "processed_data" / "features" / "menu_item_features.csv"
MODELS_DIR = PROJECT_ROOT / "models"
PROCESSED_DATA_DIR = PROJECT_ROOT / "processed_data"
METRICS_PATH = PROJECT_ROOT / "reports" / "python_model_metrics.json"
TEST_SIZE = 0.3
LATENCY_REPEATS = 20

CLASS_NAMES = {
    0: "Profit Driver",
    1: "Volume Driver",
    2: "Hidden Opportunity",
    3: "Low Performer",
}

FEATURE_COLUMNS = [
    "profit_percentage", "total_quantity_sold", "avg_rating", "wastage_percentage",
    "promotion_dependency", "weekend_ratio", "repeat_purchase_rate", "rating_trend",
    "contribution_margin", "total_revenue",
]


# ---------------------------------------------------------------------------
# STEP 1: rule-based labels
# ---------------------------------------------------------------------------
def label_item(row, median_quantity, profit_low, profit_high):
    if (
        row["profit_percentage"] > 50
        and row["total_quantity_sold"] > median_quantity
        and row["wastage_percentage"] < 20
    ):
        return 0  # Profit Driver

    if (
        row["total_quantity_sold"] > (median_quantity * 0.7)
        and profit_low <= row["profit_percentage"] <= profit_high
    ):
        return 1  # Volume Driver

    if (
        row["profit_percentage"] > 50
        and row["total_quantity_sold"] <= median_quantity
        and row["avg_rating"] >= 4.0
    ):
        return 2  # Hidden Opportunity

    if (
        row["profit_percentage"] < 30
        or row["wastage_percentage"] > 35
        or (row["avg_rating"] < 3.0 and row["total_quantity_sold"] < median_quantity)
    ):
        return 3  # Low Performer

    return 3  # Default: Low Performer


def create_labels(df):
    median_quantity = df["total_quantity_sold"].median()
    # Volume Driver band is the lower-middle slice of the margin distribution
    # (decent sales, not top-tier margin). Percentile-based so it adapts to
    # wherever this dataset's margins actually cluster, instead of a fixed
    # band that can miss the data entirely.
    profit_low = df["profit_percentage"].quantile(0.25)
    profit_high = df["profit_percentage"].quantile(0.60)
    return df.apply(
        label_item, axis=1,
        median_quantity=median_quantity, profit_low=profit_low, profit_high=profit_high,
    )


# ---------------------------------------------------------------------------
# STEP 2: deterministic stratified 70/30 split
# ---------------------------------------------------------------------------
def split_key(item_ids):
    """Knuth multiplicative hash of item_id — spark_ml_models.py computes the
    same key, so both pipelines hold out exactly the same unseen items."""
    return (item_ids.astype("int64") * 2654435761) % 4294967296


def stratified_split(df, label_col, test_size=TEST_SIZE):
    """Within each class, the items with the smallest hash key go to test:
    floor(n * test_size + 0.5) of them."""
    rank = df.assign(_key=split_key(df["item_id"])).groupby(label_col)["_key"].rank(method="first") - 1
    n_test = df.groupby(label_col)[label_col].transform("size").mul(test_size).add(0.5).floordiv(1)
    return rank < n_test


# ---------------------------------------------------------------------------
# STEP 3/4: train + evaluate
# ---------------------------------------------------------------------------
def measure_latency(model, X):
    """Median wall time of predict() on the whole test set, over several runs."""
    timings = []
    for _ in range(LATENCY_REPEATS):
        started = time.perf_counter()
        model.predict(X)
        timings.append((time.perf_counter() - started) * 1000)
    batch_ms = float(np.median(timings))
    return {"batch_ms": round(batch_ms, 3), "per_record_ms": round(batch_ms / len(X), 4)}


def evaluate(y_true, y_pred, labels):
    return {
        "accuracy": round(accuracy_score(y_true, y_pred), 4),
        "precision": round(precision_score(y_true, y_pred, labels=labels, average="macro", zero_division=0), 4),
        "recall": round(recall_score(y_true, y_pred, labels=labels, average="macro", zero_division=0), 4),
        "f1_score": round(f1_score(y_true, y_pred, labels=labels, average="macro", zero_division=0), 4),
        "weighted_f1": round(f1_score(y_true, y_pred, labels=labels, average="weighted", zero_division=0), 4),
    }


def train_and_evaluate(X_train, X_test, y_train, y_test, num_classes):
    labels = list(range(num_classes))
    models = {
        "XGBoost": XGBClassifier(
            n_estimators=100, max_depth=4, random_state=42,
            eval_metric="mlogloss", num_class=num_classes,
        ),
        "Random Forest": RandomForestClassifier(n_estimators=100, random_state=42),
        "Decision Tree": DecisionTreeClassifier(max_depth=5, random_state=42),
    }

    results = {}
    for name, model in models.items():
        try:
            model.fit(X_train, y_train)
        except Exception as e:
            print(f"  {name} error: {e}")
            continue
        y_pred = model.predict(X_test)
        test_metrics = evaluate(y_test, y_pred, labels)
        precision, recall, f1, support = precision_recall_fscore_support(
            y_test, y_pred, labels=labels, zero_division=0)
        results[name] = {
            "model": model,
            "accuracy": test_metrics["accuracy"],
            "f1": test_metrics["f1_score"],
            "test": test_metrics,
            "train": evaluate(y_train, model.predict(X_train), labels),
            "per_class": [
                {"precision": round(float(p), 4), "recall": round(float(r), 4),
                 "f1": round(float(f), 4), "support": int(s)}
                for p, r, f, s in zip(precision, recall, f1, support)
            ],
            "confusion_matrix": confusion_matrix(y_test, y_pred, labels=labels).tolist(),
            "latency": measure_latency(model, X_test),
        }

    return results


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    print("=" * 48)
    print("DineIQ - Python ML Pipeline")
    print("=" * 48)

    MODELS_DIR.mkdir(parents=True, exist_ok=True)

    df = pd.read_csv(FEATURES_PATH)
    df[FEATURE_COLUMNS] = df[FEATURE_COLUMNS].fillna(0)

    df["actual_class"] = create_labels(df)

    print(f"Dataset: {len(df)} menu items")
    print(f"Features: {len(FEATURE_COLUMNS)}")
    print(f"Classes: {len(CLASS_NAMES)}")

    print("\nLabel Distribution:")
    counts = df["actual_class"].value_counts().sort_index()
    for class_id, name in CLASS_NAMES.items():
        print(f"  {name + ':':<20}{counts.get(class_id, 0):>3} items")

    unique_classes = sorted(df["actual_class"].unique())
    num_classes = len(unique_classes)

    X = df[FEATURE_COLUMNS]

    # Remap labels to consecutive integers so XGBoost sees a dense class range
    # even when a class (e.g. Volume Driver) is sparse or absent from a split.
    le = LabelEncoder()
    y = le.fit_transform(df["actual_class"])

    is_test = stratified_split(df, "actual_class")
    X_train, X_test = X[~is_test], X[is_test]
    y_train, y_test = y[~is_test.to_numpy()], y[is_test.to_numpy()]
    print(f"\nTrain/test split: {len(X_train)} / {len(X_test)} items (70/30, stratified)")

    results = train_and_evaluate(X_train, X_test, y_train, y_test, num_classes)

    print("\nModel Comparison (test set):")
    print(f"{'Model':<16}{'Accuracy':<10}{'Precision':<11}{'Recall':<9}{'F1':<7}Latency")
    print("-" * 62)
    for name, res in results.items():
        t = res["test"]
        print(f"{name:<16}{t['accuracy'] * 100:>6.1f}%   {t['precision']:<11.2f}{t['recall']:<9.2f}"
              f"{t['f1_score']:<7.2f}{res['latency']['batch_ms']:.2f} ms")

    best_name = max(results, key=lambda name: results[name]["f1"])
    best_model = results[best_name]["model"]
    trained_at = datetime.now()
    model_version = f"python-menu-{trained_at:%Y%m%d-%H%M%S}"
    print(f"\nBest Model: {best_name} (macro F1: {results[best_name]['f1']:.2f})  version {model_version}")

    # STEP 5: save models
    joblib.dump(best_model, MODELS_DIR / "python_best_model.pkl")
    joblib.dump(results["XGBoost"]["model"], MODELS_DIR / "python_xgboost.pkl")
    joblib.dump(results["Random Forest"]["model"], MODELS_DIR / "python_rf.pkl")

    # STEP 6: classify all items with the best model
    predictions = best_model.predict(X)
    probabilities = best_model.predict_proba(X)

    predictions_original = le.inverse_transform(predictions)

    output = pd.DataFrame({
        "item_id": df["item_id"],
        "item_name": df["item_name"],
        "actual_class": df["actual_class"].map(CLASS_NAMES),
        "python_class": pd.Series(predictions_original).map(CLASS_NAMES),
        "python_probability": probabilities.max(axis=1).round(2),
        "model_used": best_name,
        "model_version": model_version,
        "split": np.where(is_test, "test", "train"),
    })
    output_path = PROCESSED_DATA_DIR / "python_menu_classifications.csv"
    output.to_csv(output_path, index=False)

    # STEP 7: metrics report read by /api/dashboard/ml-metrics
    class_names = [CLASS_NAMES[c] for c in le.classes_]
    METRICS_PATH.parent.mkdir(parents=True, exist_ok=True)
    METRICS_PATH.write_text(json.dumps({
        "pipeline": "python",
        "platform": "scikit-learn / XGBoost",
        "task": "Menu performance classification (4 classes)",
        "model_version": model_version,
        "trained_at": trained_at.isoformat(timespec="seconds"),
        "train_test_split": "70/30",
        "split_method": "stratified by class, deterministic item_id hash",
        "train_size": int(len(X_train)),
        "test_size": int(len(X_test)),
        "features": FEATURE_COLUMNS,
        "classes": class_names,
        "best_model": best_name,
        "models": {
            name: {
                **res["test"],
                "train": res["train"],
                "per_class": dict(zip(class_names, res["per_class"])),
                "confusion_matrix": res["confusion_matrix"],
                "prediction_latency_ms": res["latency"]["batch_ms"],
                "latency_per_record_ms": res["latency"]["per_record_ms"],
            }
            for name, res in results.items()
        },
    }, indent=2))

    print("\nSample Classifications:")
    print(f"{'item_name':<22}| {'class':<18}| prob")
    print("-" * 47)
    for _, row in output.head(5).iterrows():
        print(f"{row['item_name']:<22}| {row['python_class']:<18}| {row['python_probability']:.2f}")

    print(f"\nSaved: {output_path.name}, {METRICS_PATH.name}")
    print("=" * 48)


if __name__ == "__main__":
    main()
