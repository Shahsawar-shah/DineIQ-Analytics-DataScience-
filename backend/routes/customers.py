"""
Customer intelligence API (SRS Steps 15-16, 36, 44).

Segments and churn risk come from spark_jobs/feature_engineering.py, which
computes them from order history (RFM + 90-day trend). The generator's
customer_segment label is not used.
"""

from fastapi import APIRouter, Depends, Query

from middleware.auth_middleware import require_analytics
from routes.common import FEATURES, PROCESSED, read_csv, records

router = APIRouter(dependencies=[Depends(require_analytics)])

SEGMENT_STRATEGIES = {
    "High-Value Loyal": "Reward with loyalty perks and early access; avoid blanket discounts",
    "Frequent": "Offer bundles and upsells on their favourite category",
    "Promotion-Driven": "Target with margin-safe promotions only; watch for promotion traps",
    "At-Risk": "Win-back offer on their favourite category within 7 days",
    "New": "Second-visit incentive to build a repeat habit",
    "Occasional": "Weekend and peak-hour reminders through their preferred channel",
    "No Orders": "Registered but never ordered: onboarding campaign",
}


def _features():
    return read_csv(FEATURES / "customer_features.csv")


@router.get("/summary")
def get_customer_summary():
    features = _features()
    profiles = read_csv(PROCESSED / "customers_clean.csv", usecols=["customer_id", "city", "age_group"])
    ordering = features[features["frequency"].notna()]
    segments = features["computed_segment"].value_counts().to_dict()
    return {
        "total_customers": int(len(features)),
        "customers_with_orders": int(len(ordering)),
        "segments": segments,
        "avg_rfm_score": round(float(ordering["rfm_score"].mean()), 2),
        "high_value_count": int(segments.get("High-Value Loyal", 0)),
        "at_risk_count": int(features["churn_at_risk"].fillna(False).astype(bool).sum()),
        "new_count": int(segments.get("New", 0)),
        "promotion_sensitive_count": int(segments.get("Promotion-Driven", 0)),
        "repeat_customer_rate": round(float((ordering["frequency"] >= 2).mean() * 100), 2),
        "churn_levels": features["churn_risk_level"].value_counts().to_dict(),
        "channels": ordering["preferred_channel"].value_counts().to_dict(),
        "cities": profiles["city"].value_counts().head(5).to_dict(),
        "age_groups": profiles["age_group"].value_counts().to_dict(),
    }


@router.get("/segments")
def get_segments():
    features = _features()
    grouped = features.groupby("computed_segment").agg(
        count=("customer_id", "size"),
        avg_recency_days=("recency_days", "mean"),
        avg_frequency=("frequency", "mean"),
        avg_monetary=("monetary_value", "mean"),
        avg_promo_ratio=("promo_order_ratio", "mean"),
    ).sort_values("count", ascending=False).round(2).reset_index()
    grouped = grouped.rename(columns={"computed_segment": "segment"})
    grouped["percentage"] = (grouped["count"] / len(features) * 100).round(1)
    grouped["strategy"] = grouped["segment"].map(SEGMENT_STRATEGIES).fillna("")
    return records(grouped)


@router.get("/rfm")
def get_rfm(limit: int = Query(default=20, ge=1, le=500)):
    df = _features()
    top = df.nlargest(limit, "rfm_score")
    return records(top[[
        "customer_id", "rfm_score", "recency_score", "frequency_score", "monetary_score",
        "recency_days", "frequency", "monetary_value", "avg_order_value", "computed_segment",
    ]].rename(columns={"computed_segment": "customer_segment"}))


@router.get("/rfm-distribution")
def get_rfm_distribution():
    df = _features().dropna(subset=["rfm_score"])
    dist = df["rfm_score"].astype(int).value_counts().sort_index()
    return [{"rfm_score": int(k), "customers": int(v)} for k, v in dist.items()]


@router.get("/at-risk")
@router.get("/churn-risk")
def get_at_risk(limit: int = Query(default=20, ge=1, le=500)):
    """Customers flagged by the churn rule, highest risk score first."""
    features = _features()
    profiles = read_csv(PROCESSED / "customers_clean.csv", usecols=["customer_id", "customer_code", "city"])
    at_risk = features[features["churn_at_risk"].fillna(False).astype(bool)] \
        .merge(profiles, on="customer_id", how="left") \
        .sort_values(["churn_risk_score", "monetary_value"], ascending=False)
    return records(at_risk.head(limit)[[
        "customer_id", "customer_code", "city", "preferred_channel", "rfm_score", "monetary_value",
        "recency_days", "orders_recent_90d", "orders_prior_90d", "spend_recent_90d", "spend_prior_90d",
        "churn_risk_score", "churn_risk_level",
    ]])


@router.get("/promotion-sensitive")
def get_promotion_sensitive(limit: int = Query(default=20, ge=1, le=500)):
    df = _features()
    promo = df[df["computed_segment"] == "Promotion-Driven"].sort_values("promo_order_ratio", ascending=False)
    return records(promo.head(limit)[[
        "customer_id", "promo_order_ratio", "promo_orders", "frequency", "monetary_value", "avg_order_value",
    ]])
