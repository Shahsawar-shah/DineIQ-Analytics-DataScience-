from fastapi import APIRouter

router = APIRouter()


@router.get("/menu")
def get_menu_recommendations():
    return {"message": "placeholder"}


@router.get("/customers")
def get_customer_recommendations():
    return {"message": "placeholder"}
