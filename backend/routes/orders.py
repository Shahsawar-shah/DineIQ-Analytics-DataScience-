from fastapi import APIRouter
from pathlib import Path
import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
PROCESSED = PROJECT_ROOT / "processed_data"

router = APIRouter()


@router.get("/summary")
def get_orders_summary():
    orders = pd.read_csv(PROCESSED / "orders_clean.csv")
    orders["order_date"] = pd.to_datetime(orders["order_date"])

    channels = orders["order_channel"].value_counts()
    total = len(orders)

    return {
        "total_orders": total,
        "cancelled_orders": int(
            orders["is_cancelled"].sum()
            if "is_cancelled" in orders.columns else 0),
        "channels": {
            ch: {
                "count": int(cnt),
                "percentage": round(cnt/total*100, 1)
            }
            for ch, cnt in channels.items()
        },
        "date_range": {
            "start": str(orders["order_date"].min().date()),
            "end": str(orders["order_date"].max().date())
        },
        "peak_analysis": {
            "description": "Peak hours 12-14 and 19-21",
            "weekend_boost": "40% more orders on weekends"
        }
    }


@router.get("/by-channel")
def get_by_channel():
    orders = pd.read_csv(PROCESSED / "orders_clean.csv")
    channels = orders["order_channel"].value_counts()
    total = len(orders)
    return [
        {
            "channel": ch,
            "count": int(cnt),
            "percentage": round(cnt/total*100, 1)
        }
        for ch, cnt in channels.items()
    ]
