from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="DineIQ Analytics API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

# Import and include all routers
from routes import (auth, dashboard, menu, customers,
    orders, wastage, forecast, recommendations,
    promotions, locations, anomalies, whatif)

app.include_router(auth.router, prefix="/api/auth")
app.include_router(dashboard.router, prefix="/api/dashboard")
app.include_router(menu.router, prefix="/api/menu")
app.include_router(customers.router, prefix="/api/customers")
app.include_router(orders.router, prefix="/api/orders")
app.include_router(wastage.router, prefix="/api/wastage")
app.include_router(forecast.router, prefix="/api/forecast")
app.include_router(recommendations.router, prefix="/api/recommendations")
app.include_router(promotions.router, prefix="/api/promotions")
app.include_router(locations.router, prefix="/api/locations")
app.include_router(anomalies.router, prefix="/api/anomalies")
app.include_router(whatif.router, prefix="/api/whatif")


@app.get("/")
def root():
    return {"message": "DineIQ Analytics API", "status": "running"}


@app.get("/health")
def health():
    return {"status": "healthy"}
