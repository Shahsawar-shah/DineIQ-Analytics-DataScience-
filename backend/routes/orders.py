from fastapi import APIRouter

router = APIRouter()


@router.get("/")
def get_orders():
    return {"message": "placeholder"}


@router.get("/{order_id}")
def get_order(order_id: int):
    return {"message": "placeholder"}
