"""
DineIQ Analytics - Price Intelligence & Price-Sensitivity Analysis (SRS Steps 25-26)

For every price change in pricing_history, compares the item's demand in
the WINDOW_DAYS before and after the change date:

    elasticity = % change in demand / % change in price

Demand is measured as the item's SHARE of all units sold that day, not raw
units: total demand grows strongly over the year, and raw units would make
every price rise look like it increased demand.

Each item's elasticity is the median over its price changes, and it is
classified by the size of the response (elasticities are normally negative):
    |e| >= 1.5          Highly Price Sensitive
    0.5 <= |e| < 1.5    Moderately Price Sensitive
    |e| < 0.5           Low Price Sensitivity
An item whose median elasticity is positive (demand rose with price), or
with no statistically significant demand shift after any of its price
changes, is reported as Low Price Sensitivity with a note — a large ratio
from a tiny price change is noise, not evidence.

A change is "significant" when the item's daily demand share after the
change differs from before (Welch t-test, p < 0.05).

Run from anywhere:  python python_pipeline/price_sensitivity.py
Writes  reports/price_sensitivity.json
"""

import json
from datetime import datetime
from pathlib import Path

import numpy as np
import pandas as pd
from scipy import stats

PROJECT_ROOT = Path(__file__).resolve().parent.parent
PROCESSED = PROJECT_ROOT / "processed_data"
OUTPUT_PATH = PROJECT_ROOT / "reports" / "price_sensitivity.json"

WINDOW_DAYS = 28
MIN_WINDOW_DAYS = 14
HIGH_THRESHOLD = 1.5
MODERATE_THRESHOLD = 0.5
SIGNIFICANCE = 0.05


def classify(elasticity, significant_changes):
    if elasticity is None or np.isnan(elasticity):
        return "Insufficient Data"
    size = abs(elasticity) if elasticity < 0 and significant_changes > 0 else 0.0
    if size >= HIGH_THRESHOLD:
        return "Highly Price Sensitive"
    if size >= MODERATE_THRESHOLD:
        return "Moderately Price Sensitive"
    return "Low Price Sensitivity"


def load():
    orders = pd.read_csv(PROCESSED / "orders_clean.csv", usecols=["order_id", "order_date", "is_cancelled"],
                         parse_dates=["order_date"])
    orders = orders[~orders["is_cancelled"].astype(bool)]
    lines = pd.read_csv(PROCESSED / "order_items_clean.csv", usecols=["order_id", "item_id", "quantity"])
    daily = lines.merge(orders[["order_id", "order_date"]], on="order_id") \
        .groupby(["order_date", "item_id"])["quantity"].sum().unstack(fill_value=0)
    dates = pd.date_range(daily.index.min(), daily.index.max(), freq="D")
    daily = daily.reindex(dates, fill_value=0)
    share = daily.div(daily.sum(axis=1).replace(0, np.nan), axis=0)
    features = pd.read_csv(PROCESSED / "features" / "menu_item_features.csv",
                           usecols=["item_id", "item_name", "avg_unit_price", "total_quantity_sold", "total_revenue",
                                    "contribution_margin", "profit_percentage", "avg_rating",
                                    "repeat_purchase_rate", "promotion_dependency"])
    pricing = pd.read_csv(PROCESSED / "pricing_history_clean.csv", parse_dates=["change_date"])
    return daily, share, features.set_index("item_id"), pricing


def analyse_change(change, share):
    item = change["item_id"]
    if item not in share.columns:
        return None
    day = change["change_date"]
    before = share.loc[day - pd.Timedelta(days=WINDOW_DAYS):day - pd.Timedelta(days=1), item].dropna()
    after = share.loc[day:day + pd.Timedelta(days=WINDOW_DAYS - 1), item].dropna()
    price_change = (change["new_price"] / change["old_price"] - 1) * 100
    result = {
        "price_id": int(change["price_id"]),
        "change_date": str(day.date()),
        "old_price": float(change["old_price"]),
        "new_price": float(change["new_price"]),
        "price_change_pct": round(price_change, 2),
        "change_reason": change["change_reason"],
        "before_days": int(len(before)),
        "after_days": int(len(after)),
    }
    if len(before) < MIN_WINDOW_DAYS or len(after) < MIN_WINDOW_DAYS or before.mean() == 0 or price_change == 0:
        return {**result, "demand_change_pct": None, "elasticity": None, "p_value": None, "significant": False}
    demand_change = (after.mean() / before.mean() - 1) * 100
    p_value = float(stats.ttest_ind(after, before, equal_var=False).pvalue)
    return {
        **result,
        "demand_share_before_pct": round(before.mean() * 100, 4),
        "demand_share_after_pct": round(after.mean() * 100, 4),
        "demand_change_pct": round(demand_change, 2),
        "elasticity": round(demand_change / price_change, 3),
        "p_value": round(p_value, 4),
        "significant": bool(p_value < SIGNIFICANCE),
    }


def main():
    print("=" * 48)
    print("DineIQ - Price Sensitivity Analysis")
    print("=" * 48)
    daily, share, features, pricing = load()

    items = []
    for item_id, changes in pricing.groupby("item_id"):
        events = [e for e in (analyse_change(c, share) for _, c in changes.sort_values("change_date").iterrows()) if e]
        measured = [e["elasticity"] for e in events if e["elasticity"] is not None]
        median_e = float(np.median(measured)) if measured else None
        f = features.loc[item_id] if item_id in features.index else None
        n_significant = sum(e["significant"] for e in events)
        if median_e is None:
            note = "Not enough order history around its price changes to measure elasticity"
        elif median_e > 0:
            note = "Demand moved in the same direction as price, so there is no evidence of price sensitivity"
        elif n_significant == 0:
            note = "No statistically significant demand shift after any price change"
        else:
            note = (f"Demand fell {abs(median_e):.2f}% for every 1% price rise, supported by "
                    f"{n_significant} statistically significant price change(s)")
        items.append({
            "item_id": int(item_id),
            "item_name": f["item_name"] if f is not None else f"Item {item_id}",
            "current_price": round(float(f["avg_unit_price"]), 2) if f is not None else None,
            "total_quantity_sold": int(f["total_quantity_sold"]) if f is not None else None,
            "total_revenue": round(float(f["total_revenue"]), 2) if f is not None else None,
            "contribution_margin": round(float(f["contribution_margin"]), 2) if f is not None else None,
            "profit_percentage": round(float(f["profit_percentage"]), 2) if f is not None else None,
            "avg_rating": round(float(f["avg_rating"]), 2) if f is not None and pd.notna(f["avg_rating"]) else None,
            "repeat_purchase_rate": round(float(f["repeat_purchase_rate"]), 4) if f is not None else None,
            "price_changes": len(events),
            "measured_changes": len(measured),
            "significant_changes": n_significant,
            "max_abs_price_change_pct": round(max(abs(e["price_change_pct"]) for e in events), 2) if events else None,
            "elasticity": round(median_e, 3) if median_e is not None else None,
            "sensitivity": classify(median_e, n_significant),
            "note": note,
            "events": events,
        })

    items.sort(key=lambda r: (r["elasticity"] is None, r["elasticity"] if r["elasticity"] is not None else 0))
    counts = pd.Series([r["sensitivity"] for r in items]).value_counts().to_dict()
    significant_items = [r for r in items if r["significant_changes"] > 0]

    print(f"Items with price history: {len(items)}   price changes: {len(pricing)}")
    print("Classification:", counts)
    print(f"Items whose demand changed significantly after a price change: {len(significant_items)}")
    for r in items[:5]:
        print(f"  {r['item_name']:<32} elasticity {r['elasticity']}  {r['sensitivity']}")

    OUTPUT_PATH.write_text(json.dumps({
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "method": f"Median over price changes of (%Δ demand share / %Δ price), {WINDOW_DAYS}-day windows",
        "thresholds": {"high": HIGH_THRESHOLD, "moderate": MODERATE_THRESHOLD, "significance": SIGNIFICANCE},
        "summary": {
            "items_analysed": len(items),
            "price_changes": int(len(pricing)),
            "classification_counts": counts,
            "items_with_significant_demand_change": len(significant_items),
            "median_elasticity": round(float(np.nanmedian([r["elasticity"] for r in items if r["elasticity"] is not None])), 3),
        },
        "items": items,
    }, indent=1))
    print(f"Saved {OUTPUT_PATH.name}")


if __name__ == "__main__":
    main()
