from fastapi import APIRouter

router = APIRouter()


@router.get("/sales")
def get_sales_forecast():
    return {"message": "placeholder"}


@router.get("/demand")
def get_demand_forecast():
    return {"message": "placeholder"}
