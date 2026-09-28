"""
Anomaly detection API (SRS Steps 30-31).

Sales anomalies    item revenue far above the menu average, loss-making
                   items, and daily revenue spikes / drops against the
                   trailing 28-day level
Rating anomalies   time-window rules on ratings_clean.csv:
  RATING_SHIFT      7-day average rating moved by more than 1.0 vs the
                    previous 7 days (spike or drop), both windows having at
                    least MIN_WINDOW_RATINGS ratings
  IDENTICAL_BURST   more than 20 identical ratings for one item in one day
  VOLUME_BURST      7-day rating count at least 5x the item's usual
                    (median) 7-day count and at least 30 ratings
"""

import threading

import numpy as np
import pandas as pd
from fastapi import APIRouter, Depends

from middleware.auth_middleware import require_analytics
from routes.common import FEATURES, PROCESSED, read_csv

router = APIRouter(dependencies=[Depends(require_analytics)])

RATING_SHIFT_THRESHOLD = 1.0
SHIFT_WINDOW_DAYS = 7
MIN_WINDOW_RATINGS = 5
IDENTICAL_PER_DAY_THRESHOLD = 20
VOLUME_BURST_FACTOR = 5
VOLUME_BURST_MIN = 30
SALES_Z_THRESHOLD = 3.0
SALES_BASELINE_DAYS = 28

_memo = {}
_memo_lock = threading.Lock()


def _memoized(key, source_path, compute):
    mtime = source_path.stat().st_mtime
    with _memo_lock:
        hit = _memo.get(key)
    if hit and hit[0] == mtime:
        return hit[1]
    value = compute()
    with _memo_lock:
        _memo[key] = (mtime, value)
    return value


def _item_names():
    menu = read_csv(FEATURES / "menu_item_features.csv", usecols=["item_id", "item_name"])
    return dict(zip(menu["item_id"], menu["item_name"]))


# ---------------------------------------------------------------------------
# Rating anomalies
# ---------------------------------------------------------------------------
def detect_rating_anomalies(ratings: pd.DataFrame, names: dict):
    ratings = ratings.assign(rating_date=pd.to_datetime(ratings["rating_date"]))
    anomalies = []

    # Daily sums/counts per item on a continuous calendar
    daily = ratings.groupby(["rating_date", "item_id"])["rating_value"].agg(["sum", "count"]).unstack("item_id")
    dates = pd.date_range(daily.index.min(), daily.index.max(), freq="D")
    sums = daily["sum"].reindex(dates).fillna(0)
    counts = daily["count"].reindex(dates).fillna(0)
    win_sum = sums.rolling(SHIFT_WINDOW_DAYS, min_periods=1).sum()
    win_cnt = counts.rolling(SHIFT_WINDOW_DAYS, min_periods=1).sum()
    current = win_sum / win_cnt.replace(0, np.nan)
    previous = current.shift(SHIFT_WINDOW_DAYS)
    enough = (win_cnt >= MIN_WINDOW_RATINGS) & (win_cnt.shift(SHIFT_WINDOW_DAYS) >= MIN_WINDOW_RATINGS)
    shift = (current - previous).where(enough)

    # RATING_SHIFT: keep the most extreme spike and drop per item
    for item_id in shift.columns:
        col = shift[item_id].dropna()
        for direction, series in (("Sudden Rating Spike", col[col > RATING_SHIFT_THRESHOLD]),
                                  ("Sudden Rating Drop", col[col < -RATING_SHIFT_THRESHOLD])):
            if series.empty:
                continue
            day = series.abs().idxmax()
            anomalies.append({
                "item_id": int(item_id),
                "item_name": names.get(item_id, f"Item {item_id}"),
                "type": direction,
                "rule": "RATING_SHIFT",
                "severity": "High",
                "date": str(day.date()),
                "value": round(float(current.at[day, item_id]), 2),
                "baseline": round(float(previous.at[day, item_id]), 2),
                "threshold": f"|Δ 7-day avg| > {RATING_SHIFT_THRESHOLD}",
                "description": (f"7-day average rating went from {previous.at[day, item_id]:.2f} to "
                                f"{current.at[day, item_id]:.2f} in the week ending {day.date()}"),
            })

    # IDENTICAL_BURST: > N identical ratings for one item on one day
    identical = ratings.groupby(["item_id", "rating_date", "rating_value"]).size().reset_index(name="n")
    identical = identical[identical["n"] > IDENTICAL_PER_DAY_THRESHOLD]
    for item_id, rows in identical.groupby("item_id"):
        worst = rows.loc[rows["n"].idxmax()]
        anomalies.append({
            "item_id": int(item_id),
            "item_name": names.get(item_id, f"Item {item_id}"),
            "type": "Excessive Identical Ratings",
            "rule": "IDENTICAL_BURST",
            "severity": "High" if worst["n"] > 2 * IDENTICAL_PER_DAY_THRESHOLD else "Medium",
            "date": str(worst["rating_date"].date()),
            "value": int(worst["n"]),
            "baseline": None,
            "threshold": f"> {IDENTICAL_PER_DAY_THRESHOLD} identical ratings / 24h",
            "description": (f"{int(worst['n'])} ratings of exactly {worst['rating_value']} on "
                            f"{worst['rating_date'].date()} ({len(rows)} such day(s) in total)"),
        })

    # VOLUME_BURST: far more ratings than usual in one week
    for item_id in win_cnt.columns:
        col = win_cnt[item_id]
        usual = col[col > 0].median() if (col > 0).any() else 0
        peak_day = col.idxmax()
        peak = col.max()
        if usual and peak >= VOLUME_BURST_MIN and peak >= VOLUME_BURST_FACTOR * usual:
            anomalies.append({
                "item_id": int(item_id),
                "item_name": names.get(item_id, f"Item {item_id}"),
                "type": "Rating Volume Burst",
                "rule": "VOLUME_BURST",
                "severity": "Medium",
                "date": str(peak_day.date()),
                "value": int(peak),
                "baseline": round(float(usual), 1),
                "threshold": f"≥ {VOLUME_BURST_FACTOR}× usual 7-day count and ≥ {VOLUME_BURST_MIN}",
                "description": (f"{int(peak)} ratings in the 7 days to {peak_day.date()} "
                                f"vs a usual {usual:.0f} per week"),
            })
    return anomalies


def rating_anomalies():
    path = PROCESSED / "ratings_clean.csv"
    return _memoized("ratings", path, lambda: detect_rating_anomalies(
        read_csv(path, usecols=["item_id", "rating_value", "rating_date"]), _item_names()))


# ---------------------------------------------------------------------------
# Sales anomalies
# ---------------------------------------------------------------------------
def detect_daily_sales_anomalies(orders: pd.DataFrame):
    orders = orders[~orders["is_cancelled"].astype(bool)]
    daily = orders.groupby(pd.to_datetime(orders["order_date"]))["total_amount"].sum()
    baseline = daily.shift(1).rolling(SALES_BASELINE_DAYS, min_periods=14)
    z = (daily - baseline.mean()) / baseline.std()
    anomalies = []
    for day, score in z.dropna().items():
        if abs(score) < SALES_Z_THRESHOLD:
            continue
        spike = score > 0
        anomalies.append({
            "item_id": None,
            "item_name": "All locations",
            "type": "Daily Sales Spike" if spike else "Daily Sales Drop",
            "rule": "DAILY_SALES_Z",
            "severity": "High" if abs(score) >= 4 else "Medium",
            "date": str(day.date()),
            "value": round(float(daily[day]), 2),
            "baseline": round(float(baseline.mean()[day]), 2),
            "threshold": f"|z| ≥ {SALES_Z_THRESHOLD} vs trailing {SALES_BASELINE_DAYS} days",
            "description": f"Revenue {daily[day]:,.0f} vs trailing average {baseline.mean()[day]:,.0f} (z = {score:.1f})",
        })
    return anomalies


def sales_anomalies():
    menu = read_csv(FEATURES / "menu_item_features.csv")
    mean_rev = menu["total_revenue"].mean()
    std_rev = menu["total_revenue"].std()
    anomalies = []

    for _, row in menu[menu["total_revenue"] > mean_rev + 2 * std_rev].iterrows():
        anomalies.append({
            "item_id": int(row["item_id"]),
            "item_name": str(row["item_name"]),
            "type": "Sales Spike",
            "rule": "ITEM_REVENUE_Z",
            "severity": "High",
            "date": None,
            "value": round(float(row["total_revenue"]), 2),
            "baseline": round(float(mean_rev), 2),
            "threshold": round(float(mean_rev + 2 * std_rev), 2),
            "description": f"Revenue {row['total_revenue']:,.0f} is more than 2σ above the menu average",
        })

    for _, row in menu[menu["profit_percentage"] < 0].iterrows():
        anomalies.append({
            "item_id": int(row["item_id"]),
            "item_name": str(row["item_name"]),
            "type": "Loss Making Item",
            "rule": "NEGATIVE_MARGIN",
            "severity": "Critical",
            "date": None,
            "value": round(float(row["profit_percentage"]), 2),
            "baseline": None,
            "threshold": 0,
            "description": f"Selling at a loss: {row['profit_percentage']:.1f}% margin on "
                           f"{int(row['total_quantity_sold']):,} units",
        })

    path = PROCESSED / "orders_clean.csv"
    anomalies += _memoized("daily_sales", path, lambda: detect_daily_sales_anomalies(
        read_csv(path, usecols=["order_date", "total_amount", "is_cancelled"])))
    return anomalies


def _summarise(anomalies):
    return {
        "total": len(anomalies),
        "critical": sum(a["severity"] == "Critical" for a in anomalies),
        "high": sum(a["severity"] == "High" for a in anomalies),
        "medium": sum(a["severity"] == "Medium" for a in anomalies),
        "anomalies": anomalies,
    }


@router.get("/sales")
def get_sales_anomalies():
    """Sales + rating anomalies together (the Anomaly Detection page)."""
    return _summarise(sales_anomalies() + rating_anomalies())


@router.get("/ratings")
def get_rating_anomalies():
    result = _summarise(rating_anomalies())
    result["rules"] = {
        "RATING_SHIFT": f"7-day average rating changed by more than {RATING_SHIFT_THRESHOLD} vs the previous 7 days",
        "IDENTICAL_BURST": f"more than {IDENTICAL_PER_DAY_THRESHOLD} identical ratings for one item in 24 hours",
        "VOLUME_BURST": f"7-day rating count ≥ {VOLUME_BURST_FACTOR}× the item's usual weekly count",
    }
    return result
