# DineIQ Analytics

Big Data and Data Science restaurant intelligence platform — TechWiz 7, Data Science Intelligence Arena.

DineIQ processes 2.5 million restaurant records (orders, order lines, menu, customers, ratings, promotions, pricing, inventory, wastage) with **Apache Spark / PySpark / Spark SQL**, trains models in **two independent pipelines (Spark MLlib and Python scikit-learn/XGBoost)**, compares their results, and serves insights, forecasts and evidence-backed recommendations through a **FastAPI** backend and a **React** dashboard.

| | |
|---|---|
| Frontend | React 19 + Vite + Tailwind + Recharts (`frontend/`) |
| Backend | FastAPI, JWT auth, role-based access, audit trail (`backend/`) |
| Big data | Apache Spark 4.2 (PySpark, Spark SQL, MLlib), Parquet partitioned by location (`spark_jobs/`, `spark_sql/`) |
| Python DS | pandas, scikit-learn, XGBoost, statsmodels, mlxtend (`python_pipeline/`) |
| Database | PostgreSQL — users, audit logs (`database/schema.sql`) |

---

## 1. Results at a glance

All numbers are produced by the pipelines and stored in `reports/`; the dashboards read them from there.

| Task | Result |
|---|---|
| Data cleaning (Spark) | 2,547,655 raw records → 2,515,055 clean (26,600 removed, 6,000 quarantined) |
| Menu classification — Python (70/30 split, 45 unseen items) | Decision Tree: **95.6 % accuracy, macro F1 0.86**; XGBoost 88.9 % / 0.71; Random Forest 88.9 % / 0.62 |
| Menu classification — Spark MLlib (same split) | Logistic Regression: **86.7 % accuracy, macro F1 0.77**; Random Forest 93.3 % / 0.65; GBT (binary) 97.8 % |
| Spark vs Python — menu classification | 88.0 % agreement on 150 items, 84.4 % on the 45 unseen items |
| Spark vs Python — customer K-Means (k = 5) | **99.76 % agreement on 19,747 unseen customers**; all 48 disagreements are cluster-boundary cases |
| Demand forecasting (chronological 80/20 split, 74 unseen days) | Linear Regression beats the naive last-value baseline by 7.3 % MAE / 10.3 % RMSE on overall demand; the best model beats the baseline for 10/10 categories, 14/20 locations, 74/150 items |
| Market basket (FP-Growth) | 192,058 orders, 10,730 rules, 120 with lift > 1.5 (80 contain loss-making items → "do not bundle") |
| Promotion traps | 4 flagged from order/profit data; all 3 injected traps found (+1 extra flag, reported) |
| Price sensitivity | 3 highly / 7 moderately sensitive items, 133 low (see Limitations) |

Menu labels are rule-based on profit %, demand, wastage and rating (SRS Step 10), and both pipelines hold out exactly the same 45 items (a deterministic stratified split both implement independently), so their results are directly comparable.

---

## 2. Installation

**Supported OS:** macOS, Ubuntu 22.04/24.04 (Windows via WSL2).
**Requirements:** Python 3.11, Java 17 (for Spark), Node.js 20+, PostgreSQL 14+.

```bash
git clone https://github.com/Shahsawar-shah/DineIQ-Analytics-DataScience-.git
cd DineIQ-Analytics-DataScience-

# Java (Spark needs it): macOS `brew install openjdk@17`, Ubuntu `sudo apt install openjdk-17-jdk`
java -version

# Python environment (PySpark is installed from pip; no separate Spark install needed)
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Configuration — secrets live only in config/.env (git-ignored)
cp config/.env.example config/.env
#   edit DATABASE_URL and SECRET_KEY
#   (python -c "import secrets; print(secrets.token_hex(32))" makes a key)

# Database
psql "$DATABASE_URL" -f database/schema.sql
python scripts/create_demo_accounts.py

# Frontend
cd frontend
cp .env.example .env          # set VITE_API_BASE_URL, e.g. http://localhost:8000/api
npm install
cd ..
```

Optional PySpark settings: `SPARK_MASTER` (default `local[*]`) and `SPARK_DRIVER_MEMORY` (default `4g`).

---

## 3. Running the data pipeline

Run from the project root with the virtual environment active. Each step writes its outputs to `processed_data/`, `parquet_data/` or `reports/`.

```bash
# 1. Generate the dataset (2M order lines, 200k orders, 80k customers, 150 items, 20 locations)
python data_generator/generate_dataset.py

# 2. Spark: ingestion (explicit schemas, schema inference check, Parquet partitioned by restaurant_id)
python spark_jobs/ingestion.py
# 3. Spark: data-quality report          -> reports/data_quality_report.{txt,json}
python spark_jobs/data_quality.py
# 4. Spark: cleaning                      -> processed_data/*_clean.csv, parquet_data/processed/
python spark_jobs/cleaning.py
# 5. Spark: feature engineering + churn    -> processed_data/features/
python spark_jobs/feature_engineering.py
# 6. Spark SQL: runs every query in spark_sql/queries.sql -> reports/spark_sql/
python spark_jobs/spark_sql_analytics.py

# 7. Models — the two pipelines are independent
python spark_jobs/spark_ml_models.py              # Spark MLlib: RF, LogReg, GBT
python python_pipeline/models.py                  # Python: XGBoost, RF, Decision Tree
python spark_jobs/spark_customer_segmentation.py  # Spark K-Means
python python_pipeline/customer_segmentation.py   # scikit-learn K-Means
python python_pipeline/comparison.py              # Spark vs Python report

# 8. Analytics
python python_pipeline/demand_forecasting.py   # LR + ARIMA vs naive, chronological split
python python_pipeline/market_basket.py        # FP-Growth, support/confidence/lift, bundles
python python_pipeline/price_sensitivity.py    # elasticity + High/Moderate/Low
python python_pipeline/promotion_analysis.py   # effectiveness + trap detection
```

Every Spark job records its start/end time, status and record counts in `reports/spark_jobs.json` (shown on **Admin → System Monitoring**).

---

## 4. Running the application

```bash
# API (from backend/)
cd backend && uvicorn main:app --host 0.0.0.0 --port 8000
# API docs: http://localhost:8000/docs

# Web app (from frontend/)
cd frontend && npm run dev          # development, http://localhost:5173
cd frontend && npm run build        # production build in frontend/dist
```

### Logging in — evaluator accounts

All demo accounts use the password **`Demo@12345`** (set `DEMO_ACCOUNT_PASSWORD` in `config/.env` to change it).

| Role | Email | Can access |
|---|---|---|
| Super Admin | superadmin@dineiq.demo | Everything, including granting Admin / Super Admin |
| Admin | admin@dineiq.demo | Admin console, users, audit logs, Spark jobs, analytics APIs |
| Restaurant Manager | manager@dineiq.demo | Full business-intelligence suite |
| Inventory Manager | inventory@dineiq.demo | Inventory, wastage, demand forecast |
| Cashier | cashier@dineiq.demo | Orders and menu only |
| Customer | customer@dineiq.demo | Customer portal |

Roles are enforced by the API (`backend/middleware/auth_middleware.py`), not only by the UI: a Cashier calling `/api/dashboard/summary` gets HTTP 403.

---

## 5. Where to find each feature

| Feature | Dashboard page | API |
|---|---|---|
| Menu analysis & classification | Manager → Menu Intelligence | `/api/menu/*` |
| Customer segments, RFM, churn risk | Manager → Customer Intelligence | `/api/customers/*` |
| Market-basket analysis, bundles | Manager → Market Basket | `/api/basket/rules`, `/bundles`, `/recommendations` |
| Demand forecasts (configurable horizon) | Manager → Forecasting, Inventory → Demand Forecast | `/api/forecast/demand`, `/metrics`, `/comparison` |
| Wastage analysis | Manager → Wastage Analytics | `/api/wastage/*` |
| Price intelligence | Manager → Pricing | `/api/pricing/sensitivity` |
| Promotions & trap detection | Manager → Promotions | `/api/promotions/*` |
| Sales & rating anomalies | Manager → Anomaly Detection | `/api/anomalies/sales`, `/ratings` |
| Spark vs Python comparison | Manager → Dual Pipeline, Admin → ML Pipelines | `/api/dual-pipeline/*`, `/api/dashboard/ml-metrics` |
| What-if analysis | Manager → What-If Simulation | `POST /api/whatif/simulate` |
| Recommendations with evidence | Manager → Recommendations | `/api/recommendations/all` |
| Audit trail | Admin → Audit Logs | `/api/admin/audit-logs` |
| Spark job monitoring | Admin → System Monitoring | `/api/admin/spark-jobs` |
| Exports | CSV buttons on each table, Reports pages | — |

---

## 6. Tests

```bash
python -m pytest tests -v
```

33 tests cover: authentication and role-based access (incl. forged tokens and blocked admin self-registration), that `/ml-metrics` serves the saved pipeline reports, forecast metrics and configurable horizon, chronological validation, price-sensitivity classes, the shared stratified split, rule-based menu labels, support/confidence/lift, rating-anomaly rules, audit classification, and that the dual-pipeline report covers 100+ unseen records. Tests never write to the real database (`AUDIT_ENABLED=false`, the DB is stubbed where needed).

---

## 7. Repository layout

```
data_generator/     dataset generator (tricky cases + data-quality issues)
spark_jobs/         ingestion, data quality, cleaning, feature engineering,
                    Spark SQL runner, MLlib classification, MLlib K-Means
spark_sql/          queries.sql — every Spark SQL query (run by spark_sql_analytics.py)
python_pipeline/    independent Python models, K-Means, comparison, forecasting,
                    market basket, price sensitivity, promotion analysis
backend/            FastAPI app (routes/, middleware/, models/, settings.py)
frontend/           React dashboard
database/           PostgreSQL schema
models/             saved Python (.pkl) and Spark MLlib models
reports/            pipeline outputs: metrics, comparison reports, Spark SQL results, job log
tests/              pytest suite
config/             .env.example (copy to .env)
```

---

## 8. Design notes

* **Two independent pipelines.** Spark and Python each build their own features from the same cleaned records, train their own models and write their own predictions; `comparison.py` only reads both outputs. Customer segmentation compares on customers with `customer_id % 10 >= 7`, which neither model saw in training.
* **No data leakage in forecasting.** The first 80 % of days train the models, the last 20 % are the unseen test period, and the regression uses only calendar features known in advance.
* **Nothing hard-coded.** Dashboard numbers come from the processed data or the pipeline reports; the promotion-trap detector never reads the generator's `is_promotion_trap` flag (it is used only afterwards to report how many injected traps were found).
* **Secrets.** `DATABASE_URL` and `SECRET_KEY` are read from `config/.env`; the API refuses to start without a `SECRET_KEY`.

---

## 9. Assumptions and limitations

* **Price sensitivity:** in the generated data, order prices never change when `pricing_history` does, so measured elasticities are mostly near zero. Items are only classed as sensitive when a price change produced a statistically significant demand shift.
* **Menu classification** is trained on 150 items (45 test items), so metrics move noticeably between retrains; the class labels come from documented business rules.
* **Customer "actual" segment** in the comparison report is the generator's designed segment, shown for reference only; the match column compares Spark with Python.
* **Silhouette** values differ between pipelines partly because Spark uses squared Euclidean distance and scikit-learn uses Euclidean.
* **Still on sample data:** the customer portal pages, the inventory pages other than Demand Forecast, Sales Analytics, Admin Data Quality / Locations / Reports, and the Landing page still show illustrative data.
* **Not yet built:** a wastage-risk prediction model (Step 24), Jupyter notebooks, and the project report, blog and video deliverables.

---

## 10. Troubleshooting

| Problem | Fix |
|---|---|
| `JAVA_HOME is not set` / Spark fails to start | Install Java 17 and set `JAVA_HOME` |
| Spark runs out of memory | `export SPARK_DRIVER_MEMORY=6g` |
| API says a file "has not been generated yet" | Run the pipeline command named in the message |
| API won't start: `SECRET_KEY is not set` | Add `SECRET_KEY` to `config/.env` |
| Frontend calls the wrong server | Set `VITE_API_BASE_URL` in `frontend/.env` and rebuild |
| 401 on every page | Token expired (30 min) — log in again |

AI tool usage is declared in [AI_USAGE.md](AI_USAGE.md).
