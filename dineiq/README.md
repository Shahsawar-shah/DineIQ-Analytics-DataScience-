# DineIQ Analytics — Menu Matrix · Dining Intelligence

A complete, frontend-only restaurant intelligence platform prototype.

- **Landing page** styled after Food Funday (dark hero, script accents, hover-food cards adapted to analytics)
- **Dashboards** styled after the Riday admin template (light panels, KPI cards, donut stats, status pills)
- **Functionality** driven by the DineIQ Analytics SRS — everything runs on realistic **mock data**

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production bundle
```

## Demo accounts

Mock authentication only — pick any email/password plus the role you want to explore:

| Role                | Lands on              |
| ------------------- | --------------------- |
| Customer            | `/customer/dashboard` |
| Admin               | `/admin/dashboard`    |
| Restaurant Manager  | `/manager/dashboard`  |
| Inventory Manager   | `/inventory/dashboard`|

Register creates a session in browser storage (no backend). Sessions persist across refreshes until logout.

## What's inside

- **Public:** landing page (hero, features, analytics preview, how-it-works, CTA, footer), login, register
- **Customer:** overview, orders (reorder modal), favorites, recommendations, promotions, ratings & reviews, profile
- **Admin:** overview, users (CSV export, edit modal), roles + permission matrix, locations, data management (pipeline jobs), data quality (radar + rules), system monitoring, audit logs, reports, settings
- **Restaurant Manager (BI suite):** overview (8 KPIs), sales analytics (working filters), menu intelligence (Menu Matrix scatter + classification), customer intelligence (RFM + churn), forecasting (daily/weekly/monthly with confidence bands), pricing (elasticity), promotions (ROI), wastage analytics, anomaly detection, recommendations, what-if simulation (live sliders), **dual pipeline comparison (Python vs Spark/PySpark, mock)**, reports
- **Inventory Manager:** overview, items, stock levels, consumption, wastage, demand forecast, wastage risk scoring, purchase planning with approvals, reports

## Architecture notes (backend-ready)

- `src/data/mockData.ts` — the single source of mock entities. Replace with API calls; types live in `src/types`.
- `src/context/AuthContext.tsx` — swap `login`/`register` for real endpoints; everything else consumes the context.
- `src/routes/ProtectedRoute.tsx` — role guard that will work unchanged with a real session check.
- No backend, database, Spark, PySpark, ML, or API calls exist anywhere in the codebase, per SRS phase 1.

All analytics pages are labeled **Demo / Mock Data** where numbers are illustrative.
