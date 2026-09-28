"""
Shared helpers for the DineIQ Spark jobs:

  create_spark_session()  - local Spark session with the project defaults
  read_csv()              - CSV load with an explicit schema
  write_single_csv()      - write a DataFrame as ONE csv file (what the API reads)
  track_job()             - records every job run in reports/spark_jobs.json,
                            which /api/admin/spark-jobs serves to the
                            System Monitoring page
"""

import json
import os
import shutil
import traceback
import uuid
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path

from pyspark.sql import SparkSession

PROJECT_ROOT = Path(__file__).resolve().parent.parent
RAW_DATA_DIR = PROJECT_ROOT / "raw_data"
PROCESSED_DATA_DIR = PROJECT_ROOT / "processed_data"
FEATURES_DIR = PROCESSED_DATA_DIR / "features"
PARQUET_DATA_DIR = PROJECT_ROOT / "parquet_data"
REPORTS_DIR = PROJECT_ROOT / "reports"
JOBS_LOG_PATH = REPORTS_DIR / "spark_jobs.json"
MAX_JOB_HISTORY = 200

CSV_TIMESTAMP_FORMAT = "yyyy-MM-dd HH:mm:ss"
CSV_DATE_FORMAT = "yyyy-MM-dd"


def create_spark_session(app_name):
    spark = (
        SparkSession.builder
        .appName(app_name)
        .master(os.getenv("SPARK_MASTER", "local[*]"))
        .config("spark.driver.memory", os.getenv("SPARK_DRIVER_MEMORY", "4g"))
        .config("spark.sql.shuffle.partitions", "8")
        .config("spark.sql.session.timeZone", "UTC")
        .config("spark.ui.showConsoleProgress", "false")
        # Local mode: bind the driver to loopback so startup never depends on how
        # the machine's hostname resolves (it failed on macOS and warns on the VPS)
        .config("spark.driver.bindAddress", os.getenv("SPARK_DRIVER_BIND_ADDRESS", "127.0.0.1"))
        .config("spark.driver.host", os.getenv("SPARK_DRIVER_HOST", "127.0.0.1"))
        .getOrCreate()
    )
    spark.sparkContext.setLogLevel("ERROR")
    return spark


def read_csv(spark, path, schema):
    return spark.read.csv(
        str(path),
        schema=schema,
        header=True,
        timestampFormat=CSV_TIMESTAMP_FORMAT,
        dateFormat=CSV_DATE_FORMAT,
        nullValue="",
        mode="PERMISSIVE",
    )


def write_single_csv(df, path):
    """Spark writes a directory of part files; the API and the Python
    pipeline expect one file, so coalesce to a single part and move it."""
    path = Path(path)
    tmp_dir = path.parent / f".{path.stem}_spark_tmp"
    (
        df.coalesce(1).write.mode("overwrite")
        .option("header", True)
        .option("timestampFormat", CSV_TIMESTAMP_FORMAT)
        .option("dateFormat", CSV_DATE_FORMAT)
        .csv(str(tmp_dir))
    )
    part = next(tmp_dir.glob("part-*.csv"))
    shutil.move(str(part), str(path))
    shutil.rmtree(tmp_dir, ignore_errors=True)


def _load_jobs():
    if JOBS_LOG_PATH.exists():
        try:
            return json.loads(JOBS_LOG_PATH.read_text())
        except json.JSONDecodeError:
            return []
    return []


def _save_jobs(jobs):
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    JOBS_LOG_PATH.write_text(json.dumps(jobs[-MAX_JOB_HISTORY:], indent=2))


def _upsert_job(record):
    jobs = [j for j in _load_jobs() if j.get("job_id") != record["job_id"]]
    jobs.append(record)
    _save_jobs(jobs)


class JobRun:
    """Handle passed to the job body so it can report record counts."""

    def __init__(self, record):
        self.record = record

    def set_records(self, processed=None, output=None):
        if processed is not None:
            self.record["records_processed"] = int(processed)
        if output is not None:
            self.record["records_output"] = int(output)

    def add_metric(self, key, value):
        self.record.setdefault("metrics", {})[key] = value


@contextmanager
def track_job(job_name, spark=None):
    record = {
        "job_id": uuid.uuid4().hex[:12],
        "job_name": job_name,
        "status": "running",
        "started_at": datetime.now().isoformat(timespec="seconds"),
        "finished_at": None,
        "duration_seconds": None,
        "records_processed": None,
        "records_output": None,
        "spark_version": spark.version if spark is not None else None,
        "error": None,
    }
    _upsert_job(record)
    started = datetime.now()
    run = JobRun(record)
    try:
        yield run
        record["status"] = "success"
    except Exception as exc:
        record["status"] = "failed"
        record["error"] = f"{type(exc).__name__}: {exc}"
        record["traceback"] = traceback.format_exc(limit=5)
        raise
    finally:
        record["finished_at"] = datetime.now().isoformat(timespec="seconds")
        record["duration_seconds"] = round((datetime.now() - started).total_seconds(), 2)
        _upsert_job(record)
