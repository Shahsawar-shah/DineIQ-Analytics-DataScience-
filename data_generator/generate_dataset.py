"""
DineIQ Analytics - Synthetic Dataset Generator

Generates the raw CSV datasets used across the DineIQ pipeline:
menu categories, menu items, restaurants, customers, promotions,
pricing history, orders, order items, ratings, inventory, and wastage.

The data deliberately contains "tricky" business patterns (loss-making
items, promotion traps, rating anomalies, ...) and data quality issues
(missing ids, duplicates, invalid values) for the analytics pipeline to find.

Run from anywhere:  python data_generator/generate_dataset.py
Output goes to <project root>/raw_data/.
"""

from faker import Faker
import numpy as np
import pandas as pd
import random
import os
from pathlib import Path
from datetime import datetime


# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
NUM_CATEGORIES = 10
NUM_MENU_ITEMS = 150
NUM_RESTAURANTS = 20
NUM_CUSTOMERS = 50000
NUM_ORDERS = 100000
NUM_ORDER_ITEMS = 1000000
NUM_RATINGS = 100000
NUM_WASTAGE = 50000
RANDOM_SEED = 42
OUTPUT_DIR = "raw_data/"

PROJECT_ROOT = Path(__file__).resolve().parent.parent
OUTPUT_PATH = PROJECT_ROOT / OUTPUT_DIR

# All dates are expressed as a day index: 0 = one year ago, LAST_DAY = today
TODAY = pd.Timestamp.today().normalize()
START_DATE = TODAY - pd.Timedelta(days=365)
NUM_DAYS = 366
LAST_DAY = NUM_DAYS - 1
RECENT_START = NUM_DAYS - 30  # first day of the "last 30 days" window

fake = Faker()
GENERATED_FILES = []  # (filename, rows, bytes) for print_summary()

# Tricky item groups (item_id ranges)
LOSS_MAKING_ITEMS = np.arange(1, 6)
HIGH_MARGIN_LOW_VISIBILITY_ITEMS = np.arange(6, 11)
HIGH_WASTAGE_ITEMS = np.arange(11, 16)
PROMOTION_DEPENDENT_ITEMS = np.arange(16, 21)
WEEKEND_ONLY_ITEMS = np.arange(21, 26)
PRICE_SENSITIVE_ITEMS = np.arange(30, 41)
LOCATION_SPECIFIC_ITEMS = np.arange(50, 61)
RATING_SPIKE_ITEMS = np.arange(80, 86)
RATING_DROP_ITEMS = np.arange(86, 91)
FAKE_REVIEW_ITEMS = np.arange(91, 96)
NEW_ITEMS = np.arange(141, 151)
LOW_STOCK_ITEMS = np.arange(1, 11)

# Restaurant performance tiers (restaurant_id ranges)
HIGH_TIER_MAX = 5       # 1-5 high performing
AVERAGE_TIER_MAX = 15   # 6-15 average, 16-20 low performing
TIER_TRAFFIC_WEIGHTS = (2.0, 1.0, 0.5)

PROMO_TRAP_IDS = np.array([1, 2, 3])

CHANNELS = ["Dine-in", "Takeaway", "App", "Delivery"]
CHANNEL_PROBS = [0.45, 0.25, 0.20, 0.10]

PEAK_HOURS = [12, 13, 19, 20]  # 12:00-14:00 and 19:00-21:00
PEAK_SHARE = 0.40
WEEKEND_BOOST = 1.4

# Behaviour tuning
PROMO_USAGE_RATE = 0.15          # chance a non promo-driven order uses an active promo
LOYAL_BASKET_WEIGHT = 1.6        # loyal customers order bigger baskets
MIN_LINES_PER_ORDER = 3
TRAP_LOSS_LINE_SHARE = 0.60      # share of trap-order lines that are loss-making items
LOSS_ITEM_ORDER_SHARE = 0.15
HIDDEN_ITEM_ORDER_SHARE = 0.03
QUANTITIES = [1, 2, 3, 4]
QUANTITY_PROBS = [0.65, 0.22, 0.09, 0.04]
ANOMALY_RATINGS_PER_ITEM = 400
AT_RISK_INACTIVE_DAYS = 60

# Data quality issue rates
MISSING_CUSTOMER_RATE = 0.03
DUPLICATE_ORDER_RATE = 0.02
CANCELLED_ORDER_RATE = 0.01
NEGATIVE_QUANTITY_RATE = 0.01
MISSING_RATING_RATE = 0.02
INVALID_RATING_RATE = 0.01
MISSING_REVIEW_TEXT_RATE = 0.30
WASTAGE_OUTLIER_RATE = 0.01
WASTAGE_OUTLIER_VALUE = 9999

# Internal columns generate_orders() hands to generate_order_items();
# they are dropped before orders.csv is written
ORDER_HELPER_COLUMNS = ["_basket_weight", "_discount_pct", "_discount_cap"]


# ---------------------------------------------------------------------------
# Reference data
# ---------------------------------------------------------------------------
CATEGORY_DATA = [
    (1, "Appetizers", "Starters and small plates to begin the meal"),
    (2, "Main Course", "Hearty signature mains and traditional curries"),
    (3, "Beverages", "Hot and cold drinks, shakes and fresh juices"),
    (4, "Desserts", "Traditional and continental sweets"),
    (5, "Soups", "Warm soups and broths"),
    (6, "Salads", "Fresh salads and light bowls"),
    (7, "Grills", "BBQ, kababs and grilled platters"),
    (8, "Seafood", "Fish, prawns and seafood specialities"),
    (9, "Pasta", "Italian and fusion pasta dishes"),
    (10, "Breakfast", "Desi and continental breakfast"),
]

CATEGORY_PRICE_RANGES = {
    1: (5, 15), 2: (15, 35), 3: (3, 10), 4: (6, 14), 5: (6, 12),
    6: (8, 16), 7: (20, 45), 8: (25, 55), 9: (12, 25), 10: (8, 18),
}
BEVERAGES_CATEGORY_ID = 3

MENU_ITEM_NAMES = {
    1: ["Chicken Wings", "Spring Rolls", "Samosa Platter", "Garlic Bread",
        "Mozzarella Sticks", "Chicken Tikka Bites", "Loaded Fries",
        "Nachos Supreme", "Dynamite Prawns", "Stuffed Mushrooms",
        "Onion Rings", "Chicken Pakora", "Hummus & Pita", "Bruschetta",
        "Seekh Kabab Rolls"],
    2: ["Chicken Karahi", "Mutton Biryani", "Chicken Biryani", "Butter Chicken",
        "Beef Nihari", "Chicken Handi", "Mutton Korma", "Daal Makhani",
        "Palak Paneer", "Chicken Jalfrezi", "Haleem", "Beef Pulao",
        "Chicken Tikka Masala", "Mutton Karahi", "Vegetable Curry"],
    3: ["Mint Margarita", "Fresh Lime Soda", "Mango Lassi", "Sweet Lassi",
        "Cold Coffee", "Cappuccino", "Doodh Patti Chai", "Green Tea",
        "Fresh Orange Juice", "Strawberry Shake", "Chocolate Shake",
        "Peach Iced Tea", "Mineral Water", "Soft Drink", "Kashmiri Chai"],
    4: ["Gulab Jamun", "Kheer", "Chocolate Lava Cake", "Brownie with Ice Cream",
        "Rasmalai", "Cheesecake", "Gajar Halwa", "Tiramisu", "Kulfi",
        "Fruit Trifle", "Apple Pie", "Shahi Tukray", "Ice Cream Sundae",
        "Caramel Custard", "Falooda"],
    5: ["Chicken Corn Soup", "Hot & Sour Soup", "Cream of Mushroom",
        "Tomato Basil Soup", "Tom Yum Soup", "Lentil Soup", "Minestrone",
        "French Onion Soup", "Chicken Noodle Soup", "Seafood Chowder",
        "Broccoli Cheddar Soup", "Wonton Soup", "Mulligatawny",
        "Pumpkin Soup", "Vegetable Soup"],
    6: ["Caesar Salad", "Greek Salad", "Garden Salad", "Chicken Caesar",
        "Russian Salad", "Fattoush", "Quinoa Salad", "Cobb Salad",
        "Pasta Salad", "Chickpea Salad", "Waldorf Salad", "Tuna Salad",
        "Grilled Chicken Salad", "Kachumber Salad", "Asian Sesame Salad"],
    7: ["Beef Steak", "Chicken Tikka", "Seekh Kabab", "Malai Boti",
        "Mixed Grill Platter", "Lamb Chops", "Reshmi Kabab",
        "Grilled Chicken Breast", "BBQ Ribs", "Behari Boti", "Chapli Kabab",
        "T-Bone Steak", "Tandoori Chicken", "Grilled Fish Tikka",
        "Chicken Shashlik"],
    8: ["Grilled Prawns", "Fish & Chips", "Lobster Thermidor", "Prawn Karahi",
        "Grilled Salmon", "Fish Tikka", "Calamari Rings",
        "Garlic Butter Prawns", "Seafood Platter", "Crab Curry",
        "Lahori Fried Fish", "Prawn Tempura", "Fish Masala",
        "Thai Prawn Curry", "Grilled Pomfret"],
    9: ["Fettuccine Alfredo", "Spaghetti Bolognese", "Penne Arrabiata",
        "Chicken Lasagna", "Mac & Cheese", "Pesto Pasta", "Carbonara",
        "Seafood Linguine", "Chicken Tikka Pasta", "Ravioli", "Baked Ziti",
        "Pink Sauce Pasta", "Aglio e Olio", "Beef Lasagna",
        "Spinach Tortellini"],
    10: ["Halwa Puri", "Paratha Roll", "Omelette Platter", "Pancakes",
         "French Toast", "Eggs Benedict", "Anda Paratha",
         "Full English Breakfast", "Waffles", "Chana Puri", "Club Sandwich",
         "Avocado Toast", "Aloo Paratha", "Cheese Omelette", "Granola Bowl"],
}

DESCRIPTION_STYLES = [
    "Freshly prepared", "Chef's signature", "House favourite", "Classic",
    "Traditional", "Slow-cooked", "Hand-crafted", "Customer favourite",
]

RESTAURANT_LOCATIONS = [
    ("Karachi", "DHA"), ("Karachi", "Clifton"), ("Karachi", "Gulshan"),
    ("Karachi", "Saddar"), ("Karachi", "North Nazimabad"),
    ("Karachi", "Korangi"), ("Karachi", "Bahria Town"), ("Karachi", "Malir"),
    ("Lahore", "Gulberg"), ("Lahore", "DHA"), ("Lahore", "Johar Town"),
    ("Lahore", "Model Town"), ("Lahore", "Bahria Town"),
    ("Lahore", "Garden Town"),
    ("Islamabad", "F-7"), ("Islamabad", "F-10"), ("Islamabad", "G-9"),
    ("Islamabad", "Blue Area"),
    ("Rawalpindi", "Saddar"), ("Rawalpindi", "Bahria Town"),
]
STREET_NAMES = [
    "Main Boulevard", "Commercial Area", "Service Road", "Market Street",
    "Khayaban-e-Ittehad", "Shahrah-e-Faisal", "Jinnah Avenue", "Mall Road",
]

AGE_GROUPS = ["18-24", "25-34", "35-44", "45-54", "55+"]
AGE_PROBS = [0.30, 0.35, 0.20, 0.10, 0.05]
GENDERS = ["Male", "Female", "Other"]
GENDER_PROBS = [0.55, 0.40, 0.05]
CITIES = ["Karachi", "Lahore", "Islamabad", "Rawalpindi"]
CITY_PROBS = [0.50, 0.30, 0.15, 0.05]

# registered_days_ago and orders_per_year ranges are inclusive
CUSTOMER_SEGMENTS = {
    "High-Value Loyal": {"share": 0.20, "registered_days_ago": (180, 365), "orders_per_year": (15, 30)},
    "Promotion-Driven": {"share": 0.15, "registered_days_ago": (90, 240), "orders_per_year": (5, 15)},
    "At-Risk": {"share": 0.10, "registered_days_ago": (90, 180), "orders_per_year": (3, 8)},
    "New": {"share": 0.10, "registered_days_ago": (0, 29), "orders_per_year": (1, 3)},
    "Occasional": {"share": 0.45, "registered_days_ago": (30, 365), "orders_per_year": (2, 8)},
}

TRAP_PROMOTIONS = [
    ("Mega Sale 50% Off", 50),
    ("Flash Deal 45% Off", 45),
    ("Super Discount 40% Off", 40),
]
NORMAL_PROMOTION_TYPES = {
    "Weekend Deal": "Weekend",
    "Happy Hour": "Time-Based",
    "Loyalty Reward": "Loyalty",
    "Seasonal Special": "Seasonal",
    "Family Combo": "Combo",
    "Lunch Special": "Time-Based",
    "Dinner Delight": "Time-Based",
    "Student Offer": "Segment",
    "Corporate Deal": "Segment",
    "App Exclusive": "Channel",
    "First Order": "Acquisition",
    "Birthday Special": "Loyalty",
}

PRICE_INCREASE_REASONS = ["Ingredient Cost Increase", "Seasonal Adjustment", "Demand Based"]
PRICE_DECREASE_REASONS = ["Competitive Pricing", "Promotional Reset", "Seasonal Adjustment", "Demand Based"]

RATING_SOURCES = ["App", "Website", "Third-party", "Direct"]
RATING_SOURCE_PROBS = [0.40, 0.30, 0.20, 0.10]
POSITIVE_REVIEWS = [
    "Absolutely delicious, will order again!", "Great taste and generous portion.",
    "Fresh, hot and full of flavour.", "One of the best dishes on the menu.",
    "Loved it, perfectly cooked.", "Excellent quality and quick service.",
]
NEUTRAL_REVIEWS = [
    "It was okay, nothing special.", "Decent taste but a bit pricey.",
    "Average portion size.", "Good but could use more seasoning.",
    "Fine for the price.",
]
NEGATIVE_REVIEWS = [
    "Food was cold when it arrived.", "Too salty, not worth it.",
    "Quality has gone down recently.", "Portion was very small.",
    "Took too long and tasted stale.", "Disappointed, will not order again.",
]
FAKE_REVIEW_TEXTS = [
    "Best food ever!!! 5 stars!!!", "Amazing amazing amazing!",
    "Perfect in every way, must try!", "10/10 best in town!!!",
]

WASTAGE_REASONS = ["Overproduction", "Spoilage", "Prep Error", "Expired", "Customer Return"]
WASTAGE_REASON_PROBS = [0.35, 0.25, 0.20, 0.15, 0.05]
STAFF_FIRST_NAMES = [
    "Ali", "Ahmed", "Usman", "Bilal", "Hamza", "Fatima", "Ayesha", "Sana",
    "Zainab", "Hira", "Imran", "Kamran", "Saad", "Maryam", "Nida", "Faisal",
]
STAFF_LAST_NAMES = [
    "Khan", "Ahmed", "Malik", "Hussain", "Qureshi", "Siddiqui", "Sheikh",
    "Butt", "Raza", "Iqbal", "Chaudhry", "Mirza",
]
STAFF_PER_RESTAURANT = 4


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------
def _day_to_date(days):
    """Day index (0 = one year ago) -> DatetimeIndex."""
    return START_DATE + pd.to_timedelta(np.asarray(days), unit="D")


def _date_to_day(dates):
    """Dates -> numpy array of day indexes relative to START_DATE."""
    return (pd.DatetimeIndex(dates).normalize() - START_DATE).days.to_numpy()


def _random_times(dates):
    """Add a random time of day to each date."""
    return dates + pd.to_timedelta(np.random.randint(0, 86400, len(dates)), unit="s")


def _exact_mask(n, rate):
    """Boolean mask with exactly round(n * rate) randomly placed True values."""
    mask = np.zeros(n, dtype=bool)
    mask[np.random.choice(n, int(round(n * rate)), replace=False)] = True
    return mask


def _day_weights():
    """Relative order volume per day; weekends get WEEKEND_BOOST."""
    weekday = _day_to_date(np.arange(NUM_DAYS)).dayofweek
    return np.where(weekday >= 5, WEEKEND_BOOST, 1.0)


def _sample_days(lo, hi, weights):
    """Sample one day per row from [lo, hi] (inclusive), weighted by `weights`."""
    cum = np.concatenate([[0.0], np.cumsum(weights)])
    u = cum[lo] + np.random.random(len(lo)) * (cum[hi + 1] - cum[lo])
    return np.clip(np.searchsorted(cum, u, side="right") - 1, lo, hi)


def _restaurant_weights(restaurant_ids):
    """Traffic weight per restaurant by performance tier."""
    return np.select(
        [restaurant_ids <= HIGH_TIER_MAX, restaurant_ids <= AVERAGE_TIER_MAX],
        TIER_TRAFFIC_WEIGHTS[:2],
        default=TIER_TRAFFIC_WEIGHTS[2],
    )


def _item_lookup(items, column):
    """Array indexed by item_id holding `column` values."""
    lookup = np.zeros(items["item_id"].max() + 1, dtype=float)
    lookup[items["item_id"].to_numpy()] = items[column].to_numpy()
    return lookup


def _launch_day_lookup(items):
    """Array indexed by item_id holding each item's launch day (clipped to 0)."""
    lookup = np.zeros(items["item_id"].max() + 1, dtype=np.int64)
    lookup[items["item_id"].to_numpy()] = np.clip(_date_to_day(items["launch_date"]), 0, LAST_DAY)
    return lookup


def _shift_after_launch(days, item_ids, launch_lookup):
    """Move records dated before their item's launch to a random later day."""
    days = days.copy()
    launch = launch_lookup[item_ids]
    early = days < launch
    span = NUM_DAYS - launch[early]
    days[early] = launch[early] + (np.random.random(early.sum()) * span).astype(np.int64)
    return days


def _inject_items(line_item, locked, group, n_lines, preferred, preferred_share):
    """
    Overwrite `n_lines` unlocked order lines with items from `group`, placing
    `preferred_share` of them on lines where `preferred` is True.
    Modifies line_item and locked in place.
    """
    n_preferred = int(round(n_lines * preferred_share))
    for mask, k in ((preferred, n_preferred), (~preferred, n_lines - n_preferred)):
        candidates = np.flatnonzero(mask & ~locked)
        k = min(k, candidates.size)
        positions = np.random.choice(candidates, k, replace=False)
        line_item[positions] = np.random.choice(group, k)
        locked[positions] = True


# ---------------------------------------------------------------------------
# Table generators
# ---------------------------------------------------------------------------
def generate_menu_categories():
    print(f"Generating {NUM_CATEGORIES} menu categories...")
    categories = pd.DataFrame(
        CATEGORY_DATA[:NUM_CATEGORIES],
        columns=["category_id", "category_name", "description"],
    )
    categories["is_active"] = True
    categories["created_at"] = START_DATE - pd.Timedelta(days=730)
    return categories


def generate_menu_items(categories):
    n = NUM_MENU_ITEMS
    print(f"Generating {n} menu items...")
    item_ids = np.arange(1, n + 1)
    category_ids = categories["category_id"].to_numpy()
    category_names = dict(zip(categories["category_id"], categories["category_name"]))

    # Round-robin categories so every tricky item group spans several categories
    item_category = category_ids[(item_ids - 1) % len(category_ids)]
    slot = (item_ids - 1) // len(category_ids)
    names = [
        MENU_ITEM_NAMES[c][s % len(MENU_ITEM_NAMES[c])]
        for c, s in zip(item_category, slot)
    ]

    low = np.array([CATEGORY_PRICE_RANGES[c][0] for c in item_category])
    high = np.array([CATEGORY_PRICE_RANGES[c][1] for c in item_category])
    base_price = np.random.uniform(low, high)
    preparation_cost = base_price * np.random.uniform(0.30, 0.45, n)
    prep_time = np.where(
        item_category == BEVERAGES_CATEGORY_ID,
        np.random.randint(3, 11, n),
        np.random.randint(10, 41, n),
    )
    is_available = np.random.random(n) < 0.95
    is_seasonal = np.random.random(n) < 0.10
    launch_days_ago = np.random.randint(400, 1500, n)

    # --- Tricky items ---
    loss = np.isin(item_ids, LOSS_MAKING_ITEMS)
    preparation_cost[loss] = base_price[loss] * 1.1
    names = [f"Special {name}" if is_loss else name for name, is_loss in zip(names, loss)]

    hidden = np.isin(item_ids, HIGH_MARGIN_LOW_VISIBILITY_ITEMS)
    preparation_cost[hidden] = base_price[hidden] * 0.15
    is_seasonal[hidden] = True

    high_wastage = np.isin(item_ids, HIGH_WASTAGE_ITEMS)
    prep_time[high_wastage] = np.random.randint(50, 61, high_wastage.sum())

    promo_dependent = np.isin(item_ids, PROMOTION_DEPENDENT_ITEMS)
    base_price[promo_dependent] *= 1.2

    weekend = np.isin(item_ids, WEEKEND_ONLY_ITEMS)
    is_seasonal[weekend] = True

    new = np.isin(item_ids, NEW_ITEMS)
    launch_days_ago[new] = np.random.randint(1, 31, new.sum())

    # Tricky and new items must be on the menu to show their pattern
    is_available[(item_ids <= WEEKEND_ONLY_ITEMS.max()) | new] = True

    descriptions = [
        f"{random.choice(DESCRIPTION_STYLES)} {name} from our "
        f"{category_names[c].lower()} menu"
        for name, c in zip(names, item_category)
    ]
    for i in np.flatnonzero(weekend):
        descriptions[i] = f"Weekend Special - {descriptions[i]}"

    launch_date = TODAY - pd.to_timedelta(launch_days_ago, unit="D")
    return pd.DataFrame({
        "item_id": item_ids,
        "category_id": item_category,
        "item_name": names,
        "description": descriptions,
        "base_price": np.round(base_price, 2),
        "preparation_cost": np.round(preparation_cost, 2),
        "preparation_time_minutes": prep_time,
        "is_available": is_available,
        "is_seasonal": is_seasonal,
        "launch_date": launch_date,
        "created_at": _random_times(launch_date),
    })


def generate_restaurants():
    locations = RESTAURANT_LOCATIONS[:NUM_RESTAURANTS]
    n = len(locations)
    print(f"Generating {n} restaurants...")
    ids = np.arange(1, n + 1)
    cities = [city for city, _ in locations]
    areas = [area for _, area in locations]

    seating_capacity = np.select(
        [ids <= HIGH_TIER_MAX, ids <= AVERAGE_TIER_MAX],
        [np.random.randint(150, 201, n), np.random.randint(80, 131, n)],
        default=np.random.randint(40, 71, n),
    )
    addresses = [
        f"Plot {fake.building_number()}, {random.choice(STREET_NAMES)}, {area}, {city}"
        for city, area in locations
    ]
    created_at = TODAY - pd.to_timedelta(np.random.randint(500, 2000, n), unit="D")

    return pd.DataFrame({
        "restaurant_id": ids,
        "restaurant_name": [f"DineIQ {area} {city}" for city, area in locations],
        "location_city": cities,
        "location_area": areas,
        "address": addresses,
        "seating_capacity": seating_capacity,
        "opening_time": np.random.choice(["08:00", "11:00", "12:00"], n),
        "closing_time": np.random.choice(["23:00", "00:00", "01:00", "02:00"], n),
        "is_active": True,
        "created_at": _random_times(created_at),
    })


def generate_customers():
    n = NUM_CUSTOMERS
    print(f"Generating {n:,} customers...")
    ids = np.arange(1, n + 1)

    segment_names = list(CUSTOMER_SEGMENTS)
    segment_sizes = [int(round(CUSTOMER_SEGMENTS[s]["share"] * n)) for s in segment_names]
    segment_sizes[-1] = n - sum(segment_sizes[:-1])
    segments = np.repeat(segment_names, segment_sizes)
    np.random.shuffle(segments)

    registered_days_ago = np.zeros(n, dtype=np.int64)
    for name, cfg in CUSTOMER_SEGMENTS.items():
        mask = segments == name
        lo, hi = cfg["registered_days_ago"]
        registered_days_ago[mask] = np.random.randint(lo, hi + 1, mask.sum())

    channel = np.random.choice(CHANNELS, n, p=CHANNEL_PROBS).astype(object)
    loyal = segments == "High-Value Loyal"
    channel[loyal] = np.random.choice(["Dine-in", "App"], loyal.sum())

    active_rate = np.where(segments == "At-Risk", 0.70, 0.97)
    registration_date = TODAY - pd.to_timedelta(registered_days_ago, unit="D")

    return pd.DataFrame({
        "customer_id": ids,
        "customer_code": [f"CUST-{i:06d}" for i in ids],
        "age_group": np.random.choice(AGE_GROUPS, n, p=AGE_PROBS),
        "gender": np.random.choice(GENDERS, n, p=GENDER_PROBS),
        "city": np.random.choice(CITIES, n, p=CITY_PROBS),
        "registration_date": registration_date,
        "preferred_channel": channel,
        "customer_segment": segments,
        "is_active": np.random.random(n) < active_rate,
        "created_at": _random_times(registration_date),
    })


def generate_promotions():
    """
    discount_amount is the maximum discount per order (cap). Promotion traps
    have no cap and no minimum order value, which is what makes them costly.
    """
    names = [name for name, _ in TRAP_PROMOTIONS] + list(NORMAL_PROMOTION_TYPES)
    n = len(names)
    print(f"Generating {n} promotions...")
    ids = np.arange(1, n + 1)
    is_trap = np.isin(ids, PROMO_TRAP_IDS)

    discount_percentage = np.concatenate([
        [pct for _, pct in TRAP_PROMOTIONS],
        np.random.randint(10, 26, n - len(TRAP_PROMOTIONS)),
    ])
    promo_type = [
        "Flash Sale" if trap else NORMAL_PROMOTION_TYPES[name]
        for name, trap in zip(names, is_trap)
    ]

    # One non-overlapping time slot per promotion, shuffled across the year;
    # the promotion in the final slot is still running today
    slot_len = NUM_DAYS // n
    slot = np.random.permutation(n)
    start_day = slot * slot_len + np.random.randint(0, 5, n)
    end_day = start_day + np.random.randint(6, 18, n)
    last_slot = slot == n - 1
    end_day[last_slot] = LAST_DAY + np.random.randint(7, 31, last_slot.sum())

    start_date = _day_to_date(start_day)
    end_date = _day_to_date(end_day)
    created_at = start_date - pd.to_timedelta(np.random.randint(3, 15, n), unit="D")

    return pd.DataFrame({
        "promotion_id": ids,
        "promo_name": names,
        "promo_type": promo_type,
        "discount_percentage": discount_percentage,
        "discount_amount": np.where(is_trap, np.nan, np.random.randint(15, 41, n)),
        "start_date": start_date,
        "end_date": end_date,
        "min_order_value": np.where(is_trap, 0, np.random.choice([20, 25, 30, 40, 50], n)),
        "is_active": end_date >= TODAY,
        "is_promotion_trap": is_trap,
        "created_at": _random_times(created_at),
    })


def generate_pricing_history(items, restaurants):
    print("Generating pricing history...")
    restaurant_ids = restaurants["restaurant_id"].to_numpy()
    rows = []

    for item in items.itertuples(index=False):
        sensitive = item.item_id in PRICE_SENSITIVE_ITEMS
        n_changes = np.random.randint(4, 7) if sensitive else np.random.randint(2, 5)
        launch_day = max(0, (item.launch_date - START_DATE).days)
        change_days = np.sort(np.random.randint(launch_day, NUM_DAYS, n_changes))

        if sensitive:
            # Large swings that alternate direction so the price oscillates
            direction = np.where(np.arange(n_changes) % 2 == 0, 1, -1) * np.random.choice([1, -1])
            factors = 1 + direction * np.random.uniform(0.15, 0.25, n_changes)
        else:
            decrease = np.random.random(n_changes) < 0.20
            factors = np.where(
                decrease,
                1 - np.random.uniform(0.05, 0.10, n_changes),
                1 + np.random.uniform(0.05, 0.15, n_changes),
            )

        # Work backwards from the current menu price so the latest change lands on it
        prices = item.base_price / np.prod(factors) * np.concatenate([[1.0], np.cumprod(factors)])
        prices[-1] = item.base_price
        prices = np.round(prices, 2)

        for i in range(n_changes):
            reasons = PRICE_INCREASE_REASONS if factors[i] > 1 else PRICE_DECREASE_REASONS
            rows.append({
                "item_id": item.item_id,
                "restaurant_id": np.random.choice(restaurant_ids),
                "old_price": prices[i],
                "new_price": prices[i + 1],
                "change_date": _day_to_date([change_days[i]])[0],
                "change_reason": random.choice(reasons),
            })

    pricing = pd.DataFrame(rows).sort_values(["change_date", "item_id"], kind="stable")
    pricing.insert(0, "price_id", np.arange(1, len(pricing) + 1))
    return pricing.reset_index(drop=True)


def generate_orders(customers, restaurants, promotions):
    """
    Returns NUM_ORDERS orders plus DUPLICATE_ORDER_RATE exact duplicate rows.
    subtotal / discount_amount / total_amount are left empty here and filled
    in by generate_order_items() from the actual line items.
    """
    n = NUM_ORDERS
    print(f"Generating {n:,} orders...")
    segments = customers["customer_segment"].to_numpy()

    # --- How many orders each customer places ---
    # Draw each customer's orders_per_year from their segment range, then scale
    # everything down proportionally to hit exactly NUM_ORDERS. Loyal, At-Risk and
    # New customers are guaranteed at least one order.
    raw = np.zeros(len(customers), dtype=np.int64)
    for name, cfg in CUSTOMER_SEGMENTS.items():
        mask = segments == name
        lo, hi = cfg["orders_per_year"]
        raw[mask] = np.random.randint(lo, hi + 1, mask.sum())
    guaranteed = np.isin(segments, ["High-Value Loyal", "At-Risk", "New"]).astype(np.int64)
    weights = (raw - guaranteed).astype(float)
    counts = guaranteed + np.random.multinomial(n - guaranteed.sum(), weights / weights.sum())

    # New customers: 1-3 orders max; any overflow goes to loyal customers
    new = segments == "New"
    new_max = CUSTOMER_SEGMENTS["New"]["orders_per_year"][1]
    overflow = int(np.clip(counts[new] - new_max, 0, None).sum())
    counts[new] = np.minimum(counts[new], new_max)
    if overflow:
        loyal_idx = np.flatnonzero(segments == "High-Value Loyal")
        np.add.at(counts, np.random.choice(loyal_idx, overflow), 1)

    cust_idx = np.repeat(np.arange(len(customers)), counts)
    order_segment = segments[cust_idx]

    # --- Order dates: between registration and today, weekends boosted ---
    lo = np.clip(_date_to_day(customers["registration_date"])[cust_idx], 0, LAST_DAY)
    hi = np.full(n, LAST_DAY)
    hi[order_segment == "At-Risk"] = LAST_DAY - AT_RISK_INACTIVE_DAYS
    lo = np.minimum(lo, hi)
    day_weights = _day_weights()
    order_day = _sample_days(lo, hi, day_weights)

    promo_ids = promotions["promotion_id"].to_numpy()
    promo_start = np.clip(_date_to_day(promotions["start_date"]), 0, LAST_DAY)
    promo_end = np.clip(_date_to_day(promotions["end_date"]), 0, LAST_DAY)
    day_promo = np.zeros(NUM_DAYS, dtype=np.int64)
    for pid, start, end in zip(promo_ids, promo_start, promo_end):
        day_promo[start:end + 1] = pid

    # Promotion-Driven: 80% of their orders moved into a promotion window
    promo_driven = (order_segment == "Promotion-Driven") & (np.random.random(n) < 0.80)
    pending = np.flatnonzero(promo_driven)
    for _ in range(25):
        if pending.size == 0:
            break
        pick = np.random.randint(0, len(promo_ids), pending.size)
        start = np.maximum(lo[pending], promo_start[pick])
        end = np.minimum(hi[pending], promo_end[pick])
        fits = start <= end
        order_day[pending[fits]] = _sample_days(start[fits], end[fits], day_weights)
        pending = pending[~fits]

    active_promo = day_promo[order_day]
    use_rate = np.where(promo_driven, 1.0, PROMO_USAGE_RATE)
    promotion_id = np.where((active_promo > 0) & (np.random.random(n) < use_rate), active_promo, 0)

    # --- Restaurant: mostly in the customer's city, busier tiers get more orders ---
    restaurant_ids = restaurants["restaurant_id"].to_numpy()
    restaurant_city = restaurants["location_city"].to_numpy()
    traffic = _restaurant_weights(restaurant_ids)
    order_city = customers["city"].to_numpy()[cust_idx]
    restaurant_id = np.random.choice(restaurant_ids, n, p=traffic / traffic.sum())
    locals_ = np.random.random(n) >= 0.10
    for city in np.unique(restaurant_city):
        mask = locals_ & (order_city == city)
        in_city = restaurant_city == city
        w = traffic[in_city]
        restaurant_id[mask] = np.random.choice(restaurant_ids[in_city], mask.sum(), p=w / w.sum())

    # --- Time of day: 40% peak hours, fewer orders between 00:00-07:00 ---
    off_peak_hours = np.array([h for h in range(24) if h not in PEAK_HOURS])
    off_peak_w = np.where(off_peak_hours < 7, 0.15, 1.0)
    hour = np.where(
        np.random.random(n) < PEAK_SHARE,
        np.random.choice(PEAK_HOURS, n),
        np.random.choice(off_peak_hours, n, p=off_peak_w / off_peak_w.sum()),
    )
    order_date = _day_to_date(order_day)
    created_at = order_date + pd.to_timedelta(hour * 3600 + np.random.randint(0, 3600, n), unit="s")

    pct_lookup = np.zeros(promo_ids.max() + 1)
    pct_lookup[promo_ids] = promotions["discount_percentage"].to_numpy() / 100
    cap_lookup = np.full(promo_ids.max() + 1, np.inf)
    cap_lookup[promo_ids] = promotions["discount_amount"].fillna(np.inf).to_numpy()

    orders = pd.DataFrame({
        "customer_id": customers["customer_id"].to_numpy()[cust_idx],
        "restaurant_id": restaurant_id,
        "promotion_id": promotion_id,
        "order_date": order_date,
        "order_time": created_at.strftime("%H:%M:%S"),
        "order_channel": np.random.choice(CHANNELS, n, p=CHANNEL_PROBS),
        "order_status": "completed",
        "subtotal": np.nan,
        "discount_amount": np.nan,
        "total_amount": np.nan,
        "created_at": created_at,
        "_basket_weight": np.where(order_segment == "High-Value Loyal", LOYAL_BASKET_WEIGHT, 1.0),
        "_discount_pct": pct_lookup[promotion_id],
        "_discount_cap": cap_lookup[promotion_id],
    })
    orders = orders.sort_values("created_at", kind="stable").reset_index(drop=True)
    orders.insert(0, "order_id", np.arange(1, n + 1))
    orders["promotion_id"] = orders["promotion_id"].astype("Int64").mask(orders["promotion_id"] == 0)

    # --- Data quality issues ---
    orders["customer_id"] = orders["customer_id"].astype("Int64")
    orders.loc[_exact_mask(n, MISSING_CUSTOMER_RATE), "customer_id"] = pd.NA
    orders.loc[_exact_mask(n, CANCELLED_ORDER_RATE), "order_status"] = "cancelled"
    duplicates = orders.iloc[np.random.choice(n, int(round(n * DUPLICATE_ORDER_RATE)), replace=False)]
    orders = pd.concat([orders, duplicates]).sort_values("order_id", kind="stable")
    return orders.reset_index(drop=True)


def generate_order_items(orders, items):
    """
    Builds exactly NUM_ORDER_ITEMS lines for the unique orders, then writes
    each order's subtotal / discount_amount / total_amount back into `orders`
    (in place) and drops its helper columns.
    """
    print(f"Generating {NUM_ORDER_ITEMS:,} order items...")
    unique_orders = orders.drop_duplicates("order_id").reset_index(drop=True)
    n_orders = len(unique_orders)

    # --- Lines per order: at least 3, remainder spread so the total is exact ---
    basket_weight = unique_orders["_basket_weight"].to_numpy()
    extra_lines = NUM_ORDER_ITEMS - MIN_LINES_PER_ORDER * n_orders
    counts = MIN_LINES_PER_ORDER + np.random.multinomial(extra_lines, basket_weight / basket_weight.sum())
    n = int(counts.sum())
    line_order = np.repeat(np.arange(n_orders), counts)
    first_line = np.concatenate([[0], np.cumsum(counts)[:-1]])

    promo = unique_orders["promotion_id"].fillna(0).to_numpy(dtype=np.int64)
    line_day = _date_to_day(unique_orders["order_date"])[line_order]
    line_has_promo = (promo > 0)[line_order]
    line_weekend = (pd.DatetimeIndex(unique_orders["order_date"]).dayofweek.to_numpy() >= 5)[line_order]
    line_high_tier = (unique_orders["restaurant_id"].to_numpy() <= HIGH_TIER_MAX)[line_order]

    # --- Base basket: regular items with uneven popularity ---
    item_ids = items["item_id"].to_numpy()
    special_items = np.concatenate([
        LOSS_MAKING_ITEMS, HIGH_MARGIN_LOW_VISIBILITY_ITEMS,
        PROMOTION_DEPENDENT_ITEMS, WEEKEND_ONLY_ITEMS, LOCATION_SPECIFIC_ITEMS,
    ])
    base_pool = item_ids[~np.isin(item_ids, special_items)]
    popularity = np.random.lognormal(0.0, 0.6, base_pool.size)
    line_item = np.random.choice(base_pool, n, p=popularity / popularity.sum())
    locked = np.zeros(n, dtype=bool)

    # --- Promotion traps: baskets full of loss-making items -> negative profit ---
    trap_order = np.isin(promo, PROMO_TRAP_IDS)
    trap_lines = trap_order[line_order] & (np.random.random(n) < TRAP_LOSS_LINE_SHARE)
    trap_lines[first_line[trap_order]] = True
    line_item[trap_lines] = np.random.choice(LOSS_MAKING_ITEMS, trap_lines.sum())
    locked |= trap_lines

    # --- Loss-making items are popular: in 15% of orders (trap orders included) ---
    other_orders = np.flatnonzero(~trap_order)
    n_loss_orders = int(LOSS_ITEM_ORDER_SHARE * n_orders) - int(trap_order.sum())
    n_loss_orders = int(np.clip(n_loss_orders, 0, other_orders.size))
    positions = first_line[np.random.choice(other_orders, n_loss_orders, replace=False)]
    line_item[positions] = np.random.choice(LOSS_MAKING_ITEMS, positions.size)
    locked[positions] = True

    # --- High margin, low visibility: only 3% of orders ---
    n_hidden_orders = int(HIDDEN_ITEM_ORDER_SHARE * n_orders)
    positions = first_line[np.random.choice(other_orders, n_hidden_orders, replace=False)] + 1
    line_item[positions] = np.random.choice(HIGH_MARGIN_LOW_VISIBILITY_ITEMS, positions.size)
    locked[positions] = True

    # --- Line-level patterns, each item selling roughly an average volume ---
    lines_per_item = n / item_ids.size
    for group, preferred, share in (
        (PROMOTION_DEPENDENT_ITEMS, line_has_promo, 0.70),
        (WEEKEND_ONLY_ITEMS, line_weekend, 0.80),
        (LOCATION_SPECIFIC_ITEMS, line_high_tier, 0.70),
    ):
        _inject_items(line_item, locked, group, int(group.size * lines_per_item), preferred, share)

    # --- No sales before an item's launch date ---
    launch_lookup = _launch_day_lookup(items)
    early = launch_lookup[line_item] > line_day
    launched_pool = base_pool[~np.isin(base_pool, NEW_ITEMS)]
    line_item[early] = np.random.choice(launched_pool, early.sum())

    # --- Prices and discounts ---
    quantity = np.random.choice(QUANTITIES, n, p=QUANTITY_PROBS)
    unit_price = _item_lookup(items, "base_price")[line_item]
    cost_price = _item_lookup(items, "preparation_cost")[line_item]

    # Promo percentage per line, scaled down where the order would exceed the promo cap
    discount_pct = unique_orders["_discount_pct"].to_numpy()
    discount_cap = unique_orders["_discount_cap"].to_numpy()
    raw_discount = unit_price * discount_pct[line_order]
    order_raw_discount = np.bincount(line_order, weights=raw_discount * quantity, minlength=n_orders)
    scale = np.ones(n_orders)
    over_cap = order_raw_discount > discount_cap
    scale[over_cap] = discount_cap[over_cap] / order_raw_discount[over_cap]
    discount_applied = np.round(raw_discount * scale[line_order], 2)
    line_total = np.round((unit_price - discount_applied) * quantity, 2)

    # --- Write order-level totals back so orders.csv matches its line items ---
    subtotal = np.bincount(line_order, weights=unit_price * quantity, minlength=n_orders)
    discount = np.bincount(line_order, weights=discount_applied * quantity, minlength=n_orders)
    totals = pd.DataFrame(
        {
            "subtotal": np.round(subtotal, 2),
            "discount_amount": np.round(discount, 2),
            "total_amount": np.round(subtotal - discount, 2),
        },
        index=unique_orders["order_id"],
    )
    for column in totals.columns:
        orders[column] = orders["order_id"].map(totals[column])
    orders.drop(columns=ORDER_HELPER_COLUMNS, inplace=True)

    # --- Data quality: negative quantities ---
    negative = _exact_mask(n, NEGATIVE_QUANTITY_RATE)
    quantity[negative] = -np.abs(quantity[negative])
    line_total[negative] = np.round(
        (unit_price[negative] - discount_applied[negative]) * quantity[negative], 2
    )

    return pd.DataFrame({
        "order_item_id": np.arange(1, n + 1),
        "order_id": unique_orders["order_id"].to_numpy()[line_order],
        "item_id": line_item,
        "quantity": quantity,
        "unit_price": unit_price,
        "cost_price": cost_price,
        "discount_applied": discount_applied,
        "line_total": line_total,
        "created_at": unique_orders["created_at"].to_numpy()[line_order],
    })


def generate_ratings(customers, items, restaurants):
    n = NUM_RATINGS
    print(f"Generating {n:,} ratings...")
    item_ids = items["item_id"].to_numpy()
    frames = []

    # --- Rating spike / drop: behaviour changes in the last 30 days ---
    for group, (before_mean, before_std), (after_mean, after_std) in (
        (RATING_SPIKE_ITEMS, (3.5, 0.5), (4.8, 0.2)),
        (RATING_DROP_ITEMS, (4.5, 0.4), (2.2, 0.6)),
    ):
        k = group.size * ANOMALY_RATINGS_PER_ITEM
        recent = np.random.random(k) < 0.35
        frames.append(pd.DataFrame({
            "item_id": np.repeat(group, ANOMALY_RATINGS_PER_ITEM),
            "day": np.where(
                recent,
                np.random.randint(RECENT_START, NUM_DAYS, k),
                np.random.randint(0, RECENT_START, k),
            ),
            "rating_value": np.where(
                recent,
                np.random.normal(after_mean, after_std, k),
                np.random.normal(before_mean, before_std, k),
            ),
            "is_fake": False,
        }))

    # --- Fake reviews: 100+ perfect scores inside a single 7-day window ---
    for item_id in FAKE_REVIEW_ITEMS:
        k = np.random.randint(100, 151)
        window_start = np.random.randint(0, NUM_DAYS - 7)
        frames.append(pd.DataFrame({
            "item_id": item_id,
            "day": window_start + np.random.randint(0, 7, k),
            "rating_value": 5.0,
            "is_fake": True,
        }))

    # --- Everything else: normal(4.0, 0.8) ---
    k = n - sum(len(f) for f in frames)
    general_pool = item_ids[~np.isin(item_ids, np.concatenate([RATING_SPIKE_ITEMS, RATING_DROP_ITEMS]))]
    frames.append(pd.DataFrame({
        "item_id": np.random.choice(general_pool, k),
        "day": np.random.randint(0, NUM_DAYS, k),
        "rating_value": np.random.normal(4.0, 0.8, k),
        "is_fake": False,
    }))

    ratings = pd.concat(frames, ignore_index=True)
    item = ratings["item_id"].to_numpy()
    day = _shift_after_launch(ratings["day"].to_numpy(), item, _launch_day_lookup(items))
    value = np.round(np.clip(ratings["rating_value"].to_numpy(), 1.0, 5.0), 1)
    is_fake = ratings["is_fake"].to_numpy()

    # Reviewer: any customer already registered on the rating date
    reg_day = _date_to_day(customers["registration_date"])
    by_registration = np.argsort(reg_day, kind="stable")
    eligible = np.maximum(np.searchsorted(reg_day[by_registration], day, side="right"), 1)
    reviewer = by_registration[(np.random.random(n) * eligible).astype(np.int64)]

    restaurant_ids = restaurants["restaurant_id"].to_numpy()
    traffic = _restaurant_weights(restaurant_ids)

    review_text = np.where(
        value >= 4,
        np.random.choice(POSITIVE_REVIEWS, n),
        np.where(value >= 3, np.random.choice(NEUTRAL_REVIEWS, n), np.random.choice(NEGATIVE_REVIEWS, n)),
    ).astype(object)
    review_text[is_fake] = np.random.choice(FAKE_REVIEW_TEXTS, is_fake.sum())
    review_text[(np.random.random(n) < MISSING_REVIEW_TEXT_RATE) & ~is_fake] = None

    # --- Data quality: missing and out-of-range ratings ---
    value = value.astype(float)
    shuffled = np.random.permutation(n)
    n_missing = int(round(n * MISSING_RATING_RATE))
    n_invalid = int(round(n * INVALID_RATING_RATE))
    value[shuffled[:n_missing]] = np.nan
    value[shuffled[n_missing:n_missing + n_invalid]] = np.random.choice([6.0, 0.0], n_invalid)

    rating_date = _day_to_date(day)
    ratings = pd.DataFrame({
        "customer_id": customers["customer_id"].to_numpy()[reviewer],
        "item_id": item,
        "restaurant_id": np.random.choice(restaurant_ids, n, p=traffic / traffic.sum()),
        "rating_value": value,
        "review_text": review_text,
        "rating_date": rating_date,
        "rating_source": np.random.choice(RATING_SOURCES, n, p=RATING_SOURCE_PROBS),
        "created_at": _random_times(rating_date),
    })
    ratings = ratings.sort_values("created_at", kind="stable").reset_index(drop=True)
    ratings.insert(0, "rating_id", np.arange(1, n + 1))
    return ratings


def generate_inventory(items, restaurants):
    item_ids = items["item_id"].to_numpy()
    restaurant_ids = restaurants["restaurant_id"].to_numpy()
    n = item_ids.size * restaurant_ids.size
    print(f"Generating {n:,} inventory records...")

    item = np.repeat(item_ids, restaurant_ids.size)
    restaurant = np.tile(restaurant_ids, item_ids.size)
    reorder_level = np.random.randint(20, 41, n)
    stock_quantity = np.random.randint(50, 201, n)
    restocked_days_ago = np.random.randint(1, 15, n)

    # Low stock alerts: below reorder level and not restocked recently
    low = np.isin(item, LOW_STOCK_ITEMS) & (restaurant <= HIGH_TIER_MAX)
    stock_quantity[low] = np.random.randint(0, reorder_level[low])
    restocked_days_ago[low] = np.random.randint(10, 31, low.sum())

    unit_cost = _item_lookup(items, "preparation_cost")[item] * np.random.uniform(0.95, 1.05, n)
    last_restocked = TODAY - pd.to_timedelta(restocked_days_ago, unit="D")

    return pd.DataFrame({
        "inventory_id": np.arange(1, n + 1),
        "item_id": item,
        "restaurant_id": restaurant,
        "stock_quantity": stock_quantity,
        "reorder_level": reorder_level,
        "last_restocked_date": last_restocked,
        "unit_cost": np.round(unit_cost, 2),
        "created_at": _random_times(pd.DatetimeIndex(np.full(n, START_DATE))),
    })


def generate_wastage(items, restaurants):
    n = NUM_WASTAGE
    print(f"Generating {n:,} wastage records...")
    item_ids = items["item_id"].to_numpy()
    restaurant_ids = restaurants["restaurant_id"].to_numpy()

    item = np.random.choice(item_ids, n)
    restaurant = np.random.choice(restaurant_ids, n)
    day = _shift_after_launch(np.random.randint(0, NUM_DAYS, n), item, _launch_day_lookup(items))

    prepared_quantity = np.random.randint(20, 101, n)
    high_wastage = np.isin(item, HIGH_WASTAGE_ITEMS)
    wastage_ratio = np.where(
        high_wastage,
        np.random.uniform(0.35, 0.50, n),
        np.random.uniform(0.05, 0.15, n),
    )
    wastage_quantity = np.maximum(1, np.round(prepared_quantity * wastage_ratio)).astype(np.int64)
    wastage_cost = np.round(wastage_quantity * _item_lookup(items, "preparation_cost")[item], 2)

    # A few staff members per restaurant record wastage
    staff = np.array([
        [f"{random.choice(STAFF_FIRST_NAMES)} {random.choice(STAFF_LAST_NAMES)}"
         for _ in range(STAFF_PER_RESTAURANT)]
        for _ in range(restaurant_ids.max() + 1)
    ], dtype=object)
    recorded_by = staff[restaurant, np.random.randint(0, STAFF_PER_RESTAURANT, n)]

    # Data quality: impossible quantities (cost left as originally recorded)
    wastage_quantity[_exact_mask(n, WASTAGE_OUTLIER_RATE)] = WASTAGE_OUTLIER_VALUE

    wastage_date = _day_to_date(day)
    wastage = pd.DataFrame({
        "item_id": item,
        "restaurant_id": restaurant,
        "wastage_date": wastage_date,
        "wastage_quantity": wastage_quantity,
        "wastage_cost": wastage_cost,
        "wastage_reason": np.random.choice(WASTAGE_REASONS, n, p=WASTAGE_REASON_PROBS),
        "recorded_by": recorded_by,
        "created_at": _random_times(wastage_date),
    })
    wastage = wastage.sort_values("created_at", kind="stable").reset_index(drop=True)
    wastage.insert(0, "wastage_id", np.arange(1, n + 1))
    return wastage


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def save_to_csv(df, filename):
    os.makedirs(OUTPUT_PATH, exist_ok=True)
    path = OUTPUT_PATH / filename
    df.to_csv(path, index=False)
    size = os.path.getsize(path)
    GENERATED_FILES.append((filename, len(df), size))
    print(f"  Saved {filename}: "
          f"{len(df):,} rows | "
          f"{size / 1024 / 1024:.1f} MB")


def print_summary():
    print("\n" + "=" * 50)
    print("Dataset Summary")
    print("=" * 50)
    print(f"{'File':<24}{'Rows':>12}{'Size (MB)':>12}")
    print("-" * 48)
    for filename, rows, size in GENERATED_FILES:
        print(f"{filename:<24}{rows:>12,}{size / 1024 / 1024:>12.1f}")
    print("-" * 48)
    total_rows = sum(rows for _, rows, _ in GENERATED_FILES)
    total_size = sum(size for _, _, size in GENERATED_FILES)
    print(f"{'TOTAL':<24}{total_rows:>12,}{total_size / 1024 / 1024:>12.1f}")
    print(f"\nOutput folder: {OUTPUT_PATH}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    np.random.seed(RANDOM_SEED)
    random.seed(RANDOM_SEED)
    Faker.seed(RANDOM_SEED)

    start = datetime.now()
    print("=" * 50)
    print("DineIQ Analytics - Dataset Generator")
    print("=" * 50)

    categories = generate_menu_categories()
    save_to_csv(categories, "menu_categories.csv")

    items = generate_menu_items(categories)
    save_to_csv(items, "menu_items.csv")

    restaurants = generate_restaurants()
    save_to_csv(restaurants, "restaurants.csv")

    customers = generate_customers()
    save_to_csv(customers, "customers.csv")

    promotions = generate_promotions()
    save_to_csv(promotions, "promotions.csv")

    pricing = generate_pricing_history(items, restaurants)
    save_to_csv(pricing, "pricing_history.csv")

    orders = generate_orders(customers, restaurants, promotions)

    # Order totals come from the line items, so orders.csv is saved after them
    order_items = generate_order_items(orders, items)
    save_to_csv(orders, "orders.csv")
    save_to_csv(order_items, "order_items.csv")

    ratings = generate_ratings(customers, items, restaurants)
    save_to_csv(ratings, "ratings.csv")

    inventory = generate_inventory(items, restaurants)
    save_to_csv(inventory, "inventory.csv")

    wastage = generate_wastage(items, restaurants)
    save_to_csv(wastage, "wastage.csv")

    print_summary()
    elapsed = datetime.now() - start
    print(f"\nCompleted in {elapsed}")


if __name__ == "__main__":
    main()
