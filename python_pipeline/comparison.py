"""
DineIQ Analytics - Dual-Pipeline Result Verification (SRS Step 14 / 47)

Compares results that the Spark MLlib pipeline and the Python pipeline
produced independently. Nothing is trained or predicted here: this script
only reads each pipeline's saved output.

Task 1 - Menu performance classification (150 items, 45 unseen test items)
    spark_menu_classifications.csv  vs  python_menu_classifications.csv
Task 2 - Customer segmentation, K-Means (all ~19.7k unseen test customers)
    spark_customer_segments.csv     vs  python_customer_segments.csv

Run from anywhere:  python python_pipeline/comparison.py
Writes  reports/menu_classification_comparison.csv
        reports/dual_pipeline_comparison.csv   (customer task, test split)
        reports/dual_pipeline_summary.json
"""

import json
from datetime import datetime
from pathlib import Path

import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parent.parent
PROCESSED = PROJECT_ROOT / "processed_data"
FEATURES = PROCESSED / "features"
REPORTS = PROJECT_ROOT / "reports"

# A customer whose nearest and second-nearest centroid are this close (in
# standardised units) sits on a cluster boundary in that pipeline.
BOUNDARY_MARGIN = 0.25


def pct(part, whole):
    return round(part / whole * 100, 2) if whole else 0.0


# ---------------------------------------------------------------------------
# Task 1: menu classification
# ---------------------------------------------------------------------------
def explain_menu(row):
    if row["match"]:
        return ""
    correct = []
    if row["spark_result"] == row["actual_class"]:
        correct.append("Spark matches the rule-based label")
    if row["python_result"] == row["actual_class"]:
        correct.append("Python matches the rule-based label")
    verdict = "; ".join(correct) if correct else "neither pipeline matches the rule-based label"
    low_conf = min(row["spark_probability"], row["python_probability"]) < 0.6
    reason = (
        "low confidence in at least one model: the item sits near a class threshold"
        if low_conf else
        "different model families (Spark Logistic Regression is linear; the Python tree model splits on thresholds)"
    )
    return f"{verdict}; {reason}"


def compare_menu():
    spark = pd.read_csv(PROCESSED / "spark_menu_classifications.csv")
    python = pd.read_csv(PROCESSED / "python_menu_classifications.csv")
    df = spark.merge(python, on="item_id", suffixes=("_spark", "_python"))

    out = pd.DataFrame({
        "record_id": df["item_id"],
        "item_name": df["item_name_spark"],
        "split": df["split_spark"],
        "actual_class": df["actual_class_spark"],
        "spark_result": df["spark_class"],
        "python_result": df["python_class"],
        "spark_probability": df["spark_probability"],
        "python_probability": df["python_probability"],
    })
    out["match"] = out["spark_result"] == out["python_result"]
    out["probability_difference"] = (out["spark_probability"] - out["python_probability"]).abs().round(2)
    out["spark_correct"] = out["spark_result"] == out["actual_class"]
    out["python_correct"] = out["python_result"] == out["actual_class"]
    out["final_consistency_status"] = out.apply(
        lambda r: "Consistent" if r["match"] else "Inconsistent", axis=1)
    out["explanation"] = out.apply(explain_menu, axis=1)
    out.to_csv(REPORTS / "menu_classification_comparison.csv", index=False)

    test = out[out["split"] == "test"]
    return out, {
        "task": "Menu performance classification",
        "spark_model": f"{spark['model_used'].iloc[0]} ({spark['model_version'].iloc[0]})",
        "python_model": f"{python['model_used'].iloc[0]} ({python['model_version'].iloc[0]})",
        "total_records": int(len(out)),
        "agreement_count": int(out["match"].sum()),
        "disagreement_count": int((~out["match"]).sum()),
        "agreement_pct": pct(out["match"].sum(), len(out)),
        "test_records": int(len(test)),
        "test_agreement_pct": pct(test["match"].sum(), len(test)),
        "spark_test_accuracy_pct": pct(test["spark_correct"].sum(), len(test)),
        "python_test_accuracy_pct": pct(test["python_correct"].sum(), len(test)),
        "mean_probability_difference": round(float(out["probability_difference"].mean()), 3),
    }


# ---------------------------------------------------------------------------
# Task 2: customer segmentation
# ---------------------------------------------------------------------------
def explain_customer(row):
    if row["match"]:
        return ""
    spark_edge = row["spark_margin"] < BOUNDARY_MARGIN
    python_edge = row["python_margin"] < BOUNDARY_MARGIN
    if spark_edge or python_edge:
        side = "both pipelines" if spark_edge and python_edge else ("Spark" if spark_edge else "Python")
        return (f"Boundary customer: nearest/second-nearest centroid margin is small in {side} "
                f"(Spark {row['spark_margin']:.2f}, Python {row['python_margin']:.2f}), so slightly "
                "different centroids flip the assignment")
    return ("Centroid placement differs: Spark uses k-means|| initialisation and a sample-std scaler, "
            "scikit-learn uses k-means++ with 10 restarts and a population-std scaler")


def compare_customers():
    spark = pd.read_csv(PROCESSED / "spark_customer_segments.csv")
    python = pd.read_csv(PROCESSED / "python_customer_segments.csv")
    features = pd.read_csv(FEATURES / "customer_features.csv",
                           usecols=["customer_id", "generator_segment", "recency_days", "frequency", "monetary_value"])

    df = (
        spark.merge(python, on=["customer_id", "split"], suffixes=("_spark", "_python"))
        .merge(features, on="customer_id", how="left")
    )
    test = df[df["split"] == "test"].copy()

    out = pd.DataFrame({
        "record_id": test["customer_id"],
        "actual_segment": test["generator_segment"],
        "spark_result": test["spark_segment"],
        "python_result": test["python_segment"],
        "spark_distance": test["spark_distance"],
        "python_distance": test["python_distance"],
        "spark_margin": test["spark_margin"],
        "python_margin": test["python_margin"],
        "recency_days": test["recency_days"],
        "frequency": test["frequency"],
        "monetary_value": test["monetary_value"].round(2),
    })
    out["match"] = out["spark_result"] == out["python_result"]
    out["numerical_difference"] = (out["spark_distance"] - out["python_distance"]).abs().round(4)
    out["final_consistency_status"] = out["match"].map({True: "Consistent", False: "Inconsistent"})
    out["explanation"] = out.apply(explain_customer, axis=1)
    out = out.sort_values("record_id")
    out.to_csv(REPORTS / "dual_pipeline_comparison.csv", index=False)

    spark_metrics = json.loads((REPORTS / "spark_segmentation_metrics.json").read_text())
    python_metrics = json.loads((REPORTS / "python_segmentation_metrics.json").read_text())
    per_segment = (
        out.groupby("spark_result")["match"].agg(["size", "sum"])
        .assign(agreement_pct=lambda t: (t["sum"] / t["size"] * 100).round(2))
        .rename(columns={"size": "records", "sum": "matches"})
    )
    crosstab = pd.crosstab(out["spark_result"], out["python_result"])
    return out, {
        "task": "Customer segmentation (K-Means, k=5)",
        "spark_model": spark_metrics["model_version"],
        "python_model": python_metrics["model_version"],
        "test_records": int(len(out)),
        "agreement_count": int(out["match"].sum()),
        "disagreement_count": int((~out["match"]).sum()),
        "agreement_pct": pct(out["match"].sum(), len(out)),
        "mean_numerical_difference": round(float(out["numerical_difference"].mean()), 4),
        "boundary_disagreements": int(out.loc[~out["match"], "explanation"].str.startswith("Boundary").sum()),
        "spark_test_silhouette": spark_metrics["test_silhouette"],
        "python_test_silhouette": python_metrics["test_silhouette"],
        "silhouette_note": ("Spark ClusteringEvaluator uses squared Euclidean distance, scikit-learn "
                            "silhouette_score uses Euclidean distance, so the two values are not directly comparable"),
        "per_segment": per_segment.reset_index().rename(columns={"spark_result": "segment"}).to_dict(orient="records"),
        "segment_crosstab": {
            "rows_spark": crosstab.index.tolist(),
            "cols_python": crosstab.columns.tolist(),
            "counts": crosstab.values.tolist(),
        },
    }


def main():
    REPORTS.mkdir(parents=True, exist_ok=True)
    print("=" * 48)
    print("DineIQ - Dual Pipeline Comparison")
    print("=" * 48)

    _, menu_summary = compare_menu()
    _, customer_summary = compare_customers()

    summary = {
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "menu_classification": menu_summary,
        "customer_segmentation": customer_summary,
    }
    (REPORTS / "dual_pipeline_summary.json").write_text(json.dumps(summary, indent=2))

    print(f"Menu classification: {menu_summary['agreement_pct']}% agreement on {menu_summary['total_records']} items "
          f"({menu_summary['test_agreement_pct']}% on {menu_summary['test_records']} unseen test items)")
    print(f"Customer segmentation: {customer_summary['agreement_pct']}% agreement on "
          f"{customer_summary['test_records']:,} unseen customers "
          f"({customer_summary['disagreement_count']:,} disagreements)")
    print("Saved: menu_classification_comparison.csv, dual_pipeline_comparison.csv, dual_pipeline_summary.json")


if __name__ == "__main__":
    main()
