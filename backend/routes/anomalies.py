from fastapi import APIRouter

router = APIRouter()


@router.get("/")
def get_anomalies():
    return {"message": "placeholder"}


@router.get("/alerts")
def get_alerts():
    return {"message": "placeholder"}
