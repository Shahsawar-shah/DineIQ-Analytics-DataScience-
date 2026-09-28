-- ===========================================================================
-- DineIQ Analytics - Spark SQL queries
--
-- Executed by spark_jobs/spark_sql_analytics.py against these temp views:
--   orders, order_items         cleaned data (parquet_data/processed/, cancelled orders excluded)
--   menu_items, menu_categories, restaurants, customers, promotions,
--   pricing_history, ratings, wastage, inventory   (parquet_data/<table>/)
-- Each query starts with a "-- name: <id>" line; its result is saved to
-- reports/spark_sql/<id>.csv.
--
-- The location-feature query used by spark_jobs/feature_engineering.py
-- (LOCATION_SQL) and the ingestion sanity-check join are included as well.
-- ===========================================================================


-- name: ingestion_top_items_by_revenue
-- Sanity-check join run by spark_jobs/ingestion.py after loading the raw tables.
SELECT mi.item_name,
       mc.category_name,
       COUNT(oi.order_item_id)      AS total_orders,
       ROUND(SUM(oi.line_total), 2) AS total_revenue,
       ROUND(AVG(oi.unit_price), 2) AS avg_price
FROM order_items oi
JOIN menu_items mi      ON oi.item_id = mi.item_id
JOIN menu_categories mc ON mi.category_id = mc.category_id
GROUP BY mi.item_name, mc.category_name
ORDER BY total_revenue DESC
LIMIT 10;


-- name: menu_profitability
-- Step 9: quantity, revenue, cost, contribution margin and profit % per item.
SELECT mi.item_id,
       mi.item_name,
       mc.category_name,
       SUM(oi.quantity)                                   AS quantity_sold,
       ROUND(SUM(oi.line_total), 2)                       AS revenue,
       ROUND(SUM(oi.cost_price * oi.quantity), 2)         AS cost,
       ROUND(SUM(oi.line_total - oi.cost_price * oi.quantity), 2) AS contribution_margin,
       ROUND(SUM(oi.line_total - oi.cost_price * oi.quantity) / SUM(oi.line_total) * 100, 2) AS profit_pct
FROM order_items oi
JOIN orders o           ON o.order_id = oi.order_id
JOIN menu_items mi      ON mi.item_id = oi.item_id
JOIN menu_categories mc ON mc.category_id = mi.category_id
GROUP BY mi.item_id, mi.item_name, mc.category_name
ORDER BY contribution_margin DESC;


-- name: high_selling_loss_making_items
-- Step 11 tricky case: popular dishes that lose money.
SELECT mi.item_name,
       SUM(oi.quantity)                                   AS quantity_sold,
       ROUND(SUM(oi.line_total - oi.cost_price * oi.quantity), 2) AS contribution_margin
FROM order_items oi
JOIN orders o      ON o.order_id = oi.order_id
JOIN menu_items mi ON mi.item_id = oi.item_id
GROUP BY mi.item_name
HAVING SUM(oi.line_total - oi.cost_price * oi.quantity) < 0
ORDER BY quantity_sold DESC;


-- name: category_popularity
-- Step 8: popular menu categories.
SELECT mc.category_name,
       COUNT(DISTINCT oi.order_id)  AS orders,
       SUM(oi.quantity)             AS units,
       ROUND(SUM(oi.line_total), 2) AS revenue
FROM order_items oi
JOIN orders o           ON o.order_id = oi.order_id
JOIN menu_items mi      ON mi.item_id = oi.item_id
JOIN menu_categories mc ON mc.category_id = mi.category_id
GROUP BY mc.category_name
ORDER BY revenue DESC;


-- name: peak_hours
-- Step 19: orders and revenue by hour of day.
SELECT CAST(SUBSTRING(order_time, 1, 2) AS INT) AS order_hour,
       COUNT(*)                                 AS orders,
       ROUND(SUM(total_amount), 2)              AS revenue
FROM orders
GROUP BY CAST(SUBSTRING(order_time, 1, 2) AS INT)
ORDER BY order_hour;


-- name: peak_days_and_weekend_pattern
-- Step 19: orders by weekday (Spark dayofweek: 1 = Sunday ... 7 = Saturday).
SELECT DAYOFWEEK(order_date)                          AS day_of_week,
       DATE_FORMAT(order_date, 'EEEE')                AS day_name,
       CASE WHEN DAYOFWEEK(order_date) IN (1, 7) THEN 'weekend' ELSE 'weekday' END AS day_type,
       COUNT(*)                                       AS orders,
       ROUND(COUNT(*) / COUNT(DISTINCT order_date), 1) AS avg_orders_per_day
FROM orders
GROUP BY DAYOFWEEK(order_date), DATE_FORMAT(order_date, 'EEEE')
ORDER BY day_of_week;


-- name: monthly_trend
-- Step 19: monthly and seasonal trend.
SELECT DATE_FORMAT(order_date, 'yyyy-MM')  AS month,
       COUNT(*)                            AS orders,
       ROUND(SUM(total_amount), 2)         AS revenue,
       ROUND(AVG(total_amount), 2)         AS avg_order_value
FROM orders
GROUP BY DATE_FORMAT(order_date, 'yyyy-MM')
ORDER BY month;


-- name: channel_analysis
-- Step 35: basket size, AOV, discount and profitability by ordering channel.
WITH order_lines AS (
    SELECT o.order_id, o.order_channel, o.total_amount, o.discount_amount,
           COUNT(oi.order_item_id)                AS basket_size,
           SUM(oi.cost_price * oi.quantity)        AS cost
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.order_id
    GROUP BY o.order_id, o.order_channel, o.total_amount, o.discount_amount
)
SELECT order_channel,
       COUNT(*)                                            AS orders,
       ROUND(AVG(basket_size), 2)                          AS avg_basket_size,
       ROUND(AVG(total_amount), 2)                         AS avg_order_value,
       ROUND(AVG(discount_amount), 2)                      AS avg_discount,
       ROUND(SUM(total_amount - cost) / SUM(total_amount) * 100, 2) AS profit_margin_pct
FROM order_lines
GROUP BY order_channel
ORDER BY orders DESC;


-- name: channel_peak_hours
-- Step 19: dine-in versus delivery peaks.
SELECT order_channel,
       CAST(SUBSTRING(order_time, 1, 2) AS INT) AS order_hour,
       COUNT(*)                                 AS orders
FROM orders
GROUP BY order_channel, CAST(SUBSTRING(order_time, 1, 2) AS INT)
ORDER BY order_channel, order_hour;


-- name: location_performance
-- Step 33: the location comparison built by feature_engineering.py (LOCATION_SQL).
WITH line_totals AS (
    SELECT o.restaurant_id, o.order_id, o.customer_id,
           SUM(oi.line_total)                              AS revenue,
           SUM(oi.line_total - oi.cost_price * oi.quantity) AS profit
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.order_id
    GROUP BY o.restaurant_id, o.order_id, o.customer_id
)
SELECT r.restaurant_id,
       r.restaurant_name,
       r.location_city,
       ROUND(SUM(lt.revenue), 2)                           AS total_revenue,
       ROUND(SUM(lt.profit), 2)                            AS total_profit,
       ROUND(SUM(lt.profit) / SUM(lt.revenue) * 100, 2)    AS profit_margin_pct,
       COUNT(DISTINCT lt.order_id)                         AS total_orders,
       COUNT(DISTINCT lt.customer_id)                      AS total_customers,
       ROUND(SUM(lt.revenue) / COUNT(DISTINCT lt.order_id), 2) AS avg_order_value
FROM restaurants r
LEFT JOIN line_totals lt ON lt.restaurant_id = r.restaurant_id
GROUP BY r.restaurant_id, r.restaurant_name, r.location_city
ORDER BY total_revenue DESC;


-- name: location_specific_item_performance
-- Step 34: the same item ranked per location (top 3 items by margin at each location).
WITH item_location AS (
    SELECT o.restaurant_id, oi.item_id,
           SUM(oi.quantity)                                   AS units,
           SUM(oi.line_total - oi.cost_price * oi.quantity)   AS margin
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.order_id
    GROUP BY o.restaurant_id, oi.item_id
),
ranked AS (
    SELECT *, ROW_NUMBER() OVER (PARTITION BY restaurant_id ORDER BY margin DESC) AS rank_in_location
    FROM item_location
)
SELECT r.restaurant_name, mi.item_name, ranked.units, ROUND(ranked.margin, 2) AS margin, ranked.rank_in_location
FROM ranked
JOIN restaurants r  ON r.restaurant_id = ranked.restaurant_id
JOIN menu_items mi  ON mi.item_id = ranked.item_id
WHERE ranked.rank_in_location <= 3
ORDER BY r.restaurant_name, ranked.rank_in_location;


-- name: promotion_driven_sales
-- Step 8 / 27: orders, revenue and margin with vs without a promotion.
WITH order_cost AS (
    SELECT o.order_id, o.promotion_id, o.total_amount, o.discount_amount,
           SUM(oi.cost_price * oi.quantity) AS cost
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.order_id
    GROUP BY o.order_id, o.promotion_id, o.total_amount, o.discount_amount
)
SELECT COALESCE(p.promo_name, 'No promotion')                   AS promotion,
       COUNT(*)                                                  AS orders,
       ROUND(SUM(oc.total_amount), 2)                            AS revenue,
       ROUND(SUM(oc.discount_amount), 2)                         AS discount_given,
       ROUND(SUM(oc.total_amount - oc.cost) / SUM(oc.total_amount) * 100, 2) AS margin_pct
FROM order_cost oc
LEFT JOIN promotions p ON p.promotion_id = oc.promotion_id
GROUP BY COALESCE(p.promo_name, 'No promotion')
ORDER BY orders DESC;


-- name: high_wastage_items
-- Step 23: wastage by item, with wastage % of units prepared.
WITH sold AS (
    SELECT oi.item_id, SUM(oi.quantity) AS units_sold
    FROM order_items oi JOIN orders o ON o.order_id = oi.order_id
    GROUP BY oi.item_id
),
wasted AS (
    SELECT item_id, SUM(wastage_quantity) AS units_wasted, SUM(wastage_cost) AS wastage_cost
    FROM wastage
    WHERE wastage_quantity BETWEEN 0 AND 1000
    GROUP BY item_id
)
SELECT mi.item_name,
       s.units_sold,
       w.units_wasted,
       ROUND(w.wastage_cost, 2)                                       AS wastage_cost,
       ROUND(w.units_wasted / (s.units_sold + w.units_wasted) * 100, 2) AS wastage_pct
FROM menu_items mi
JOIN sold s   ON s.item_id = mi.item_id
JOIN wasted w ON w.item_id = mi.item_id
ORDER BY wastage_pct DESC
LIMIT 20;


-- name: wastage_by_location_and_reason
-- Step 23: wastage by location and reason.
SELECT r.restaurant_name,
       w.wastage_reason,
       COUNT(*)                     AS records,
       ROUND(SUM(w.wastage_cost), 2) AS wastage_cost
FROM wastage w
JOIN restaurants r ON r.restaurant_id = w.restaurant_id
WHERE w.wastage_quantity BETWEEN 0 AND 1000
GROUP BY r.restaurant_name, w.wastage_reason
ORDER BY wastage_cost DESC;


-- name: rating_vs_profitability
-- Step 29: average rating against margin and sales per item.
WITH item_rating AS (
    SELECT item_id, AVG(rating_value) AS avg_rating, COUNT(*) AS ratings
    FROM ratings
    WHERE rating_value BETWEEN 1 AND 5
    GROUP BY item_id
),
item_sales AS (
    SELECT oi.item_id,
           SUM(oi.quantity) AS units,
           SUM(oi.line_total - oi.cost_price * oi.quantity) / SUM(oi.line_total) * 100 AS profit_pct
    FROM order_items oi JOIN orders o ON o.order_id = oi.order_id
    GROUP BY oi.item_id
)
SELECT mi.item_name,
       ROUND(ir.avg_rating, 2) AS avg_rating,
       ir.ratings,
       s.units,
       ROUND(s.profit_pct, 2)  AS profit_pct
FROM menu_items mi
JOIN item_rating ir ON ir.item_id = mi.item_id
JOIN item_sales s   ON s.item_id = mi.item_id
ORDER BY avg_rating DESC;


-- name: customer_rfm
-- Step 16: recency, frequency and monetary value per customer.
SELECT customer_id,
       DATEDIFF((SELECT MAX(order_date) FROM orders), MAX(order_date)) AS recency_days,
       COUNT(DISTINCT order_id)                                        AS frequency,
       ROUND(SUM(total_amount), 2)                                     AS monetary_value,
       ROUND(AVG(total_amount), 2)                                     AS avg_order_value
FROM orders
WHERE customer_id IS NOT NULL
GROUP BY customer_id
ORDER BY monetary_value DESC
LIMIT 1000;


-- name: duplicate_transactions
-- Step 31: potential duplicate transactions (same customer, restaurant, time and amount).
SELECT customer_id, restaurant_id, order_date, order_time, total_amount, COUNT(*) AS copies
FROM orders
GROUP BY customer_id, restaurant_id, order_date, order_time, total_amount
HAVING COUNT(*) > 1
ORDER BY copies DESC;
