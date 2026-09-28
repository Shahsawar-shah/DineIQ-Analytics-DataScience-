"""
Dual-pipeline comparison API (SRS Steps 14 and 47).

Both result sets are produced independently (Spark MLlib vs Python) and
compared by python_pipeline/comparison.py; this router only serves them.
"""

from fastapi import APIRouter, Depends, Query

from middleware.auth_middleware import require_analytics
from routes.common import REPORTS, read_csv, read_json, records

router = APIRouter(dependencies=[Depends(require_analytics)])


@router.get("/summary")
def get_summary():
    return read_json(REPORTS / "dual_pipeline_summary.json")


@router.get("/customers")
def get_customer_comparison(
    status: str = Query("all", pattern="^(all|match|mismatch)$"),
    segment: str | None = Query(None),
    limit: int = Query(200, ge=1, le=5000),
    offset: int = Query(0, ge=0),
):
    df = read_csv(REPORTS / "dual_pipeline_comparison.csv")
    if status == "match":
        df = df[df["match"]]
    elif status == "mismatch":
        df = df[~df["match"]]
    if segment:
        df = df[(df["spark_result"] == segment) | (df["python_result"] == segment)]
    return {
        "total": int(len(df)),
        "offset": offset,
        "limit": limit,
        "records": records(df.iloc[offset:offset + limit]),
    }


@router.get("/menu")
def get_menu_comparison(split: str = Query("all", pattern="^(all|train|test)$")):
    df = read_csv(REPORTS / "menu_classification_comparison.csv")
    if split != "all":
        df = df[df["split"] == split]
    return {"total": int(len(df)), "records": records(df)}
