import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import settings  # noqa: F401  (loads config/.env before anything else)
from middleware.audit_middleware import AuditMiddleware
from models.audit import ensure_audit_table
from routes import (admin, anomalies, auth, basket_real, customers, dashboard,
                    dual_pipeline, forecasting_real, locations, menu, orders,
                    pricing, promotions, recommendations, wastage, whatif)

logger = logging.getLogger("dineiq")


@asynccontextmanager
async def lifespan(app):
    try:
        ensure_audit_table()
    except Exception as exc:  # API still serves analytics without the DB
        logger.warning("audit_logs table check failed: %s", exc)
    yield


app = FastAPI(
    title="DineIQ Analytics API",
    version="1.1.0",
    lifespan=lifespan,
)

cors_origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "*").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_methods=["*"],
    allow_headers=["*"]
)
app.add_middleware(AuditMiddleware)

app.include_router(auth.router, prefix="/api/auth")
app.include_router(dashboard.router, prefix="/api/dashboard")
app.include_router(menu.router, prefix="/api/menu")
app.include_router(customers.router, prefix="/api/customers")
app.include_router(orders.router, prefix="/api/orders")
app.include_router(wastage.router, prefix="/api/wastage")
app.include_router(forecasting_real.router, prefix="/api/forecast")
app.include_router(basket_real.router, prefix="/api/basket")
app.include_router(pricing.router, prefix="/api/pricing")
app.include_router(dual_pipeline.router, prefix="/api/dual-pipeline")
app.include_router(recommendations.router, prefix="/api/recommendations")
app.include_router(promotions.router, prefix="/api/promotions")
app.include_router(locations.router, prefix="/api/locations")
app.include_router(anomalies.router, prefix="/api/anomalies")
app.include_router(whatif.router, prefix="/api/whatif")
app.include_router(admin.router, prefix="/api/admin")


@app.get("/")
def root():
    return {"message": "DineIQ Analytics API", "status": "running"}


@app.get("/health")
def health():
    return {"status": "healthy"}
