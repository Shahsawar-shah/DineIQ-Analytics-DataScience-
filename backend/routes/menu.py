from fastapi import APIRouter
from pathlib import Path
import pandas as pd

router = APIRouter()

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
FEATURES_PATH = PROJECT_ROOT / "processed_data" / "features" / "menu_item_features.csv"
CLASSIFICATIONS_PATH = PROJECT_ROOT / "processed_data" / "python_menu_classifications.csv"


@router.get("/items")
def get_menu_items():
    df = pd.read_csv(FEATURES_PATH)
    return df[["item_id", "item_name", "category_id",
               "base_price", "profit_percentage",
               "avg_rating", "wastage_percentage",
               "total_revenue"]].to_dict(orient="records")


@router.get("/classifications")
def get_classifications():
    df = pd.read_csv(CLASSIFICATIONS_PATH)
    return df.to_dict(orient="records")


@router.get("/profit-drivers")
def get_profit_drivers():
    df = pd.read_csv(CLASSIFICATIONS_PATH)
    filtered = df[df["python_class"] == "Profit Driver"]
    return {
        "count": len(filtered),
        "items": filtered.to_dict(orient="records")
    }


@router.get("/volume-drivers")
def get_volume_drivers():
    df = pd.read_csv(CLASSIFICATIONS_PATH)
    filtered = df[df["python_class"] == "Volume Driver"]
    return {
        "count": len(filtered),
        "items": filtered.to_dict(orient="records")
    }


@router.get("/hidden-opportunities")
def get_hidden_opportunities():
    df = pd.read_csv(CLASSIFICATIONS_PATH)
    filtered = df[df["python_class"] == "Hidden Opportunity"]
    return {
        "count": len(filtered),
        "items": filtered.to_dict(orient="records")
    }


@router.get("/low-performers")
def get_low_performers():
    df = pd.read_csv(CLASSIFICATIONS_PATH)
    filtered = df[df["python_class"] == "Low Performer"]
    return {
        "count": len(filtered),
        "items": filtered.to_dict(orient="records")
    }


@router.get("/top-revenue")
def get_top_revenue(limit: int = 10):
    df = pd.read_csv(FEATURES_PATH)
    top = df.nlargest(limit, "total_revenue")
    return top[["item_id", "item_name", "total_revenue",
                "profit_percentage", "avg_rating"]
               ].to_dict(orient="records")


@router.get("/high-wastage")
def get_high_wastage(limit: int = 10):
    df = pd.read_csv(FEATURES_PATH)
    high = df.nlargest(limit, "wastage_percentage")
    return high[["item_id", "item_name",
                 "wastage_percentage", "total_revenue"]
                ].to_dict(orient="records")


@router.get("/summary")
def get_menu_summary():
    features = pd.read_csv(FEATURES_PATH)
    classifications = pd.read_csv(CLASSIFICATIONS_PATH)

    class_counts = classifications["python_class"].value_counts()

    return {
        "total_items": len(features),
        "avg_profit_percentage": round(
            features["profit_percentage"].mean(), 2),
        "avg_rating": round(
            features["avg_rating"].mean(), 2),
        "avg_wastage": round(
            features["wastage_percentage"].mean(), 2),
        "classifications": class_counts.to_dict(),
        "top_revenue_item": features.loc[
            features["total_revenue"].idxmax(),
            "item_name"
        ]
    }
