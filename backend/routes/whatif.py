from fastapi import APIRouter

router = APIRouter()


@router.get("/scenarios")
def get_scenarios():
    return {"message": "placeholder"}


@router.post("/simulate")
def simulate():
    return {"message": "placeholder"}
