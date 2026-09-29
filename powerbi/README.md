# DineIQ → Power BI

## Workflow

```
generate_dataset.py ─► data_quality.py ─► cleaning.py ─► feature_engineering.py ─► models.py
        (raw_data)                        (processed_data)   (features/)          (classifications)
                                                    │
                                     powerbi/load_to_postgres.py
                                                    ▼
                          PostgreSQL  dineiq_analytics.bi  (star schema)
                                                    ▼
                               Power BI Desktop  (Import mode, powerbi_reader)
```

## 1. VPS setup (one time)

```bash
cd ~/DineIQ-Analytics-DataScience-
git pull
pip install psycopg2-binary pandas --break-system-packages

# read-only login for Power BI
sudo -u postgres psql -d dineiq_analytics -v pw="'YourStrongPass#2026'" -f powerbi/create_reader.sql

# allow Power BI to reach Postgres (only from your own IP if possible)
sudo ufw allow from <YOUR_HOME_IP> to any port 5432 proto tcp
# pg_hba.conf must contain:
#   host  dineiq_analytics  powerbi_reader  0.0.0.0/0  scram-sha-256
sudo systemctl reload postgresql     # or restart the Docker container
```

## 2. Build / refresh the data mart

```bash
export PG_PASSWORD='<dineiq_user password>'
bash powerbi/refresh_bi.sh           # load current CSVs into schema bi (~25 s)
bash powerbi/refresh_bi.sh --full    # regenerate data + ML, then load
```

Result (schema `bi`):

| Table | Rows | Grain |
|---|---|---|
| fact_order_items | 1.92M | one menu item line (revenue, cost, profit) |
| fact_orders | 194K | one order (channel, discount, basket, peak hour) |
| fact_ratings | 178K | one rating |
| fact_wastage | 79K | one wastage record |
| fact_inventory | 3K | stock snapshot per item × restaurant |
| fact_price_changes | 460 | one price change |
| dim_date | 366 | calendar day |
| dim_customer | 80K | customer + RFM + churn_status |
| dim_menu_item | 150 | item + features + ML class/prediction |
| dim_restaurant | 20 | location |
| dim_promotion | 16 | promo (0 = No Promotion) |
| model_metrics | 6 | Spark model metrics |

## 3. Connect Power BI Desktop

1. **Cancel the Copilot dialog** — Copilot needs a paid Fabric (F2+) / Premium (P1) workspace. Not needed for this.
2. Home → **Get data → PostgreSQL database**
   - Server: `187.127.98.233:5432`  Database: `dineiq_analytics`
   - Data Connectivity mode: **Import**
3. Credentials → **Database** tab → `powerbi_reader` / your password.
   If asked "encrypted connection not supported", click **OK** (VPS Postgres has no SSL).
4. Navigator → tick all `bi.dim_*`, `bi.fact_*`, `bi.model_metrics` → **Load**. (Skip `stg_*`.)

## 4. Model view — relationships (all Many→One, single direction)

| From (many) | To (one) |
|---|---|
| fact_order_items[order_date] | dim_date[date] |
| fact_order_items[item_id] | dim_menu_item[item_id] |
| fact_order_items[restaurant_id] | dim_restaurant[restaurant_id] |
| fact_order_items[customer_id] | dim_customer[customer_id] |
| fact_order_items[promotion_id] | dim_promotion[promotion_id] |
| fact_orders[order_date] | dim_date[date] |
| fact_orders[restaurant_id] | dim_restaurant[restaurant_id] |
| fact_orders[customer_id] | dim_customer[customer_id] |
| fact_orders[promotion_id] | dim_promotion[promotion_id] |
| fact_wastage[wastage_date] | dim_date[date] |
| fact_wastage[item_id] / [restaurant_id] | dim_menu_item / dim_restaurant |
| fact_ratings[rating_date] | dim_date[date] |
| fact_ratings[item_id] / [restaurant_id] | dim_menu_item / dim_restaurant |
| fact_inventory[item_id] / [restaurant_id] | dim_menu_item / dim_restaurant |

Delete any auto-detected relationship not in this list (e.g. fact_orders ↔ fact_order_items).
Then: select `dim_date` → Table tools → **Mark as date table** → `date`.
Sort `dim_date[month_name]` by `month_no`, `weekday_name` by `weekday_no`.

## 5. Measures

Modeling → New table: `_Measures = {BLANK()}`, then paste each line of `measures.dax` as a new measure.

## 6. Suggested report pages (matches submission screenshots)

| Page | Visuals |
|---|---|
| Executive | KPI cards (Revenue, Profit, Margin %, Orders, AOV), revenue trend by year_month, revenue by channel |
| Menu Engineering | Scatter: Units Sold × Profit Margin %, legend = menu_class; matrix item × class |
| ML Evidence | Matrix menu_class × predicted_class (confusion matrix), Prediction Accuracy card, model_metrics table |
| Wastage | Wastage Cost by reason, top 10 items, trend |
| Promotions | Promo ROI by promo_name, is_promotion_trap flag, Discount Given |
| Customers / Churn | churn_status donut, RFM segment bar, At-Risk count |
| Locations | Map/bar by location_city, restaurant revenue vs rating |
| Inventory | Items To Reorder, stock value by restaurant |

Add slicers: dim_date[year_month], dim_restaurant[restaurant_name], fact_orders[order_channel].

Save as `powerbi/DineIQ_Analytics.pbix`. After each `refresh_bi.sh`, press **Refresh** in Power BI.

## 7. Ready-made dashboard (DineIQ_Dashboard/)

The model, relationships, 35 measures and 7 report pages are already built. You don't need to do steps 3–6 by hand:

1. Power BI Desktop → File → Options → Preview features → enable **Power BI Project (.pbip) save option** → restart.
2. Open `powerbi/DineIQ_Dashboard/DineIQ.pbip`.
3. Home → **Refresh** → credentials: **Database** → `powerbi_reader` / password → OK on "unencrypted".
4. To point at another server: Transform data → Edit parameters → `PG_Server`, `PG_Database`.

Pages: Executive · Menu Engineering · ML Model Evidence (confusion matrix, precision, recall) · Customers & Churn · Promotions & Pricing · Wastage & Inventory · Locations & Channels.

To regenerate after schema changes: `python powerbi/build_pbip.py cols.txt`, where cols.txt comes from
`psql -At -c "select table_name||'|'||column_name||'|'||data_type from information_schema.columns where table_schema='bi'"`.
