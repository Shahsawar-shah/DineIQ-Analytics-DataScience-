# DineIQ Analytics

Restaurant analytics platform built for TechWiz 7 (Data Science Intelligence Arena).

We generate about 2.5 million records for a 20-location restaurant chain (orders, order lines, menu, customers, ratings, promotions, pricing, inventory and wastage) and process them with PySpark and Spark SQL. Models are trained twice, once in Spark MLlib and once in plain Python (scikit-learn and XGBoost), and the two sets of results are compared. A FastAPI backend serves the results to a React dashboard, which has a separate view for each role: Admin, Restaurant Manager, Inventory Manager, Cashier and Customer.

## Tech stack

- **Frontend:** React 19, Vite, Tailwind CSS, Recharts (`frontend/`)
- **Backend:** FastAPI, JWT login, role-based access, audit log (`backend/`)
- **Big data:** Apache Spark 4.2 (PySpark, Spark SQL, MLlib), Parquet partitioned by location (`spark_jobs/`, `spark_sql/`)
- **Python pipeline:** pandas, scikit-learn, XGBoost, statsmodels, mlxtend (`python_pipeline/`)
- **Database:** PostgreSQL, used only for users and the audit log (`database/schema.sql`)

## Results

Every number here comes from the JSON and CSV files in `reports/`. The dashboard reads the same files, so the two always match.

| Task | Result |
|---|---|
| Cleaning (Spark) | 2,547,655 raw records → 2,515,055 clean (26,600 removed, 6,000 quarantined) |
| Menu classification, Python | Decision Tree: 95.6% accuracy, macro F1 0.86. XGBoost 88.9% / 0.71, Random Forest 88.9% / 0.62 |
| Menu classification, Spark MLlib | Logistic Regression: 86.7% accuracy, macro F1 0.77. Random Forest 93.3% / 0.65. GBT 97.8% (binary only: Profit Driver vs the rest) |
| Spark vs Python, menu classes | Same answer for 88.0% of all 150 items and 84.4% of the 45 test items |
| Spark vs Python, customer K-Means (k = 5) | 99.76% agreement on 19,747 customers neither model trained on. All 48 mismatches are on cluster boundaries |
| Demand forecasting (last 74 days held out) | On total daily demand, Linear Regression has 7.3% lower MAE and 10.3% lower RMSE than the naive last-value baseline. The best model beats that baseline for 10/10 categories, 14/20 locations and 74/150 items |
| Market basket (FP-Growth) | 192,058 orders, 10,730 rules, 120 with lift above 1.5. 80 of those include a loss-making item, so they are marked "do not bundle" |
| Promotion traps | 4 promotions flagged from order and profit data. That includes all 3 traps planted by the data generator, plus 1 extra that we kept in the report |
| Price sensitivity | 3 items highly sensitive, 7 moderately, 133 low, 7 without enough price changes to judge |

The four menu classes (Profit Driver, Volume Driver, Hidden Opportunity, Low Performer) come from business rules on profit margin, demand, wastage and rating (SRS step 10). Both pipelines hold out the same 45 test items: each one implements the same deterministic stratified 70/30 split on its own, so their scores can be compared directly.

## Getting started

Tested on macOS and Ubuntu 22.04/24.04. On Windows, use WSL2.

You need Python 3.11, Java 17 (for Spark), Node.js 20+ and PostgreSQL 14+.

```bash
git clone https://github.com/Shahsawar-shah/DineIQ-Analytics-DataScience-.git
cd DineIQ-Analytics-DataScience-

# Java 17: `brew install openjdk@17` on macOS, `sudo apt install openjdk-17-jdk` on Ubuntu
java -version

# Python packages. PySpark comes from pip, so there's no separate Spark install.
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Settings. Put your DATABASE_URL and SECRET_KEY in config/.env (it is git-ignored).
# To make a key: python -c "import secrets; print(secrets.token_hex(32))"
cp config/.env.example config/.env

# Database and demo accounts
createdb dineiq_analytics
psql -d dineiq_analytics -f database/schema.sql
python scripts/create_demo_accounts.py

# Frontend
cd frontend
cp .env.example .env    # sets VITE_API_BASE_URL, e.g. http://localhost:8000/api
npm install
cd ..
```

If your database was set up before the Super Admin and Admin roles were merged, run `python scripts/migrate_single_admin_role.py` once. It is safe to run again.

Spark runs locally by default. To change that, set `SPARK_MASTER` (default `local[*]`) or `SPARK_DRIVER_MEMORY` (default `4g`).

## Running the data pipeline

Run these from the project root with the virtual environment active. Outputs go to `processed_data/`, `parquet_data/` and `reports/`.

```bash
# Generate the dataset: 2M order lines, 200k orders, 80k customers, 150 menu items, 20 locations
python data_generator/generate_dataset.py

# Spark processing
python spark_jobs/ingestion.py            # explicit schemas, Parquet partitioned by restaurant_id
python spark_jobs/data_quality.py         # reports/data_quality_report.{txt,json}
python spark_jobs/cleaning.py             # processed_data/*_clean.csv, parquet_data/processed/
python spark_jobs/feature_engineering.py  # processed_data/features/, including churn risk
python spark_jobs/spark_sql_analytics.py  # runs spark_sql/queries.sql, results in reports/spark_sql/

# Models. The Spark and Python pipelines don't depend on each other.
python spark_jobs/spark_ml_models.py              # Spark: Random Forest, Logistic Regression, GBT
python python_pipeline/models.py                  # Python: XGBoost, Random Forest, Decision Tree
python spark_jobs/spark_customer_segmentation.py  # Spark K-Means
python python_pipeline/customer_segmentation.py   # scikit-learn K-Means
python python_pipeline/comparison.py              # Spark vs Python report

# Analytics
python python_pipeline/demand_forecasting.py   # Linear Regression and ARIMA vs naive baselines
python python_pipeline/market_basket.py        # FP-Growth rules and bundle suggestions
python python_pipeline/price_sensitivity.py    # price elasticity per item
python python_pipeline/promotion_analysis.py   # promotion results and trap detection
```

The whole pipeline can also be started from the browser: log in as Admin and open **Pipeline Runner**. Each Spark job logs its start and end time, status and record counts to `reports/spark_jobs.json`, which you can see under **Admin → System Monitoring**.

## Running the app

Start the API and the frontend in two terminals:

```bash
cd backend && uvicorn main:app --host 0.0.0.0 --port 8000   # API docs at http://localhost:8000/docs
cd frontend && npm run dev                                  # http://localhost:5173
```

For a production build, run `npm run build` in `frontend/`. The output goes to `frontend/dist`.

### Demo accounts

Every demo account uses the password `Demo@12345`. You can change it with `DEMO_ACCOUNT_PASSWORD` in `config/.env`.

| Role | Email | Access |
|---|---|---|
| Admin | superadmin@dineiq.demo | Everything: users and roles, audit logs, Spark jobs, Pipeline Runner, all analytics |
| Restaurant Manager | manager@dineiq.demo | All business analytics |
| Inventory Manager | inventory@dineiq.demo | Inventory, wastage, demand forecast |
| Cashier | cashier@dineiq.demo | Orders and menu |
| Customer | customer@dineiq.demo | Customer portal |

The API checks roles itself (`backend/middleware/auth_middleware.py`), so hiding a page in the UI isn't the only protection. For example, a Cashier calling `/api/dashboard/summary` gets a 403. There is one Admin role with full rights, and the last active Admin can't be demoted or deactivated, so nobody can lock themselves out.

## Where to find each feature

| Feature | Dashboard page | API |
|---|---|---|
| Menu analysis and classification | Manager → Menu Intelligence | `/api/menu/*` |
| Customer segments, RFM, churn risk | Manager → Customer Intelligence | `/api/customers/*` |
| Market basket and bundles | Manager → Market Basket | `/api/basket/rules`, `/bundles`, `/recommendations` |
| Demand forecast (adjustable horizon) | Manager → Forecasting, Inventory → Demand Forecast | `/api/forecast/demand`, `/metrics`, `/comparison` |
| Wastage analysis | Manager → Wastage Analytics | `/api/wastage/*` |
| Price sensitivity | Manager → Pricing | `/api/pricing/sensitivity` |
| Promotions and trap detection | Manager → Promotions | `/api/promotions/*` |
| Sales and rating anomalies | Manager → Anomaly Detection | `/api/anomalies/sales`, `/ratings` |
| Spark vs Python comparison | Manager → Dual Pipeline, Admin → ML Pipelines | `/api/dual-pipeline/*`, `/api/dashboard/ml-metrics` |
| What-if simulation | Manager → What-If Simulation | `POST /api/whatif/simulate` |
| Recommendations with supporting data | Manager → Recommendations | `/api/recommendations/all` |
| Audit log | Admin → Audit Logs | `/api/admin/audit-logs` |
| Spark job monitoring | Admin → System Monitoring | `/api/admin/spark-jobs` |
| CSV export | Export CSV buttons on the main tables, Reports pages | n/a |

## Tests

```bash
python -m pytest tests -v
```

There are 41 tests. They cover:

- login and role checks, including forged tokens, admins trying to register publicly, and removing the last Admin
- the forecast metrics (checked against a hand calculation), the adjustable horizon, and that training only uses past dates
- price-sensitivity classes, the shared 70/30 split, the rule-based menu labels, and support, confidence and lift
- rating-anomaly rules, audit event types, Pipeline Runner access, and notifications
- the dual-pipeline report having more than 100 unseen records

The tests never write to the real database: auditing is switched off (`AUDIT_ENABLED=false`) and the database is stubbed where needed.

## Project layout

```
data_generator/     dataset generator, including edge cases and planted data-quality problems
spark_jobs/         ingestion, data quality, cleaning, feature engineering, Spark SQL runner,
                    MLlib classification and K-Means
spark_sql/          queries.sql, every Spark SQL query (run by spark_sql_analytics.py)
python_pipeline/    Python models, K-Means, comparison, forecasting, market basket,
                    price sensitivity, promotion analysis
backend/            FastAPI app (routes/, middleware/, models/, services/, settings.py)
frontend/           React dashboard
database/           PostgreSQL schema
scripts/            demo account setup and the one-off Admin role migration
models/             saved Python (.pkl) and Spark MLlib models
reports/            pipeline outputs: metrics, comparisons, Spark SQL results, job log
tests/              pytest suite
config/             .env.example (copy it to .env)
```

## How it's built

The Spark and Python pipelines are kept apart. Each one builds its own features from the same cleaned data, trains its own models and saves its own predictions, and `comparison.py` only reads those saved outputs. For customer segmentation, the comparison uses the customers with `customer_id % 10 >= 7`, which neither model saw during training.

Forecasting uses a date-ordered split: the first 80% of days for training and the last 20% for testing. The regression only uses calendar features, which are known in advance, so no future data leaks into training.

Nothing on the dashboards is hard-coded. The values come from the processed data or the pipeline reports. The promotion-trap detector never looks at the generator's `is_promotion_trap` flag either; that flag is only read afterwards, to count how many of the planted traps were found.

`DATABASE_URL` and `SECRET_KEY` are read from `config/.env`, which isn't in git, and the API refuses to start without a `SECRET_KEY`.

## Limitations

- In the generated data, order prices don't change when `pricing_history` changes, so most price elasticities come out close to zero. An item is only called price sensitive when a price change led to a statistically significant change in demand.
- On total demand, the 7-day seasonal naive baseline has a slightly lower MAE than Linear Regression (3,450 vs 3,525). Linear Regression is still better on RMSE and R².
- Menu classification has only 150 items to learn from (45 of them held out for testing), so the scores move a fair bit between retrains.
- The "actual" segment column in the customer comparison report is the segment the generator intended, shown for reference. The match column compares Spark against Python.
- Silhouette scores can't be compared directly between the pipelines, because Spark uses squared Euclidean distance and scikit-learn uses plain Euclidean.
- The customer portal's basket, checkout, reorder, favorites and reviews all work, but they use the sample menu and save to the browser's local storage for each account. Orders placed there aren't sent to the backend.
- The inventory pages (apart from Demand Forecast), Sales Analytics, Admin Data Quality, Locations and Reports, and the landing page still show sample data.
- Not built yet: a trained wastage-risk model (step 24; the Wastage Risk page uses a simple score instead), the Jupyter notebooks, and the project report, blog and video.

## Troubleshooting

| Problem | Fix |
|---|---|
| `JAVA_HOME is not set`, or Spark won't start | Install Java 17 and set `JAVA_HOME` |
| Spark runs out of memory | `export SPARK_DRIVER_MEMORY=6g` |
| API says a file "has not been generated yet" | Run the pipeline script named in the message |
| API won't start: `SECRET_KEY is not set` | Add `SECRET_KEY` to `config/.env` |
| Frontend talks to the wrong server | Set `VITE_API_BASE_URL` in `frontend/.env` and restart or rebuild |
| Every page returns 401 | Your login expired after 30 minutes. Log in again |

We used AI tools while building this project. The details are in [AI_USAGE.md](AI_USAGE.md).
