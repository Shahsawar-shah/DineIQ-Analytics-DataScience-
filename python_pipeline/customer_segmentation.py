"""
DineIQ Analytics - Customer Segmentation, Python side of the dual pipeline

Independent of Spark: builds the same RFM behaviour features from
orders_clean.csv with pandas, fits scikit-learn StandardScaler + KMeans
(k=5) on the training customers and assigns every customer to a segment.
No Spark output is read here.

Split and segment-naming rules are the same as in
spark_jobs/spark_customer_segmentation.py (see that docstring).

Run from anywhere:  python python_pipeline/customer_segmentation.py
Writes  processed_data/python_customer_segments.csv
        reports/python_segmentation_metrics.json
        models/python_customer_kmeans.pkl
"""

import json
import time
from datetime import datetime
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

PROJECT_ROOT = Path(__file__).resolve().parent.parent
ORDERS_PATH = PROJECT_ROOT / "processed_data" / "orders_clean.csv"
OUTPUT_PATH = PROJECT_ROOT / "processed_data" / "python_customer_segments.csv"
METRICS_PATH = PROJECT_ROOT / "reports" / "python_segmentation_metrics.json"
MODEL_PATH = PROJECT_ROOT / "models" / "python_customer_kmeans.pkl"

K = 5
SEED = 42
SILHOUETTE_SAMPLE = 10000

RAW_FEATURES = ["recency_days", "frequency", "monetary_value", "avg_order_value", "promo_order_ratio"]
MODEL_FEATURES = ["log_recency", "log_frequency", "log_monetary", "log_aov", "promo_order_ratio"]
NAMING_ORDER = [
    ("High-Value Loyal", "monetary_value"),
    ("At-Risk", "recency_days"),
    ("Promotion-Driven", "promo_order_ratio"),
    ("Frequent", "frequency"),
]


def build_features():
    orders = pd.read_csv(ORDERS_PATH, parse_dates=["order_date"])
    orders = orders[~orders["is_cancelled"].astype(bool)]
    ref_date = orders["order_date"].max()
    customers = orders.groupby("customer_id").agg(
        last_order_date=("order_date", "max"),
        frequency=("order_id", "nunique"),
        monetary_value=("total_amount", "sum"),
        promo_order_ratio=("promotion_id", lambda s: s.notna().mean()),
    ).reset_index()
    customers["customer_id"] = customers["customer_id"].astype(int)
    customers["recency_days"] = (ref_date - customers["last_order_date"]).dt.days
    customers["avg_order_value"] = customers["monetary_value"] / customers["frequency"]
    customers["log_recency"] = np.log1p(customers["recency_days"])
    customers["log_frequency"] = np.log1p(customers["frequency"])
    customers["log_monetary"] = np.log1p(customers["monetary_value"])
    customers["log_aov"] = np.log1p(customers["avg_order_value"])
    customers["split"] = np.where(customers["customer_id"] % 10 < 7, "train", "test")
    return customers


def name_clusters(train):
    profile = train.groupby("cluster")[RAW_FEATURES].mean()
    remaining = profile.copy()
    names = {}
    for name, metric in NAMING_ORDER:
        cluster = remaining[metric].idxmax()
        names[cluster] = name
        remaining = remaining.drop(index=cluster)
    for cluster in remaining.index:
        names[cluster] = "Occasional"
    return names, profile.round(3)


def main():
    print("=" * 48)
    print("DineIQ - Python Customer Segmentation (K-Means)")
    print("=" * 48)

    customers = build_features()
    train = customers[customers["split"] == "train"]
    print(f"Customers with orders: {len(customers):,}  (train {len(train):,} / test {len(customers) - len(train):,})")

    model = make_pipeline(StandardScaler(), KMeans(n_clusters=K, n_init=10, random_state=SEED))
    model.fit(train[MODEL_FEATURES])

    started = time.perf_counter()
    customers["cluster"] = model.predict(customers[MODEL_FEATURES])
    latency_ms = (time.perf_counter() - started) * 1000

    scaled = model[:-1].transform(customers[MODEL_FEATURES])
    distances = model[-1].transform(scaled)
    sorted_d = np.sort(distances, axis=1)

    names, profile = name_clusters(customers[customers["split"] == "train"])
    test_mask = (customers["split"] == "test").to_numpy()
    test_silhouette = silhouette_score(
        scaled[test_mask], customers.loc[test_mask, "cluster"],
        sample_size=min(SILHOUETTE_SAMPLE, int(test_mask.sum())), random_state=SEED)

    trained_at = datetime.now()
    model_version = f"python-kmeans-{trained_at:%Y%m%d-%H%M%S}"
    joblib.dump(model, MODEL_PATH)

    output = pd.DataFrame({
        "customer_id": customers["customer_id"],
        "split": customers["split"],
        "python_cluster": customers["cluster"],
        "python_segment": customers["cluster"].map(names),
        "python_distance": sorted_d[:, 0].round(4),
        "python_margin": (sorted_d[:, 1] - sorted_d[:, 0]).round(4),
        "model_version": model_version,
    }).sort_values("customer_id")
    output.to_csv(OUTPUT_PATH, index=False)

    sizes = output["python_segment"].value_counts().to_dict()
    METRICS_PATH.write_text(json.dumps({
        "pipeline": "python",
        "platform": "scikit-learn",
        "algorithm": "StandardScaler + KMeans (k-means++, n_init=10)",
        "k": K,
        "model_version": model_version,
        "trained_at": trained_at.isoformat(timespec="seconds"),
        "features": MODEL_FEATURES,
        "train_size": int(len(train)),
        "test_size": int(test_mask.sum()),
        "test_silhouette": round(float(test_silhouette), 4),
        "prediction_latency_ms": round(latency_ms, 1),
        "segment_sizes": {k: int(v) for k, v in sizes.items()},
        "segment_profiles": {names[c]: row.to_dict() for c, row in profile.iterrows()},
    }, indent=2))

    print(f"Test silhouette: {test_silhouette:.3f}")
    print("Segment sizes:", sizes)
    print(f"Saved: {OUTPUT_PATH.name}, {METRICS_PATH.name}  version {model_version}")


if __name__ == "__main__":
    main()
