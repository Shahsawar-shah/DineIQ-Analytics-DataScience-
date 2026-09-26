from fastapi import APIRouter

router = APIRouter()


@router.get("/items")
def get_items():
    return {"message": "placeholder"}


@router.get("/profitability")
def get_profitability():
    return {"message": "placeholder"}


@router.get("/performance")
def get_performance():
    return {"message": "placeholder"}
