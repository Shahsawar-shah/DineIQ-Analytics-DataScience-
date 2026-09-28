from fastapi import APIRouter, Depends
from pathlib import Path
import pandas as pd

from middleware.auth_middleware import require_operations

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
PROCESSED = PROJECT_ROOT / "processed_data"
FEATURES = PROCESSED / "features"
PEAK_HOUR_COUNT = 4
DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

router = APIRouter(dependencies=[Depends(require_operations)])


@router.get("/summary")
def get_orders_summary():
    orders = pd.read_csv(PROCESSED / "orders_clean.csv", parse_dates=["order_date"])
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
        "peak_analysis": peak_analysis(),
    }


def peak_analysis():
    """Peak hours / days computed from order_features.csv (SRS Step 19)."""
    features = pd.read_csv(FEATURES / "order_features.csv",
                           usecols=["order_hour", "order_day_of_week", "is_weekend"])
    by_hour = features["order_hour"].value_counts().sort_index()
    peak_hours = by_hour.nlargest(PEAK_HOUR_COUNT).index.sort_values().tolist()
    by_day = features["order_day_of_week"].value_counts().sort_index()
    weekday_avg = by_day[by_day.index < 5].mean()
    weekend_avg = by_day[by_day.index >= 5].mean()
    boost = (weekend_avg / weekday_avg - 1) * 100
    return {
        "peak_hours": [int(h) for h in peak_hours],
        "orders_by_hour": {int(h): int(n) for h, n in by_hour.items()},
        "orders_by_day": {DAY_NAMES[int(d)]: int(n) for d, n in by_day.items()},
        "peak_day": DAY_NAMES[int(by_day.idxmax())],
        "weekend_boost_pct": round(float(boost), 1),
        "description": (f"Busiest hours: {', '.join(f'{h}:00' for h in peak_hours)}; "
                        f"weekend days average {boost:+.0f}% orders vs weekdays"),
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
