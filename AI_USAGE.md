# AI Usage

This file lists where we used AI tools while building DineIQ, as the SRS asks (§1.8 items 13–16 and §1.10 item 16).

The app itself doesn't call any AI service. All the analytics, predictions, classifications, forecasts and recommendations come from our own Spark, Python and backend code.

## What we used

We used Claude by Anthropic inside VS Code through Claude Code. We used it from 24 to 29 September 2026: Claude Sonnet 5 for most of the early work, and Claude Opus 5.5 for the project setup, the dataset generator and the last two days. 29 of our 44 commits have Claude listed as co-author, so you can check `git log` to see exactly which changes it helped with.

We mainly used it to:

- review the project against the SRS and find what was missing
- write and refactor code
- debug
- write tests
- write documentation

## Where it was used

| Area | Files | What changed | How we checked it |
|---|---|---|---|
| Project setup and dataset | `data_generator/generate_dataset.py`, initial folder structure | Project skeleton, then the generator for all 11 tables, including planted data-quality issues and edge cases | Ran the generator. Record counts and the planted issues show up in the data-quality report |
| Spark processing | `spark_jobs/ingestion.py`, `data_quality.py`, `cleaning.py`, `feature_engineering.py`, `schemas.py`, `spark_utils.py`, `spark_sql_analytics.py`, `spark_sql/queries.sql` | Moved the pandas steps to PySpark and Spark SQL, partitioned Parquet by `restaurant_id`, added job tracking and churn-risk features | Ran every job on the full 2.5M-record dataset. The data-quality and cleaning counts matched the earlier pandas version exactly |
| ML models and evaluation | `spark_jobs/spark_ml_models.py`, `python_pipeline/models.py` | Precision, recall, F1, confusion matrix, prediction latency, model versions, and a shared stratified 70/30 split | Ran both pipelines, confirmed they use the same labels and the same split, and checked the metrics against the confusion matrices |
| Spark vs Python comparison | `spark_jobs/spark_customer_segmentation.py`, `python_pipeline/customer_segmentation.py`, `python_pipeline/comparison.py` | Separate Spark and scikit-learn K-Means, and a comparison report on 19,747 customers neither model trained on | Tests check the report's row counts and agreement percentage |
| Analytics | `python_pipeline/demand_forecasting.py`, `market_basket.py`, `price_sensitivity.py`, `promotion_analysis.py` | Forecasting with a date-ordered train/test split, FP-Growth rules, price elasticity, promotion-trap rules | Unit tests for the metric formulas and rules. Checked the outputs against the patterns the generator plants on purpose |
| Backend | `backend/main.py`, `backend/routes/*`, `backend/middleware/*`, `backend/models/*`, `backend/services/*` | JWT login, API routes, removed hard-coded metrics, role-based access (Cashier role, single Admin role), audit log, Pipeline Runner | pytest API tests, a call to every endpoint, and real logins as Admin, Cashier and Restaurant Manager |
| Security and config | `backend/settings.py`, `backend/database.py`, `scripts/create_demo_accounts.py`, `scripts/migrate_single_admin_role.py`, `config/.env.example`, `frontend/src/config/api.js`, `frontend/.env.example` | Moved the database URL, JWT secret and API URL out of the code into `.env` files. Demo accounts. Migration from Super Admin to Admin | The app and scripts run with values from `config/.env`. `git check-ignore` confirms the `.env` files aren't tracked |
| Frontend | `frontend/src/pages/*` (admin, manager, inventory and customer pages), `components/`, `context/`, `services/api.js`, `App.jsx`, `data/navigation.js` | Landing page, replaced mock data with API calls on the analytics pages, new role routes, confusion matrix and forecast charts, and the customer basket, checkout, reorder, favorites and reviews | `npm run build` passes. `oxlint` reports no errors |
| Tests and docs | `tests/*`, `README.md`, `database/schema.sql`, this file | pytest suite, README, schema | `python -m pytest tests`: all 41 pass |

## Review by the team

The SRS says the team has to review, understand and test any AI-generated code, and be able to explain and change it. The team member who owns each module signs off below.

| Module | Reviewed by | Changes we made after review | Date |
|---|---|---|---|
| Dataset generator | | | |
| Spark jobs | | | |
| Python pipeline | | | |
| Backend API | | | |
| Frontend | | | |
| Tests and docs | | | |

## Images and video

We didn't use any AI image or video generators. The landing-page videos are rendered from our own HTML scenes (`frontend/scripts/hero-videos/`) using headless Chrome and ffmpeg. Dishes that have no photo show an icon instead.
