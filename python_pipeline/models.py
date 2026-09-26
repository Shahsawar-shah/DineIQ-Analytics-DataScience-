"""
DineIQ Analytics - Python ML Pipeline (independent of Spark)

Menu Performance Classification into 4 classes:
  0 Profit Driver, 1 Volume Driver, 2 Hidden Opportunity, 3 Low Performer

Trains XGBoost, Random Forest, and Decision Tree, picks the best by
macro F1, and classifies every menu item with it.

Run from anywhere:  python python_pipeline/models.py
Reads from  <project root>/processed_data/features/menu_item_features.csv
Writes to   <project root>/models/ and <project root>/processed_data/
"""

from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.tree import DecisionTreeClassifier
from xgboost import XGBClassifier

PROJECT_ROOT = Path(__file__).resolve().parent.parent
FEATURES_PATH = PROJECT_ROOT / "processed_data" / "features" / "menu_item_features.csv"
MODELS_DIR = PROJECT_ROOT / "models"
PROCESSED_DATA_DIR = PROJECT_ROOT / "processed_data"

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
# STEP 3/4: train + evaluate
# ---------------------------------------------------------------------------
def train_and_evaluate(X_train, X_test, y_train, y_test, num_classes):
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
        accuracy = accuracy_score(y_test, y_pred)
        f1 = f1_score(y_test, y_pred, average="macro")
        cm = confusion_matrix(y_test, y_pred)
        results[name] = {"model": model, "accuracy": accuracy, "f1": f1, "confusion_matrix": cm}

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

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    results = train_and_evaluate(X_train, X_test, y_train, y_test, num_classes)

    print("\nModel Comparison:")
    print(f"{'Model':<16}{'Accuracy':<10}{'F1-Score'}")
    print("-" * 37)
    for name, res in results.items():
        print(f"{name:<16}{res['accuracy'] * 100:>6.1f}%    {res['f1']:.2f}")

    best_name = max(results, key=lambda name: results[name]["f1"])
    best_model = results[best_name]["model"]
    print(f"\nBest Model: {best_name} (F1: {results[best_name]['f1']:.2f})")

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
    })
    output_path = PROCESSED_DATA_DIR / "python_menu_classifications.csv"
    output.to_csv(output_path, index=False)

    print("\nSample Classifications:")
    print(f"{'item_name':<22}| {'class':<18}| prob")
    print("-" * 47)
    for _, row in output.head(5).iterrows():
        print(f"{row['item_name']:<22}| {row['python_class']:<18}| {row['python_probability']:.2f}")

    print(f"\nSaved: {output_path.name}")
    print("=" * 48)


if __name__ == "__main__":
    main()
