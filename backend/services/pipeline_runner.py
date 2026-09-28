"""
Runs the Spark and Python pipeline scripts on the server, one after another,
for the Admin "Pipeline Runner" page (POST /api/admin/run-pipeline).

Each script runs as its own subprocess with the same Python interpreter as
the API, from the project root. Output is captured line by line so the page
can show live logs; the full log of every run is also written to
reports/pipeline_runs/<run_id>.log.

Only one run can be active at a time. State lives in this process, so run
the API with a single uvicorn worker (the default).
"""

import os
import subprocess
import sys
import threading
import time
import uuid
from collections import deque
from datetime import datetime

from settings import PROJECT_ROOT, REPORTS

LOG_DIR = REPORTS / "pipeline_runs"
STEP_TIMEOUT_SECONDS = 45 * 60
LOG_TAIL_LINES = 300
# Spark/log4j chatter that adds nothing to the live view (still kept in the log file)
NOISE = ("WARN ", "log4j", "setLogLevel", "FutureWarning", "require_minimum_pandas_version",
         "Using incubator modules", "NativeCodeLoader")

PRESETS = {
    # The scripts requested for the runner, in dependency order
    "core": [
        "spark_jobs/ingestion.py",
        "spark_jobs/data_quality.py",
        "spark_jobs/cleaning.py",
        "spark_jobs/feature_engineering.py",
        "spark_jobs/spark_ml_models.py",
        "python_pipeline/models.py",
        "python_pipeline/comparison.py",
    ],
    # One pipeline on its own ("Execute Spark" / "Execute Python" buttons). They
    # train on the features already prepared by the Core/Full run, then refresh
    # the Spark vs Python comparison.
    "spark": [
        "spark_jobs/spark_ml_models.py",
        "spark_jobs/spark_customer_segmentation.py",
        "python_pipeline/comparison.py",
    ],
    "python": [
        "python_pipeline/models.py",
        "python_pipeline/customer_segmentation.py",
        "python_pipeline/comparison.py",
    ],
    # Everything the dashboards read
    "full": [
        "spark_jobs/ingestion.py",
        "spark_jobs/data_quality.py",
        "spark_jobs/cleaning.py",
        "spark_jobs/feature_engineering.py",
        "spark_jobs/spark_sql_analytics.py",
        "spark_jobs/spark_ml_models.py",
        "python_pipeline/models.py",
        "spark_jobs/spark_customer_segmentation.py",
        "python_pipeline/customer_segmentation.py",
        "python_pipeline/comparison.py",
        "python_pipeline/demand_forecasting.py",
        "python_pipeline/market_basket.py",
        "python_pipeline/price_sensitivity.py",
        "python_pipeline/promotion_analysis.py",
    ],
}

_lock = threading.Lock()
_current = None       # the run in progress, or the most recent one
_process = None       # Popen of the step that is running right now


def _now():
    return datetime.now().isoformat(timespec="seconds")


def _new_run(preset, user_email):
    return {
        "run_id": uuid.uuid4().hex[:10],
        "preset": preset,
        "status": "queued",           # queued | running | success | failed | cancelled
        "started_by": user_email,
        "started_at": _now(),
        "finished_at": None,
        "duration_seconds": None,
        "cancel_requested": False,
        "steps": [
            {
                "script": script,
                "engine": "Spark" if script.startswith("spark_jobs/") else "Python",
                "status": "pending",   # pending | running | success | failed | skipped | cancelled
                "started_at": None,
                "finished_at": None,
                "duration_seconds": None,
                "exit_code": None,
                "log": deque(maxlen=LOG_TAIL_LINES),
            }
            for script in PRESETS[preset]
        ],
    }


def start_run(preset, user_email):
    """Registers a new run. Returns (run, None) or (None, reason) if one is already active."""
    global _current
    if preset not in PRESETS:
        return None, f"Unknown preset '{preset}'. Use one of: {', '.join(PRESETS)}"
    with _lock:
        if _current and _current["status"] in ("queued", "running"):
            return None, f"Run {_current['run_id']} is still in progress"
        _current = _new_run(preset, user_email)
        return _current, None


def cancel_run():
    with _lock:
        if not _current or _current["status"] not in ("queued", "running"):
            return False
        _current["cancel_requested"] = True
        if _process and _process.poll() is None:
            _process.terminate()
        return True


def snapshot():
    """JSON-safe copy of the current / last run."""
    with _lock:
        if not _current:
            return None
        run = {k: v for k, v in _current.items() if k != "steps"}
        run["steps"] = [{**s, "log": list(s["log"])} for s in _current["steps"]]
    # Elapsed time computed here, on the server clock, so the browser's timezone doesn't matter
    now = datetime.now()
    for step in run["steps"]:
        if step["status"] == "running" and step["started_at"]:
            step["duration_seconds"] = round((now - datetime.fromisoformat(step["started_at"])).total_seconds(), 1)
    if run["status"] in ("queued", "running"):
        run["duration_seconds"] = round((now - datetime.fromisoformat(run["started_at"])).total_seconds(), 1)
    done = sum(s["status"] == "success" for s in run["steps"])
    run["progress_pct"] = round(done / len(run["steps"]) * 100)
    return run


def execute(run):
    """Runs every step of `run` in order. Called as a FastAPI background task."""
    global _process
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    run_started = time.perf_counter()
    env = {**os.environ, "PYTHONUNBUFFERED": "1"}
    with _lock:
        run["status"] = "running"

    with open(LOG_DIR / f"{run['run_id']}.log", "w") as log_file:
        log_file.write(f"Run {run['run_id']} ({run['preset']}) started {run['started_at']} by {run['started_by']}\n")
        for step in run["steps"]:
            if run["cancel_requested"]:
                step["status"] = "cancelled"
                continue

            step_started = time.perf_counter()
            with _lock:
                step["status"] = "running"
                step["started_at"] = _now()
            log_file.write(f"\n===== {step['script']} =====\n")

            try:
                proc = subprocess.Popen(
                    [sys.executable, step["script"]], cwd=PROJECT_ROOT, env=env,
                    stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, bufsize=1,
                )
                with _lock:
                    _process = proc
                timer = threading.Timer(STEP_TIMEOUT_SECONDS, proc.kill)
                timer.start()
                for line in proc.stdout:
                    log_file.write(line)
                    line = line.rstrip()
                    if line and not any(n in line for n in NOISE):
                        with _lock:
                            step["log"].append(line)
                exit_code = proc.wait()
                timer.cancel()
            except Exception as exc:  # e.g. script missing
                exit_code = -1
                step["log"].append(f"Could not start {step['script']}: {exc}")

            with _lock:
                _process = None
                step["exit_code"] = exit_code
                step["finished_at"] = _now()
                step["duration_seconds"] = round(time.perf_counter() - step_started, 1)
                if run["cancel_requested"]:
                    step["status"] = "cancelled"
                elif exit_code == 0:
                    step["status"] = "success"
                else:
                    step["status"] = "failed"
                    step["log"].append(f"Exited with code {exit_code}. Remaining steps skipped.")

            if step["status"] == "failed":
                for later in run["steps"]:
                    if later["status"] == "pending":
                        later["status"] = "skipped"
                break

        with _lock:
            statuses = {s["status"] for s in run["steps"]}
            run["status"] = ("cancelled" if run["cancel_requested"]
                             else "failed" if "failed" in statuses else "success")
            run["finished_at"] = _now()
            run["duration_seconds"] = round(time.perf_counter() - run_started, 1)
        log_file.write(f"\nRun finished: {run['status']} in {run['duration_seconds']}s\n")
