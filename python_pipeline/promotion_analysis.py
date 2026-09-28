"""
DineIQ Analytics - Promotion Effectiveness & Trap Detection (SRS Steps 27-28)

Every promotion is evaluated from actual orders — the generator's
is_promotion_trap column is NOT used for detection (it is only read at the
end to report how many injected traps were found).

For each promotion, the promotion period is compared with an equally long
window immediately before it (business-wide daily averages), and the
promotion's own orders are compared with the regular orders placed during
the same period.

Trap rules (a promotion is a trap if any rule fires):
  R1 sales_up_profit_down   daily revenue up > SALES_UP_PCT
                            AND daily profit down > PROFIT_DOWN_PCT
  R2 margin_collapse        promo orders' margin is negative, or more than
                            MARGIN_GAP_PTS points below regular orders
  R3 wastage_increase       wastage/day grows more than WASTAGE_GAP_PTS points
                            faster than revenue/day
  R4 discount_only_buyers   promo customers come back (within
                            RETENTION_DAYS after the end) at less than
                            RETENTION_RATIO x the rate of other customers

Also reported: order volume, revenue, contribution margin, customer
acquisition (first-ever order used the promotion), repeat purchases,
average order value, wastage and post-promotion behaviour.

Run from anywhere:  python python_pipeline/promotion_analysis.py
Writes  reports/promotion_analysis.json
"""

import json
from datetime import datetime
from pathlib import Path

import numpy as np
import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parent.parent
PROCESSED = PROJECT_ROOT / "processed_data"
OUTPUT_PATH = PROJECT_ROOT / "reports" / "promotion_analysis.json"

SALES_UP_PCT = 10.0
PROFIT_DOWN_PCT = 5.0
MARGIN_GAP_PTS = 20.0
WASTAGE_GAP_PTS = 15.0
RETENTION_DAYS = 30
RETENTION_RATIO = 0.5


def pct_change(new, old):
    return round((new / old - 1) * 100, 2) if old else None


def load():
    orders = pd.read_csv(
        PROCESSED / "orders_clean.csv",
        usecols=["order_id", "customer_id", "order_date", "promotion_id", "is_cancelled",
                 "subtotal", "discount_amount", "total_amount"],
        parse_dates=["order_date"])
    orders = orders[~orders["is_cancelled"].astype(bool)].copy()
    lines = pd.read_csv(PROCESSED / "order_items_clean.csv", usecols=["order_id", "quantity", "cost_price"])
    cost = (lines["quantity"] * lines["cost_price"]).groupby(lines["order_id"]).sum()
    orders["cost"] = orders["order_id"].map(cost).fillna(0)
    orders["profit"] = orders["total_amount"] - orders["cost"]
    promotions = pd.read_csv(PROCESSED / "promotions_clean.csv", parse_dates=["start_date", "end_date"])
    wastage = pd.read_csv(PROCESSED / "wastage_clean.csv", usecols=["wastage_date", "wastage_cost"],
                          parse_dates=["wastage_date"])
    return orders, promotions, wastage


def window_stats(daily, start, end):
    frame = daily.loc[start:end]
    return {
        "days": int(len(frame)),
        "orders_per_day": round(float(frame["orders"].mean()), 2) if len(frame) else None,
        "revenue_per_day": round(float(frame["revenue"].mean()), 2) if len(frame) else None,
        "profit_per_day": round(float(frame["profit"].mean()), 2) if len(frame) else None,
        "wastage_cost_per_day": round(float(frame["wastage_cost"].mean()), 2) if len(frame) else None,
    }


def analyse(promo, orders, daily, first_order_date):
    start, end = promo["start_date"], promo["end_date"]
    length = (end - start).days + 1
    before_start, before_end = start - pd.Timedelta(days=length), start - pd.Timedelta(days=1)

    during = window_stats(daily, start, end)
    before = window_stats(daily, before_start, before_end)
    baseline_ok = before["days"] == length and during["days"] > 0

    in_period = orders[(orders["order_date"] >= start) & (orders["order_date"] <= end)]
    promo_orders = in_period[in_period["promotion_id"] == promo["promotion_id"]]
    regular_orders = in_period[in_period["promotion_id"] != promo["promotion_id"]]

    def margin(df):
        return round(float(df["profit"].sum() / df["total_amount"].sum() * 100), 2) if df["total_amount"].sum() else None

    promo_margin, regular_margin = margin(promo_orders), margin(regular_orders)

    # Customer acquisition + post-promotion behaviour
    promo_customers = set(promo_orders["customer_id"].dropna())
    other_customers = set(regular_orders["customer_id"].dropna()) - promo_customers
    new_customers = sum(1 for c in promo_customers if first_order_date.get(c) is not None
                        and start <= first_order_date[c] <= end)
    after = orders[(orders["order_date"] > end) & (orders["order_date"] <= end + pd.Timedelta(days=RETENTION_DAYS))]
    returning = set(after["customer_id"].dropna())
    after_complete = after["order_date"].max() is not pd.NaT and len(after) and \
        (orders["order_date"].max() - end).days >= RETENTION_DAYS
    promo_retention = len(promo_customers & returning) / len(promo_customers) if promo_customers else None
    other_retention = len(other_customers & returning) / len(other_customers) if other_customers else None
    repeat_in_period = int((promo_orders.groupby("customer_id").size() >= 2).sum())

    sales_change = pct_change(during["revenue_per_day"], before["revenue_per_day"]) if baseline_ok else None
    profit_change = pct_change(during["profit_per_day"], before["profit_per_day"]) if baseline_ok else None
    orders_change = pct_change(during["orders_per_day"], before["orders_per_day"]) if baseline_ok else None
    wastage_change = pct_change(during["wastage_cost_per_day"], before["wastage_cost_per_day"]) if baseline_ok else None

    rules = []
    if sales_change is not None and sales_change > SALES_UP_PCT and profit_change < -PROFIT_DOWN_PCT:
        rules.append({"rule": "R1 sales_up_profit_down",
                      "evidence": f"Revenue/day {sales_change:+.1f}% but profit/day {profit_change:+.1f}%"})
    if promo_margin is not None and regular_margin is not None and (
            promo_margin < 0 or regular_margin - promo_margin > MARGIN_GAP_PTS):
        rules.append({"rule": "R2 margin_collapse",
                      "evidence": f"Promo orders' margin {promo_margin:.1f}% vs {regular_margin:.1f}% on regular orders"})
    if wastage_change is not None and sales_change is not None and wastage_change - sales_change > WASTAGE_GAP_PTS:
        rules.append({"rule": "R3 wastage_increase",
                      "evidence": f"Wastage cost/day {wastage_change:+.1f}% vs revenue/day {sales_change:+.1f}%"})
    if after_complete and promo_retention is not None and other_retention and len(promo_customers) >= 30 \
            and promo_retention < RETENTION_RATIO * other_retention:
        rules.append({"rule": "R4 discount_only_buyers",
                      "evidence": f"{promo_retention*100:.1f}% of promo customers returned within {RETENTION_DAYS} days "
                                  f"vs {other_retention*100:.1f}% of other customers"})

    if rules:
        verdict = "Promotion Trap"
    elif sales_change is not None and sales_change > 0 and (profit_change or 0) > 0:
        verdict = "Effective"
    elif sales_change is None:
        verdict = "Insufficient baseline"
    else:
        verdict = "Neutral"

    return {
        "promotion_id": int(promo["promotion_id"]),
        "promo_name": promo["promo_name"],
        "promo_type": promo["promo_type"],
        "discount_percentage": float(promo["discount_percentage"]),
        "start_date": str(start.date()),
        "end_date": str(end.date()),
        "days": int(length),
        "baseline_available": bool(baseline_ok),
        "before": before,
        "during": during,
        "orders_change_pct": orders_change,
        "sales_change_pct": sales_change,
        "profit_change_pct": profit_change,
        "wastage_change_pct": wastage_change,
        "promo_orders": int(len(promo_orders)),
        "promo_revenue": round(float(promo_orders["total_amount"].sum()), 2),
        "promo_profit": round(float(promo_orders["profit"].sum()), 2),
        "promo_discount_given": round(float(promo_orders["discount_amount"].sum()), 2),
        "promo_margin_pct": promo_margin,
        "regular_margin_pct": regular_margin,
        "promo_avg_order_value": round(float(promo_orders["total_amount"].mean()), 2) if len(promo_orders) else None,
        "regular_avg_order_value": round(float(regular_orders["total_amount"].mean()), 2) if len(regular_orders) else None,
        "promo_customers": len(promo_customers),
        "new_customers_acquired": int(new_customers),
        "repeat_customers_in_period": repeat_in_period,
        "post_promo_retention_pct": round(promo_retention * 100, 2) if promo_retention is not None else None,
        "other_customer_retention_pct": round(other_retention * 100, 2) if other_retention is not None else None,
        "is_trap": bool(rules),
        "trap_rules": rules,
        "verdict": verdict,
    }


def main():
    print("=" * 48)
    print("DineIQ - Promotion Effectiveness & Trap Detection")
    print("=" * 48)
    orders, promotions, wastage = load()
    daily = orders.groupby("order_date").agg(
        orders=("order_id", "size"), revenue=("total_amount", "sum"), profit=("profit", "sum"))
    daily["wastage_cost"] = wastage.groupby("wastage_date")["wastage_cost"].sum()
    daily = daily.fillna({"wastage_cost": 0})
    first_order_date = orders.groupby("customer_id")["order_date"].min().to_dict()

    results = [analyse(p, orders, daily, first_order_date) for _, p in promotions.iterrows()]

    designed = set(promotions.loc[promotions["is_promotion_trap"].astype(bool), "promotion_id"]) \
        if "is_promotion_trap" in promotions.columns else set()
    detected = {r["promotion_id"] for r in results if r["is_trap"]}

    for r in results:
        rules = ", ".join(x["rule"].split()[0] for x in r["trap_rules"]) or "-"
        print(f"  #{r['promotion_id']:<3}{r['promo_name'][:22]:<23}{r['verdict']:<22}"
              f"sales {r['sales_change_pct'] if r['sales_change_pct'] is not None else 'n/a':>7}  "
              f"profit {r['profit_change_pct'] if r['profit_change_pct'] is not None else 'n/a':>7}  "
              f"promo margin {r['promo_margin_pct']}%  rules {rules}")

    summary = {
        "total_promotions": len(results),
        "traps_detected": len(detected),
        "effective": sum(r["verdict"] == "Effective" for r in results),
        "neutral": sum(r["verdict"] == "Neutral" for r in results),
        "promo_orders": int(orders["promotion_id"].notna().sum()),
        "promo_order_pct": round(float(orders["promotion_id"].notna().mean() * 100), 2),
        "validation": {
            "note": "Detection never reads is_promotion_trap; this block only checks it afterwards",
            "injected_traps": sorted(int(x) for x in designed),
            "detected_traps": sorted(int(x) for x in detected),
            "injected_traps_found": len(designed & detected),
            "false_positives": sorted(int(x) for x in detected - designed),
        },
    }
    OUTPUT_PATH.write_text(json.dumps({
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "thresholds": {"sales_up_pct": SALES_UP_PCT, "profit_down_pct": PROFIT_DOWN_PCT,
                       "margin_gap_pts": MARGIN_GAP_PTS, "wastage_gap_pts": WASTAGE_GAP_PTS,
                       "retention_days": RETENTION_DAYS, "retention_ratio": RETENTION_RATIO},
        "summary": summary,
        "promotions": results,
    }, indent=2, default=lambda o: None if isinstance(o, float) and np.isnan(o) else o))
    print(f"\nDetected {len(detected)} traps; injected traps found {len(designed & detected)}/{len(designed)}; "
          f"false positives {sorted(detected - designed)}")
    print(f"Saved {OUTPUT_PATH.name}")


if __name__ == "__main__":
    main()
