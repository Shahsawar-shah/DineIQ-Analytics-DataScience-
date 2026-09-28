# AI Tool Usage Declaration

Declared as required by SRS §1.8 (items 13–16) and §1.10 (16).

All restaurant analytics, predictions, classifications, forecasts and recommendations in DineIQ are produced by the project's own Spark, Python and application code at run time. **No external generative-AI API is called by the application.**

---

## Tool

| | |
|---|---|
| Tool | Claude (Anthropic), used through Claude Code in VS Code |
| Period | Throughout development, including the final submission-day fixes (28 Sep 2026) |
| Type of assistance | Code review and gap analysis against the SRS, code generation, refactoring, debugging, test writing, documentation |

## Where it was used

| Area | Files / modules | What changed | How it was tested |
|---|---|---|---|
| Security | `scripts/create_demo_accounts.py`, `backend/settings.py`, `backend/database.py`, `config/.env.example`, `frontend/src/config/api.js`, `frontend/.env.example` | Database URL, JWT secret and API URL moved out of source into `.env` files | App and script run with values from `config/.env`; `git check-ignore` confirms `.env` files are not tracked |
| Spark processing | `spark_jobs/data_quality.py`, `cleaning.py`, `feature_engineering.py`, `ingestion.py`, `schemas.py`, `spark_utils.py`, `spark_sql_analytics.py`, `spark_sql/queries.sql` | Pandas steps rewritten as PySpark / Spark SQL; Parquet partitioned by `restaurant_id`; job tracking; churn-risk features | Each job run on the full 2.5M-record dataset; data-quality and cleaning counts compared with the earlier pandas output (identical) |
| ML evaluation | `spark_jobs/spark_ml_models.py`, `python_pipeline/models.py` | Precision, recall, F1, confusion matrix, latency, model version, shared stratified 70/30 split | Both pipelines run; confirmed identical labels and splits; metrics checked against confusion matrices |
| Dual pipeline | `spark_jobs/spark_customer_segmentation.py`, `python_pipeline/customer_segmentation.py`, `python_pipeline/comparison.py` | Independent Spark and scikit-learn K-Means; comparison report on 19,747 unseen customers | Report row counts and agreement % verified by tests |
| Analytics | `python_pipeline/demand_forecasting.py`, `market_basket.py`, `price_sensitivity.py`, `promotion_analysis.py` | Forecasting with chronological split, FP-Growth rules, elasticity, promotion trap rules | Unit tests for metric formulas and rules; outputs checked against the patterns injected by the data generator |
| Backend | `backend/main.py`, `backend/routes/*`, `backend/middleware/*`, `backend/models/audit.py` | Hard-coded metrics removed, new endpoints, role-based access (incl. Cashier / Super Admin), audit middleware | pytest API tests; smoke test of every endpoint; real logins as Super Admin, Cashier and Restaurant Manager |
| Frontend | `frontend/src/pages/*` (Admin dashboard, audit logs, system monitoring, users, roles; manager dual pipeline, forecasting, market basket, pricing, promotions, anomalies, customer intelligence, wastage, overview), `components/forecast/`, `components/charts/ConfusionMatrix.jsx`, `services/api.js`, `App.jsx`, `data/navigation.js` | Mock data replaced by API calls; new role routes | `npm run build` and `oxlint` pass; pages still need a manual check in the browser by the team |
| Tests & docs | `tests/*`, `README.md`, `database/schema.sql`, this file | New pytest suite and documentation | `python -m pytest tests` (33 passed) |

## Review and verification by the team

The SRS requires AI-generated code to be reviewed, understood and tested by team members, who must be able to explain and modify it. **Each team member must fill in the rows for the modules they own before submission.**

| Module | Reviewed and understood by | Modifications made after review | Date |
|---|---|---|---|
| Spark jobs | | | |
| Python pipeline | | | |
| Backend API | | | |
| Frontend | | | |
| Tests / documentation | | | |

## Images

List any AI-generated images used in the app or the report here, with the tool that produced them.
