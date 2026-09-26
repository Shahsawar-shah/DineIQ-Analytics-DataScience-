from fastapi import APIRouter

router = APIRouter()


@router.get("/summary")
def get_summary():
    return {"message": "placeholder"}


@router.get("/trends")
def get_trends():
    return {"message": "placeholder"}
