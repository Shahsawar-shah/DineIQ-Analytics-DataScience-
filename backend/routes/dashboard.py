from fastapi import APIRouter
from pathlib import Path
import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
PROCESSED = PROJECT_ROOT / "processed_data"
FEATURES = PROCESSED / "features"

router = APIRouter()


@router.get("/summary")
def get_summary():
    menu = pd.read_csv(FEATURES / "menu_item_features.csv")
    orders = pd.read_csv(PROCESSED / "orders_clean.csv")
    customers = pd.read_csv(PROCESSED / "customers_clean.csv")
    wastage = pd.read_csv(PROCESSED / "wastage_clean.csv")
    classifications = pd.read_csv(
        PROCESSED / "python_menu_classifications.csv")
    return {
        "total_revenue": round(float(menu["total_revenue"].sum()), 2),
        "total_orders": int(len(orders)),
        "total_customers": int(len(customers)),
        "avg_rating": round(float(menu["avg_rating"].mean()), 2),
        "avg_profit_percentage": round(
            float(menu["profit_percentage"].mean()), 2),
        "total_wastage_records": int(len(wastage)),
        "avg_wastage_percentage": round(
            float(menu["wastage_percentage"].mean()), 2),
        "menu_classifications": classifications[
            "python_class"].value_counts().to_dict(),
        "records_processed": 1305677,
        "records_cleaned": 1289177,
        "records_removed": 13500,
        "records_quarantined": 3000,
        "data_quality_score": round((1289177/1305677)*100, 1),
        "ml_pipeline": {
            "python": {
                "best_model": "XGBoost",
                "accuracy": 100.0,
                "f1_score": 1.00,
                "status": "complete"
            },
            "spark": {
                "status": "pending_vps",
                "models": ["Random Forest", "GBT", "LogReg"]
            }
        }
    }
