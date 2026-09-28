"""
Shared file access for the API routes.

Pipeline outputs are read from processed_data/ and reports/ and cached in
memory until the file changes on disk, so re-running a pipeline is picked
up without restarting the API. A missing file becomes a 503 that tells the
user which pipeline to run (SRS lxiv, understandable errors).
"""

import json
import threading
from pathlib import Path

import pandas as pd
from fastapi import HTTPException

from settings import FEATURES, PROCESSED, REPORTS  # noqa: F401  (re-exported for routes)

_cache = {}
_lock = threading.Lock()

# file name -> command that produces it
PRODUCERS = {
    "forecast_results.json": "python python_pipeline/demand_forecasting.py",
    "basket_results.json": "python python_pipeline/market_basket.py",
    "price_sensitivity.json": "python python_pipeline/price_sensitivity.py",
    "promotion_analysis.json": "python python_pipeline/promotion_analysis.py",
    "dual_pipeline_summary.json": "python python_pipeline/comparison.py",
    "dual_pipeline_comparison.csv": "python python_pipeline/comparison.py",
    "menu_classification_comparison.csv": "python python_pipeline/comparison.py",
    "spark_model_metrics.json": "python spark_jobs/spark_ml_models.py",
    "python_model_metrics.json": "python python_pipeline/models.py",
    "spark_segmentation_metrics.json": "python spark_jobs/spark_customer_segmentation.py",
    "python_segmentation_metrics.json": "python python_pipeline/customer_segmentation.py",
    "cleaning_summary.json": "python spark_jobs/cleaning.py",
    "data_quality_report.json": "python spark_jobs/data_quality.py",
    "spark_jobs.json": "any Spark job in spark_jobs/",
}


def _missing(path: Path):
    producer = PRODUCERS.get(path.name, "the data pipeline (see README)")
    raise HTTPException(
        status_code=503,
        detail=f"{path.name} has not been generated yet. Run: {producer}")


def _cached(path: Path, loader):
    if not path.exists():
        _missing(path)
    mtime = path.stat().st_mtime
    with _lock:
        hit = _cache.get(path)
        if hit and hit[0] == mtime:
            return hit[1]
    value = loader(path)
    with _lock:
        _cache[path] = (mtime, value)
    return value


def read_csv(path: Path, **kwargs) -> pd.DataFrame:
    """Cached CSV read. Returns a copy so callers can modify it freely."""
    key_path = path if not kwargs else Path(f"{path}::{sorted(kwargs.items())}")

    def loader(_):
        return pd.read_csv(path, **kwargs)

    if not path.exists():
        _missing(path)
    mtime = path.stat().st_mtime
    with _lock:
        hit = _cache.get(key_path)
    if hit and hit[0] == mtime:
        return hit[1].copy()
    df = loader(path)
    with _lock:
        _cache[key_path] = (mtime, df)
    return df.copy()


def read_json(path: Path):
    return _cached(path, lambda p: json.loads(p.read_text()))


def records(df: pd.DataFrame):
    """DataFrame -> JSON-safe list of dicts (NaN becomes null)."""
    return json.loads(df.to_json(orient="records", date_format="iso"))
