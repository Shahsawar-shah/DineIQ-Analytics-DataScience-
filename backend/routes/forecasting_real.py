"""
Demand forecasting API (SRS Steps 20-22, 46).

Serves reports/forecast_results.json produced by
python_pipeline/demand_forecasting.py. The forecast horizon is configurable
per request (1 to the pipeline's max horizon).
"""

from fastapi import APIRouter, Depends, HTTPException, Query

from middleware.auth_middleware import require_analytics
from routes.common import REPORTS, read_json

router = APIRouter(dependencies=[Depends(require_analytics)])

LEVELS = ("overall", "category", "location", "item")


def _results():
    return read_json(REPORTS / "forecast_results.json")


def _series(level: str, entity_id: str):
    data = _results()
    if level not in LEVELS:
        raise HTTPException(status_code=400, detail=f"level must be one of {', '.join(LEVELS)}")
    level_series = data["series"].get(level, {})
    if level == "overall":
        entity_id = "all"
    if entity_id is None:
        raise HTTPException(status_code=400, detail=f"entity_id is required for level '{level}'")
    series = level_series.get(str(entity_id))
    if series is None:
        raise HTTPException(status_code=404, detail=f"No forecast for {level} '{entity_id}'")
    return data, series


@router.get("/entities")
def list_entities(level: str = Query("item")):
    data = _results()
    if level not in LEVELS:
        raise HTTPException(status_code=400, detail=f"level must be one of {', '.join(LEVELS)}")
    return [
        {"entity_id": k, "name": v["name"], "best_model": v["best_model"]}
        for k, v in sorted(data["series"][level].items(), key=lambda kv: kv[1]["name"])
    ]


@router.get("/demand")
def get_demand_forecast(
    level: str = Query("overall"),
    entity_id: str | None = Query(None),
    horizon: int = Query(30, ge=1),
):
    data, series = _series(level, entity_id)
    max_horizon = data["max_horizon_days"]
    if horizon > max_horizon:
        raise HTTPException(status_code=400, detail=f"horizon must be between 1 and {max_horizon} days")
    future = series["future"][:horizon]
    best = series["metrics"][series["best_model"]]
    return {
        "level": series["level"],
        "entity_id": series["entity_id"],
        "name": series["name"],
        "horizon_days": horizon,
        "max_horizon_days": max_horizon,
        "model_version": data["model_version"],
        "best_model": series["best_model"],
        "best_model_metrics": best,
        "improvement_vs_naive_pct": series["improvement_vs_naive_pct"],
        "beats_baseline": series["beats_baseline"],
        "train_period": series["train_period"],
        "test_period": series["test_period"],
        "history": series["history"],
        "test": series["test"],
        "future": future,
        "forecast_total": round(sum(p["forecast"] for p in future), 1),
        "high_risk_days": [p for p in future if p["high_risk"]],
        "high_risk_threshold": series["high_risk_threshold"],
        "validation": data["validation"],
        "note": "Forecast values are model estimates, not actual results.",
    }


@router.get("/metrics")
def get_forecast_metrics(level: str = Query("overall")):
    data = _results()
    if level not in LEVELS:
        raise HTTPException(status_code=400, detail=f"level must be one of {', '.join(LEVELS)}")
    rows = []
    for entity_id, s in data["series"][level].items():
        best = s["metrics"][s["best_model"]]
        naive = s["metrics"][data["baseline"]]
        rows.append({
            "entity_id": entity_id,
            "name": s["name"],
            "best_model": s["best_model"],
            "mae": best["mae"],
            "rmse": best["rmse"],
            "mape": best["mape"],
            "r2": best["r2"],
            "naive_mae": naive["mae"],
            "improvement_vs_naive_pct": s["improvement_vs_naive_pct"],
            "beats_baseline": s["beats_baseline"],
            "all_models": s["metrics"],
        })
    rows.sort(key=lambda r: r["name"])
    return {
        "level": level,
        "models": data["models"],
        "baseline": data["baseline"],
        "validation": data["validation"],
        "generated_at": data["generated_at"],
        "series": rows,
    }


@router.get("/comparison")
def get_model_comparison():
    """How each model does against the naive baseline, per level."""
    data = _results()
    overall = data["series"]["overall"]["all"]
    by_level = {}
    for level in LEVELS:
        series = list(data["series"][level].values())
        wins = {m: 0 for m in data["models"]}
        for s in series:
            wins[min(s["metrics"], key=lambda m: s["metrics"][m]["mae"])] += 1
        improvements = [s["improvement_vs_naive_pct"] for s in series if s["improvement_vs_naive_pct"] is not None]
        by_level[level] = {
            "series": len(series),
            "best_model_beats_baseline": sum(s["beats_baseline"] for s in series),
            "lowest_mae_counts": wins,
            "avg_improvement_vs_naive_pct": round(sum(improvements) / len(improvements), 2) if improvements else None,
        }
    return {
        "baseline": data["baseline"],
        "models": data["models"],
        "overall": {
            "metrics": overall["metrics"],
            "best_model": overall["best_model"],
            "improvement_vs_naive_pct": overall["improvement_vs_naive_pct"],
            "train_period": overall["train_period"],
            "test_period": overall["test_period"],
        },
        "by_level": by_level,
        "validation": data["validation"],
        "model_version": data["model_version"],
    }
