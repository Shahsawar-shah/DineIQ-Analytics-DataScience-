from fastapi import APIRouter
from pathlib import Path
import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
PROCESSED = PROJECT_ROOT / "processed_data"
FEATURES = PROCESSED / "features"

router = APIRouter()


@router.get("/sales")
def get_sales_anomalies():
    menu = pd.read_csv(FEATURES / "menu_item_features.csv")
    mean_rev = menu["total_revenue"].mean()
    std_rev = menu["total_revenue"].std()
    anomalies = []

    # Sales spikes
    spikes = menu[
        menu["total_revenue"] > mean_rev + 2*std_rev]
    for _, row in spikes.iterrows():
        anomalies.append({
            "item_id": int(row["item_id"]),
            "item_name": str(row["item_name"]),
            "type": "Sales Spike",
            "severity": "High",
            "value": round(float(row["total_revenue"]), 2),
            "threshold": round(float(mean_rev + 2*std_rev), 2),
            "description": f"Revenue {round(float(row['total_revenue']), 0)} is unusually high"
        })

    # Loss making
    loss = menu[menu["profit_percentage"] < 0]
    for _, row in loss.iterrows():
        anomalies.append({
            "item_id": int(row["item_id"]),
            "item_name": str(row["item_name"]),
            "type": "Loss Making Item",
            "severity": "Critical",
            "value": round(float(row["profit_percentage"]), 2),
            "threshold": 0,
            "description": f"Selling at loss: {round(float(row['profit_percentage']), 1)}% margin"
        })

    # Rating anomalies
    ratings = menu[
        (menu["avg_rating"] < 3.7) |
        (menu["avg_rating"] > 4.1)]
    for _, row in ratings.iterrows():
        anomalies.append({
            "item_id": int(row["item_id"]),
            "item_name": str(row["item_name"]),
            "type": "Rating Anomaly",
            "severity": "Medium",
            "value": round(float(row["avg_rating"]), 2),
            "threshold": "3.7 - 4.1",
            "description": f"Unusual rating: {round(float(row['avg_rating']), 2)}"
        })

    return {
        "total": len(anomalies),
        "critical": len([a for a in anomalies
                        if a["severity"] == "Critical"]),
        "high": len([a for a in anomalies
                    if a["severity"] == "High"]),
        "medium": len([a for a in anomalies
                      if a["severity"] == "Medium"]),
        "anomalies": anomalies
    }
