from fastapi import APIRouter

router = APIRouter()


@router.get("/")
def get_customers():
    return {"message": "placeholder"}


@router.get("/rfm")
def get_rfm():
    return {"message": "placeholder"}


@router.get("/segments")
def get_segments():
    return {"message": "placeholder"}
