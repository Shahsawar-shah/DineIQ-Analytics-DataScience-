"""
Admin-only API: audit trail (SRS lxiii) and Spark job monitoring (SRS lxv).
"""

from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query

from middleware.auth_middleware import require_admin
from models.audit import fetch_audit_logs
from routes.common import REPORTS, read_json

router = APIRouter(dependencies=[Depends(require_admin)])

STALE_AFTER = timedelta(hours=6)


@router.get("/audit-logs")
def get_audit_logs(
    limit: int = Query(200, ge=1, le=1000),
    event_type: str | None = Query(None),
    q: str | None = Query(None, max_length=100),
):
    try:
        return fetch_audit_logs(limit=limit, event_type=event_type, search=q)
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Audit log database unavailable: {exc}")


@router.get("/spark-jobs")
def get_spark_jobs(limit: int = Query(50, ge=1, le=200)):
    now = datetime.now()
    jobs = []
    for job in read_json(REPORTS / "spark_jobs.json"):
        job = dict(job)  # never mutate the cached file contents
        if job["status"] == "running" and now - datetime.fromisoformat(job["started_at"]) > STALE_AFTER:
            job["status"] = "stale"  # process died without recording an end time
        jobs.append(job)
    jobs.sort(key=lambda j: j["started_at"], reverse=True)

    latest = {}
    for job in jobs:
        latest.setdefault(job["job_name"], job)

    finished = [j for j in jobs if j["status"] in ("success", "failed")]
    return {
        "total_runs": len(jobs),
        "successful_runs": sum(j["status"] == "success" for j in jobs),
        "failed_runs": sum(j["status"] == "failed" for j in jobs),
        "running": sum(j["status"] == "running" for j in jobs),
        "success_rate_pct": round(sum(j["status"] == "success" for j in finished) / len(finished) * 100, 1)
        if finished else None,
        "total_records_processed": sum(j.get("records_processed") or 0 for j in latest.values()),
        "latest_by_job": list(latest.values()),
        "runs": jobs[:limit],
    }
