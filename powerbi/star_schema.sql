-- DineIQ Analytics — Power BI star schema (schema: bi)
-- Built from bi.stg_* tables by load_to_postgres.py. Safe to re-run.

-- ============ DIMENSIONS ============

DROP TABLE IF EXISTS bi.dim_date CASCADE;
CREATE TABLE bi.dim_date AS
SELECT d::date                                   AS date,
       EXTRACT(YEAR FROM d)::int                 AS year,
       EXTRACT(QUARTER FROM d)::int              AS quarter,
       'Q' || EXTRACT(QUARTER FROM d)            AS quarter_label,
       EXTRACT(MONTH FROM d)::int                AS month_no,
       TO_CHAR(d, 'Mon')                         AS month_name,
       TO_CHAR(d, 'YYYY-MM')                     AS year_month,
       EXTRACT(ISODOW FROM d)::int               AS weekday_no,
       TO_CHAR(d, 'Dy')                          AS weekday_name,
       EXTRACT(ISODOW FROM d) IN (6, 7)          AS is_weekend,
       EXTRACT(WEEK FROM d)::int                 AS week_no
FROM generate_series(
        (SELECT LEAST(MIN(order_date), (SELECT MIN(wastage_date) FROM bi.stg_wastage),
                      (SELECT MIN(rating_date) FROM bi.stg_ratings)) FROM bi.stg_orders),
        (SELECT GREATEST(MAX(order_date), (SELECT MAX(wastage_date) FROM bi.stg_wastage),
                         (SELECT MAX(rating_date) FROM bi.stg_ratings)) FROM bi.stg_orders),
        interval '1 day') AS d;
ALTER TABLE bi.dim_date ADD PRIMARY KEY (date);

DROP TABLE IF EXISTS bi.dim_menu_item CASCADE;
CREATE TABLE bi.dim_menu_item AS
SELECT m.item_id, m.item_name, c.category_name, m.base_price, m.preparation_cost,
       m.base_price - m.preparation_cost                   AS unit_margin,
       m.preparation_time_minutes, m.is_available, m.is_seasonal, m.launch_date,
       f.contribution_margin, f.profit_percentage, f.avg_rating, f.rating_trend,
       f.wastage_percentage, f.weekend_ratio, f.promotion_dependency, f.repeat_purchase_rate,
       mc.actual_class            AS menu_class,        -- rule-based ground truth
       mc.python_class            AS predicted_class,   -- ML prediction
       mc.python_probability      AS prediction_confidence,
       mc.model_used
FROM bi.stg_menu_items m
LEFT JOIN bi.stg_menu_categories c       ON c.category_id = m.category_id
LEFT JOIN bi.stg_item_features f         ON f.item_id = m.item_id
LEFT JOIN bi.stg_menu_classifications mc ON mc.item_id = m.item_id;
ALTER TABLE bi.dim_menu_item ADD PRIMARY KEY (item_id);

DROP TABLE IF EXISTS bi.dim_restaurant CASCADE;
CREATE TABLE bi.dim_restaurant AS
SELECT r.restaurant_id, r.restaurant_name, r.location_city, r.location_area,
       r.seating_capacity, r.opening_time, r.closing_time, r.is_active,
       lf.top_channel
FROM bi.stg_restaurants r
LEFT JOIN bi.stg_location_features lf ON lf.restaurant_id = r.restaurant_id;
ALTER TABLE bi.dim_restaurant ADD PRIMARY KEY (restaurant_id);

DROP TABLE IF EXISTS bi.dim_customer CASCADE;
CREATE TABLE bi.dim_customer AS
SELECT c.customer_id, c.customer_code, c.age_group, c.gender, c.city,
       c.registration_date, c.preferred_channel, c.customer_segment, c.is_active,
       cf.recency_days, cf.frequency, cf.monetary_value, cf.rfm_score,
       cf.recency_score, cf.frequency_score, cf.monetary_score, cf.favorite_category,
       CASE WHEN cf.recency_days > 90 THEN 'At Risk'
            WHEN cf.recency_days > 45 THEN 'Cooling'
            WHEN cf.recency_days IS NULL THEN 'No Orders'
            ELSE 'Active' END                     AS churn_status
FROM bi.stg_customers c
LEFT JOIN bi.stg_customer_features cf ON cf.customer_id = c.customer_id;
ALTER TABLE bi.dim_customer ADD PRIMARY KEY (customer_id);

DROP TABLE IF EXISTS bi.dim_promotion CASCADE;
CREATE TABLE bi.dim_promotion AS
SELECT promotion_id, promo_name, promo_type, discount_percentage, discount_amount,
       start_date, end_date, min_order_value, is_active, is_promotion_trap
FROM bi.stg_promotions
UNION ALL
SELECT 0, 'No Promotion', 'None', 0, 0, NULL, NULL, 0, TRUE, FALSE;
ALTER TABLE bi.dim_promotion ADD PRIMARY KEY (promotion_id);

-- ============ FACTS ============

DROP TABLE IF EXISTS bi.fact_orders CASCADE;
CREATE TABLE bi.fact_orders AS
SELECT o.order_id, o.order_date, o.order_time, o.customer_id, o.restaurant_id,
       COALESCE(o.promotion_id, 0) AS promotion_id,
       o.order_channel, o.order_status, o.is_cancelled,
       o.subtotal, o.discount_amount, o.total_amount,
       f.basket_size, f.is_peak_hour, f.has_promotion, f.order_hour
FROM bi.stg_orders o
LEFT JOIN bi.stg_order_features f ON f.order_id = o.order_id;
ALTER TABLE bi.fact_orders ADD PRIMARY KEY (order_id);

DROP TABLE IF EXISTS bi.fact_order_items CASCADE;
CREATE TABLE bi.fact_order_items AS
SELECT oi.order_item_id, oi.order_id, o.order_date, o.customer_id, o.restaurant_id,
       COALESCE(o.promotion_id, 0)                  AS promotion_id,
       o.order_channel, o.is_cancelled,
       oi.item_id, oi.quantity, oi.unit_price, oi.cost_price, oi.discount_applied,
       oi.line_total                                AS revenue,
       oi.cost_price * oi.quantity                  AS cost,
       oi.line_total - oi.cost_price * oi.quantity  AS profit,
       oi.is_loss_making
FROM bi.stg_order_items oi
JOIN bi.stg_orders o ON o.order_id = oi.order_id;   -- drops lines of quarantined orders
ALTER TABLE bi.fact_order_items ADD PRIMARY KEY (order_item_id);

DROP TABLE IF EXISTS bi.fact_wastage CASCADE;
CREATE TABLE bi.fact_wastage AS
SELECT wastage_id, wastage_date, item_id, restaurant_id, wastage_quantity,
       wastage_cost, wastage_reason, recorded_by
FROM bi.stg_wastage;

DROP TABLE IF EXISTS bi.fact_ratings CASCADE;
CREATE TABLE bi.fact_ratings AS
SELECT rating_id, rating_date, customer_id, item_id, restaurant_id,
       rating_value, rating_source
FROM bi.stg_ratings;

DROP TABLE IF EXISTS bi.fact_inventory CASCADE;
CREATE TABLE bi.fact_inventory AS
SELECT inventory_id, item_id, restaurant_id, stock_quantity, reorder_level,
       stock_quantity <= reorder_level AS needs_reorder,
       last_restocked_date, unit_cost, stock_quantity * unit_cost AS stock_value
FROM bi.stg_inventory;

DROP TABLE IF EXISTS bi.fact_price_changes CASCADE;
CREATE TABLE bi.fact_price_changes AS
SELECT price_id, change_date, item_id, restaurant_id, old_price, new_price,
       new_price - old_price AS price_delta,
       ROUND(100.0 * (new_price - old_price) / NULLIF(old_price, 0), 2) AS price_change_pct,
       change_reason
FROM bi.stg_pricing_history;

-- ============ INDEXES (speed up Power BI refresh / DirectQuery) ============
CREATE INDEX ON bi.fact_order_items (order_date);
CREATE INDEX ON bi.fact_order_items (item_id);
CREATE INDEX ON bi.fact_order_items (restaurant_id);
CREATE INDEX ON bi.fact_orders (order_date);
CREATE INDEX ON bi.fact_orders (customer_id);
CREATE INDEX ON bi.fact_wastage (wastage_date);
CREATE INDEX ON bi.fact_ratings (rating_date);

ANALYZE;
