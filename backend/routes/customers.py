from fastapi import APIRouter, Query
from pathlib import Path
import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
PROCESSED = PROJECT_ROOT / "processed_data"
FEATURES = PROCESSED / "features"

router = APIRouter()


@router.get("/summary")
def get_customer_summary():
    df = pd.read_csv(PROCESSED / "customers_clean.csv")
    features = pd.read_csv(FEATURES / "customer_features.csv")
    segments = df["customer_segment"].value_counts().to_dict()
    return {
        "total_customers": int(len(df)),
        "segments": segments,
        "avg_rfm_score": round(
            float(features["rfm_score"].mean()), 2),
        "high_value_count": int(
            segments.get("High-Value Loyal", 0)),
        "at_risk_count": int(
            segments.get("At-Risk", 0)),
        "new_count": int(
            segments.get("New", 0)),
        "channels": df["preferred_channel"].value_counts().to_dict(),
        "cities": df["city"].value_counts().head(5).to_dict(),
        "age_groups": df["age_group"].value_counts().to_dict()
    }


@router.get("/segments")
def get_segments():
    df = pd.read_csv(PROCESSED / "customers_clean.csv")
    segments = df["customer_segment"].value_counts()
    total = len(df)
    return [
        {
            "segment": seg,
            "count": int(count),
            "percentage": round(count/total*100, 1)
        }
        for seg, count in segments.items()
    ]


@router.get("/rfm")
def get_rfm(limit: int = Query(default=20)):
    df = pd.read_csv(FEATURES / "customer_features.csv")
    top = df.nlargest(limit, "rfm_score")
    return top[[
        "customer_id", "rfm_score", "recency_score",
        "frequency_score", "monetary_score",
        "monetary_value", "avg_order_value",
        "customer_segment"
    ]].fillna(0).to_dict(orient="records")


@router.get("/at-risk")
def get_at_risk(limit: int = Query(default=20)):
    customers = pd.read_csv(PROCESSED / "customers_clean.csv")
    features = pd.read_csv(FEATURES / "customer_features.csv")
    at_risk = customers[
        customers["customer_segment"] == "At-Risk"]
    merged = at_risk.merge(
        features[["customer_id", "rfm_score",
                  "monetary_value", "recency_days"]],
        on="customer_id", how="left")
    return merged.head(limit)[[
        "customer_id", "customer_code",
        "city", "preferred_channel",
        "rfm_score", "monetary_value", "recency_days"
    ]].fillna(0).to_dict(orient="records")
