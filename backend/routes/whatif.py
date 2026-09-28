from fastapi import APIRouter, Depends
from pathlib import Path
from pydantic import BaseModel
import pandas as pd

from middleware.auth_middleware import require_analytics
from routes.pricing import item_elasticities

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
PROCESSED = PROJECT_ROOT / "processed_data"
FEATURES = PROCESSED / "features"

router = APIRouter(dependencies=[Depends(require_analytics)])

# Used only when an item has no measured elasticity; the response says so.
DEFAULT_ELASTICITY = -1.0


class WhatIfRequest(BaseModel):
    item_id: int
    price_change_pct: float = 0
    discount_pct: float = 0
    prep_quantity_change_pct: float = 0
    demand_change_pct: float = 0
    elasticity: float | None = None


@router.post("/simulate")
def simulate(req: WhatIfRequest):
    menu = pd.read_csv(FEATURES / "menu_item_features.csv")
    item = menu[menu["item_id"] == req.item_id]
    if item.empty:
        return {"error": "Item not found"}
    row = item.iloc[0]

    current_price = float(row["avg_unit_price"])
    current_cost = float(row["avg_cost_price"])
    current_qty = float(row["total_quantity_sold"])
    current_revenue = float(row["total_revenue"])
    current_margin = float(row["profit_percentage"])
    current_wastage = float(row["wastage_percentage"])

    # New price
    new_price = current_price * (1 + req.price_change_pct/100)

    # Price elasticity: user override > measured for this item > labelled default
    measured = item_elasticities().get(req.item_id)
    if req.elasticity is not None:
        elasticity, elasticity_source = req.elasticity, "user supplied"
    elif measured is not None:
        elasticity, elasticity_source = measured, "measured from price history"
    else:
        elasticity, elasticity_source = DEFAULT_ELASTICITY, "assumed default (no price history)"
    demand_change = elasticity * req.price_change_pct / 100 + req.demand_change_pct / 100
    new_qty = max(current_qty * (1 + demand_change), 0)

    # Discount effect
    effective_price = new_price * (1 - req.discount_pct/100)

    # New revenue
    new_revenue = effective_price * new_qty

    # New margin
    new_margin = ((effective_price - current_cost) /
                  effective_price * 100) if effective_price > 0 else 0

    # Wastage change
    new_wastage = current_wastage * (
        1 + req.prep_quantity_change_pct/100)

    return {
        "item_id": req.item_id,
        "item_name": str(row["item_name"]),
        "note": "Simulated estimates only - not actual results",
        "assumptions": {
            "elasticity": round(float(elasticity), 3),
            "elasticity_source": elasticity_source,
            "extra_demand_change_pct": req.demand_change_pct,
        },
        "current": {
            "price": round(current_price, 2),
            "revenue": round(current_revenue, 2),
            "margin_pct": round(current_margin, 1),
            "quantity": int(current_qty),
            "wastage_pct": round(current_wastage, 1)
        },
        "simulated": {
            "price": round(new_price, 2),
            "effective_price": round(effective_price, 2),
            "revenue": round(new_revenue, 2),
            "margin_pct": round(new_margin, 1),
            "quantity": int(new_qty),
            "wastage_pct": round(new_wastage, 1)
        },
        "impact": {
            "revenue_change": round(new_revenue - current_revenue, 2),
            "revenue_change_pct": round(
                (new_revenue - current_revenue)/current_revenue*100, 1),
            "margin_change": round(new_margin - current_margin, 1),
            "quantity_change": int(new_qty - current_qty)
        }
    }


@router.get("/items")
def get_whatif_items():
    menu = pd.read_csv(FEATURES / "menu_item_features.csv")
    return menu[[
        "item_id", "item_name", "avg_unit_price",
        "profit_percentage", "total_quantity_sold"
    ]].to_dict(orient="records")
