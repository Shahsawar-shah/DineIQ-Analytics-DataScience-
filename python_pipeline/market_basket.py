"""
DineIQ Analytics - Market-Basket Analysis (SRS Steps 17-18)

Runs FP-Growth (mlxtend) over every non-cancelled order's basket, derives
association rules with support, confidence and lift, and turns the rules
with lift > 1.5 into evidence-backed recommendations:

  combo meals        item pairs from different categories bought together
  cross-sell         "customers who order A also order B" (high confidence)
  upsell             A -> B where B is pricier and earns more margin per unit
  frequently paired  the pairs with the highest support

Pairs containing a loss-making item are never recommended as a bundle; they
are reported separately as a warning instead.

Run from anywhere:  python python_pipeline/market_basket.py
Writes  reports/basket_results.json
"""

import json
import time
from datetime import datetime
from pathlib import Path

import pandas as pd
from mlxtend.frequent_patterns import association_rules, fpgrowth

PROJECT_ROOT = Path(__file__).resolve().parent.parent
PROCESSED = PROJECT_ROOT / "processed_data"
OUTPUT_PATH = PROJECT_ROOT / "reports" / "basket_results.json"

MIN_SUPPORT = 0.003
MAX_ITEMSET_LEN = 3
BUNDLE_MIN_LIFT = 1.5
CROSS_SELL_MIN_CONFIDENCE = 0.10
TOP_N = 25


def load_baskets():
    orders = pd.read_csv(PROCESSED / "orders_clean.csv", usecols=["order_id", "is_cancelled"])
    valid = orders.loc[~orders["is_cancelled"].astype(bool), "order_id"]
    lines = pd.read_csv(PROCESSED / "order_items_clean.csv", usecols=["order_id", "item_id"])
    lines = lines[lines["order_id"].isin(valid)].drop_duplicates()
    basket = pd.crosstab(lines["order_id"], lines["item_id"]).astype(bool)
    return basket


def load_menu():
    menu = pd.read_csv(PROCESSED / "features" / "menu_item_features.csv",
                       usecols=["item_id", "item_name", "category_id", "avg_unit_price",
                                "contribution_margin", "profit_percentage"])
    categories = pd.read_csv(PROCESSED / "menu_categories_clean.csv", usecols=["category_id", "category_name"])
    return menu.merge(categories, on="category_id", how="left").set_index("item_id")


def describe(item_ids, menu):
    return [
        {
            "item_id": int(i),
            "item_name": menu.at[i, "item_name"],
            "category": menu.at[i, "category_name"],
            "price": round(float(menu.at[i, "avg_unit_price"]), 2),
            "margin_pct": round(float(menu.at[i, "profit_percentage"]), 1),
        }
        for i in sorted(item_ids)
    ]


def rule_record(row, menu, n_orders):
    antecedents, consequents = sorted(row["antecedents"]), sorted(row["consequents"])
    items = antecedents + consequents
    return {
        "antecedents": describe(antecedents, menu),
        "consequents": describe(consequents, menu),
        "rule": f"{' + '.join(menu.loc[antecedents, 'item_name'])} → {' + '.join(menu.loc[consequents, 'item_name'])}",
        "support": round(float(row["support"]), 5),
        "confidence": round(float(row["confidence"]), 4),
        "lift": round(float(row["lift"]), 3),
        "order_count": int(round(row["support"] * n_orders)),
        "has_loss_making_item": bool((menu.loc[items, "profit_percentage"] < 0).any()),
        "combined_margin_per_unit": round(float(menu.loc[items, "contribution_margin"].sum()), 2),
    }


def main():
    started = time.time()
    print("=" * 48)
    print("DineIQ - Market-Basket Analysis (FP-Growth)")
    print("=" * 48)

    basket = load_baskets()
    menu = load_menu()
    n_orders = len(basket)
    print(f"Transactions: {n_orders:,} orders × {basket.shape[1]} items "
          f"(avg basket {basket.sum(axis=1).mean():.1f} distinct items)")

    itemsets = fpgrowth(basket, min_support=MIN_SUPPORT, use_colnames=True, max_len=MAX_ITEMSET_LEN)
    rules = association_rules(itemsets, metric="lift", min_threshold=1.0)
    rules = rules.sort_values(["lift", "confidence"], ascending=False)
    print(f"Frequent itemsets (support ≥ {MIN_SUPPORT}): {len(itemsets):,}")
    print(f"Association rules (lift ≥ 1.0): {len(rules):,}")

    records = [rule_record(r, menu, n_orders) for _, r in rules.iterrows()]
    strong = [r for r in records if r["lift"] > BUNDLE_MIN_LIFT]
    safe = [r for r in strong if not r["has_loss_making_item"]]
    print(f"Rules with lift > {BUNDLE_MIN_LIFT}: {len(strong):,} ({len(strong) - len(safe)} involve a loss-making item)")

    # Pair-level rules (1 -> 1) for bundle recommendations; keep one direction per pair
    pairs, seen = [], set()
    for r in safe:
        if len(r["antecedents"]) == 1 and len(r["consequents"]) == 1:
            key = frozenset([r["antecedents"][0]["item_id"], r["consequents"][0]["item_id"]])
            if key not in seen:
                seen.add(key)
                pairs.append(r)

    combos = [
        {**r, "recommendation": f"Offer a combo of {r['antecedents'][0]['item_name']} + {r['consequents'][0]['item_name']}",
         "reason": f"Bought together {r['lift']}× more often than chance (support {r['support']*100:.2f}%, "
                   f"confidence {r['confidence']*100:.1f}%)"}
        for r in pairs if r["antecedents"][0]["category"] != r["consequents"][0]["category"]
    ][:TOP_N]

    cross_sell = [
        {**r, "recommendation": f"When {r['rule'].split(' → ')[0]} is ordered, suggest {r['rule'].split(' → ')[1]}",
         "reason": f"{r['confidence']*100:.1f}% of these orders already include it (lift {r['lift']})"}
        for r in sorted(safe, key=lambda r: r["confidence"], reverse=True)
        if r["confidence"] >= CROSS_SELL_MIN_CONFIDENCE
    ][:TOP_N]

    upsell = []
    for r in safe:
        if len(r["antecedents"]) != 1 or len(r["consequents"]) != 1:
            continue
        a, b = r["antecedents"][0], r["consequents"][0]
        a_margin = menu.at[a["item_id"], "contribution_margin"]
        b_margin = menu.at[b["item_id"], "contribution_margin"]
        if b["price"] > a["price"] and b_margin > a_margin:
            upsell.append({**r, "recommendation": f"Upsell {a['item_name']} buyers to {b['item_name']}",
                           "reason": f"{b['item_name']} earns ${b_margin - a_margin:.2f} more margin per unit "
                                     f"and is already bought with it {r['lift']}× more than chance"})
    upsell = upsell[:TOP_N]

    frequently_paired = sorted(pairs, key=lambda r: r["support"], reverse=True)[:TOP_N]
    loss_warnings = [
        {**r, "recommendation": "Do not bundle",
         "reason": "Strong association but the pair contains a loss-making item, so a bundle would amplify losses"}
        for r in strong if r["has_loss_making_item"]
        and len(r["antecedents"]) == 1 and len(r["consequents"]) == 1
    ][:TOP_N]

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps({
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "algorithm": "FP-Growth (mlxtend)",
        "parameters": {"min_support": MIN_SUPPORT, "max_itemset_length": MAX_ITEMSET_LEN,
                       "bundle_min_lift": BUNDLE_MIN_LIFT, "cross_sell_min_confidence": CROSS_SELL_MIN_CONFIDENCE},
        "summary": {
            "transactions": n_orders,
            "items": int(basket.shape[1]),
            "avg_basket_items": round(float(basket.sum(axis=1).mean()), 2),
            "frequent_itemsets": int(len(itemsets)),
            "rules": len(records),
            "strong_rules": len(strong),
            "strong_rules_with_loss_items": len(strong) - len(safe),
            "combo_recommendations": len(combos),
            "cross_sell_recommendations": len(cross_sell),
            "upsell_recommendations": len(upsell),
        },
        "rules": records[:500],
        "combos": combos,
        "cross_sell": cross_sell,
        "upsell": upsell,
        "frequently_paired": frequently_paired,
        "loss_warnings": loss_warnings,
    }, indent=1))

    print(f"Combos: {len(combos)}, cross-sell: {len(cross_sell)}, upsell: {len(upsell)}, "
          f"loss-item warnings: {len(loss_warnings)}")
    for r in combos[:5]:
        print(f"  {r['rule']:<55} lift {r['lift']:.2f}  conf {r['confidence']:.2f}")
    print(f"Saved {OUTPUT_PATH.name} in {time.time() - started:.0f}s")


if __name__ == "__main__":
    main()
