from fastapi import APIRouter

router = APIRouter()


@router.get("/")
def get_locations():
    return {"message": "placeholder"}


@router.get("/performance")
def get_performance():
    return {"message": "placeholder"}
