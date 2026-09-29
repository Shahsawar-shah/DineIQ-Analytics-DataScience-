#!/usr/bin/env bash
# DineIQ — full data workflow: raw -> clean -> features -> ML -> Power BI mart
# Usage (VPS, project root):  bash powerbi/refresh_bi.sh            # rebuild mart only
#                             bash powerbi/refresh_bi.sh --full     # regenerate everything
# Needs PG_PASSWORD in env or in .env
set -euo pipefail
cd "$(dirname "$0")/.."
[ -f .env ] && set -a && . ./.env && set +a

if [[ "${1:-}" == "--full" ]]; then
  python data_generator/generate_dataset.py
  python spark_jobs/data_quality.py
  python spark_jobs/cleaning.py
  python spark_jobs/feature_engineering.py
  python python_pipeline/models.py
fi
python powerbi/load_to_postgres.py
