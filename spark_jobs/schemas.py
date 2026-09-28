"""
Explicit Spark schemas for all 11 DineIQ source tables (shared by the
ingestion, data-quality and cleaning jobs).
"""

from pyspark.sql.types import (
    BooleanType, DateType, DoubleType, IntegerType, StringType,
    StructField, StructType, TimestampType,
)

schema_menu_categories = StructType([
    StructField("category_id", IntegerType()),
    StructField("category_name", StringType()),
    StructField("description", StringType()),
    StructField("is_active", BooleanType()),
    StructField("created_at", DateType())  # raw file stores a date only
])

schema_menu_items = StructType([
    StructField("item_id", IntegerType()),
    StructField("category_id", IntegerType()),
    StructField("item_name", StringType()),
    StructField("description", StringType()),
    StructField("base_price", DoubleType()),
    StructField("preparation_cost", DoubleType()),
    StructField("preparation_time_minutes", IntegerType()),
    StructField("is_available", BooleanType()),
    StructField("is_seasonal", BooleanType()),
    StructField("launch_date", DateType()),
    StructField("created_at", TimestampType())
])

schema_restaurants = StructType([
    StructField("restaurant_id", IntegerType()),
    StructField("restaurant_name", StringType()),
    StructField("location_city", StringType()),
    StructField("location_area", StringType()),
    StructField("address", StringType()),
    StructField("seating_capacity", IntegerType()),
    StructField("opening_time", StringType()),
    StructField("closing_time", StringType()),
    StructField("is_active", BooleanType()),
    StructField("created_at", TimestampType())
])

schema_customers = StructType([
    StructField("customer_id", IntegerType()),
    StructField("customer_code", StringType()),
    StructField("age_group", StringType()),
    StructField("gender", StringType()),
    StructField("city", StringType()),
    StructField("registration_date", DateType()),
    StructField("preferred_channel", StringType()),
    StructField("customer_segment", StringType()),
    StructField("is_active", BooleanType()),
    StructField("created_at", TimestampType())
])

schema_promotions = StructType([
    StructField("promotion_id", IntegerType()),
    StructField("promo_name", StringType()),
    StructField("promo_type", StringType()),
    StructField("discount_percentage", DoubleType()),
    StructField("discount_amount", DoubleType()),
    StructField("start_date", DateType()),
    StructField("end_date", DateType()),
    StructField("min_order_value", DoubleType()),
    StructField("is_active", BooleanType()),
    StructField("is_promotion_trap", BooleanType()),
    StructField("created_at", TimestampType())
])

schema_pricing_history = StructType([
    StructField("price_id", IntegerType()),
    StructField("item_id", IntegerType()),
    StructField("restaurant_id", IntegerType()),
    StructField("old_price", DoubleType()),
    StructField("new_price", DoubleType()),
    StructField("change_date", DateType()),
    StructField("change_reason", StringType())
])

schema_orders = StructType([
    StructField("order_id", IntegerType()),
    StructField("customer_id", IntegerType()),
    StructField("restaurant_id", IntegerType()),
    StructField("promotion_id", IntegerType()),
    StructField("order_date", DateType()),
    StructField("order_time", StringType()),
    StructField("order_channel", StringType()),
    StructField("order_status", StringType()),
    StructField("subtotal", DoubleType()),
    StructField("discount_amount", DoubleType()),
    StructField("total_amount", DoubleType()),
    StructField("created_at", TimestampType())
])

schema_order_items = StructType([
    StructField("order_item_id", IntegerType()),
    StructField("order_id", IntegerType()),
    StructField("item_id", IntegerType()),
    StructField("quantity", IntegerType()),
    StructField("unit_price", DoubleType()),
    StructField("cost_price", DoubleType()),
    StructField("discount_applied", DoubleType()),
    StructField("line_total", DoubleType()),
    StructField("created_at", TimestampType())
])

schema_ratings = StructType([
    StructField("rating_id", IntegerType()),
    StructField("customer_id", IntegerType()),
    StructField("item_id", IntegerType()),
    StructField("restaurant_id", IntegerType()),
    StructField("rating_value", DoubleType()),
    StructField("review_text", StringType()),
    StructField("rating_date", DateType()),
    StructField("rating_source", StringType()),
    StructField("created_at", TimestampType())
])

schema_inventory = StructType([
    StructField("inventory_id", IntegerType()),
    StructField("item_id", IntegerType()),
    StructField("restaurant_id", IntegerType()),
    StructField("stock_quantity", DoubleType()),
    StructField("reorder_level", DoubleType()),
    StructField("last_restocked_date", DateType()),
    StructField("unit_cost", DoubleType()),
    StructField("created_at", TimestampType())
])

schema_wastage = StructType([
    StructField("wastage_id", IntegerType()),
    StructField("item_id", IntegerType()),
    StructField("restaurant_id", IntegerType()),
    StructField("wastage_date", DateType()),
    StructField("wastage_quantity", DoubleType()),
    StructField("wastage_cost", DoubleType()),
    StructField("wastage_reason", StringType()),
    StructField("recorded_by", StringType()),
    StructField("created_at", TimestampType())
])


SCHEMAS = {
    "menu_categories": schema_menu_categories,
    "menu_items": schema_menu_items,
    "restaurants": schema_restaurants,
    "customers": schema_customers,
    "promotions": schema_promotions,
    "pricing_history": schema_pricing_history,
    "orders": schema_orders,
    "order_items": schema_order_items,
    "ratings": schema_ratings,
    "inventory": schema_inventory,
    "wastage": schema_wastage,
}
