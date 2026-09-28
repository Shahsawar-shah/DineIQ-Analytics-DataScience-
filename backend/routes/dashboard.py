from fastapi import APIRouter, Depends, HTTPException

from middleware.auth_middleware import require_analytics
from routes.common import FEATURES, PROCESSED, REPORTS, read_csv, read_json

router = APIRouter(dependencies=[Depends(require_analytics)])

ACTIVE_WINDOW_DAYS = 90


def _optional_json(name):
    try:
        return read_json(REPORTS / name)
    except HTTPException:
        return None


@router.get("/summary")
def get_summary():
    """Executive KPIs (SRS Step 42) — every number is computed from the
    processed data or read from a pipeline report."""
    menu = read_csv(FEATURES / "menu_item_features.csv")
    customers = read_csv(FEATURES / "customer_features.csv")
    orders = read_csv(PROCESSED / "orders_clean.csv", usecols=["order_id", "total_amount", "is_cancelled"])
    classifications = read_csv(PROCESSED / "python_menu_classifications.csv")
    wastage = read_csv(PROCESSED / "wastage_clean.csv", usecols=["wastage_cost"])

    completed = orders[~orders["is_cancelled"].astype(bool)]
    total_profit = float((menu["contribution_margin"] * menu["total_quantity_sold"]).sum())
    ordering = customers[customers["frequency"].notna()]

    cleaning = _optional_json("cleaning_summary.json") or {}
    forecast = _optional_json("forecast_results.json")
    forecast_next_7 = None
    if forecast:
        forecast_next_7 = round(sum(p["forecast"] for p in forecast["series"]["overall"]["all"]["future"][:7]), 0)
    python_metrics = _optional_json("python_model_metrics.json")
    spark_metrics = _optional_json("spark_model_metrics.json")

    return {
        "total_revenue": round(float(menu["total_revenue"].sum()), 2),
        "total_profit": round(total_profit, 2),
        "total_orders": int(len(completed)),
        "cancelled_orders": int(len(orders) - len(completed)),
        "avg_order_value": round(float(completed["total_amount"].mean()), 2),
        "total_customers": int(len(customers)),
        "active_customers": int((ordering["recency_days"] <= ACTIVE_WINDOW_DAYS).sum()),
        "repeat_customers": int((ordering["frequency"] >= 2).sum()),
        "at_risk_customers": int(customers["churn_at_risk"].fillna(False).astype(bool).sum()),
        "avg_rating": round(float(menu["avg_rating"].mean()), 2),
        "avg_profit_percentage": round(float(menu["profit_percentage"].mean()), 2),
        "total_wastage_records": int(len(wastage)),
        "total_wastage_cost": round(float(wastage["wastage_cost"].sum()), 2),
        "avg_wastage_percentage": round(float(menu["wastage_percentage"].mean()), 2),
        "forecast_units_next_7_days": forecast_next_7,
        "menu_classifications": classifications["python_class"].value_counts().to_dict(),
        "records_processed": cleaning.get("original"),
        "records_cleaned": cleaning.get("clean"),
        "records_removed": cleaning.get("removed"),
        "records_quarantined": cleaning.get("quarantined"),
        "data_quality_score": cleaning.get("data_quality_score"),
        "ml_pipeline": {
            "python": {
                "best_model": python_metrics["best_model"],
                "accuracy": python_metrics["models"][python_metrics["best_model"]]["accuracy"],
                "f1_score": python_metrics["models"][python_metrics["best_model"]]["f1_score"],
                "model_version": python_metrics["model_version"],
            } if python_metrics else None,
            "spark": {
                "best_model": spark_metrics["best_model"],
                "accuracy": spark_metrics["models"][spark_metrics["best_model"]]["accuracy"],
                "f1_score": spark_metrics["models"][spark_metrics["best_model"]]["f1_score"],
                "model_version": spark_metrics["model_version"],
            } if spark_metrics else None,
        },
    }


def _pipeline_block(metrics, extra_models=None):
    models = dict(metrics["models"])
    if extra_models:
        models.update(extra_models)
    return {
        "platform": metrics["platform"],
        "task": metrics["task"],
        "model_version": metrics["model_version"],
        "trained_at": metrics["trained_at"],
        "train_test_split": metrics["train_test_split"],
        "split_method": metrics["split_method"],
        "train_size": metrics["train_size"],
        "test_size": metrics["test_size"],
        "features": metrics["features"],
        "best_model": metrics["best_model"],
        "classes": metrics["classes"],
        "models": models,
    }


@router.get("/ml-metrics")
def get_ml_metrics():
    """Real evaluation results written by the two training pipelines."""
    python_metrics = read_json(REPORTS / "python_model_metrics.json")
    spark_metrics = read_json(REPORTS / "spark_model_metrics.json")
    comparison = read_json(REPORTS / "dual_pipeline_summary.json")
    menu = comparison["menu_classification"]
    customers = comparison["customer_segmentation"]

    return {
        "python_pipeline": _pipeline_block(python_metrics),
        "spark_pipeline": _pipeline_block(spark_metrics, {"GBT (binary)": spark_metrics["gbt_binary"]}),
        "comparison": {
            "task": menu["task"],
            "total_items": menu["total_records"],
            "agreement_count": menu["agreement_count"],
            "different_count": menu["disagreement_count"],
            "agreement_pct": menu["agreement_pct"],
            "test_items": menu["test_records"],
            "test_agreement_pct": menu["test_agreement_pct"],
        },
        "customer_comparison": {
            "task": customers["task"],
            "test_records": customers["test_records"],
            "agreement_count": customers["agreement_count"],
            "different_count": customers["disagreement_count"],
            "agreement_pct": customers["agreement_pct"],
        },
        "generated_at": comparison["generated_at"],
    }
