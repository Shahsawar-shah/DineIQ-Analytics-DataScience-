"""
DineIQ Analytics - Demand Forecasting (SRS Steps 20-22)

Forecasts daily demand (units sold) for the whole business, every menu
category, every restaurant location and every menu item.

Time-aware validation — no random split, no leakage:
  * each series is split chronologically: the first 80% of days train the
    models, the last 20% of days are the unseen test period
  * Linear Regression only uses calendar features (trend, weekday, annual
    cycle) that are known in advance, never lagged actuals from the test period
  * SARIMAX is fit on the training days only and forecasts the whole test
    period in one go

Models compared on the test period with MAE, RMSE, MAPE and R²:
  Naive (last value)        baseline: last training day repeated
  Seasonal Naive (7-day)    baseline: last training week repeated
  Linear Regression         scikit-learn, calendar features
  ARIMA                     statsmodels SARIMAX(2,0,0)(1,0,0,7) with trend

The better of the two real models (Linear Regression / ARIMA, lowest test
MAE) is refit on the full history and used for the future forecast; the
report states whether it beats the naive baseline (up to MAX_HORIZON days; the API slices it to
the horizon the user picks).

Run from anywhere:  python python_pipeline/demand_forecasting.py
Writes  reports/forecast_results.json
"""

import json
import time
import warnings
from datetime import datetime
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
from statsmodels.tsa.statespace.sarimax import SARIMAX

warnings.filterwarnings("ignore")

PROJECT_ROOT = Path(__file__).resolve().parent.parent
PROCESSED = PROJECT_ROOT / "processed_data"
OUTPUT_PATH = PROJECT_ROOT / "reports" / "forecast_results.json"

TRAIN_FRACTION = 0.8
MAX_HORIZON = 90
Z_90 = 1.645                 # 90% interval
HIGH_RISK_PERCENTILE = 90    # future days above this share of history are "high-risk"
HISTORY_DAYS = {"overall": None, "category": 180, "location": 120, "item": 60}

MODELS = ["Naive (last value)", "Seasonal Naive (7-day)", "Linear Regression", "ARIMA"]
BASELINE = "Naive (last value)"
CANDIDATES = ["Linear Regression", "ARIMA"]


# ---------------------------------------------------------------------------
# Data
# ---------------------------------------------------------------------------
def load_daily_demand():
    orders = pd.read_csv(PROCESSED / "orders_clean.csv",
                         usecols=["order_id", "order_date", "restaurant_id", "is_cancelled"],
                         parse_dates=["order_date"])
    orders = orders[~orders["is_cancelled"].astype(bool)]
    lines = pd.read_csv(PROCESSED / "order_items_clean.csv", usecols=["order_id", "item_id", "quantity"])
    menu = pd.read_csv(PROCESSED / "menu_items_clean.csv", usecols=["item_id", "item_name", "category_id"])
    categories = pd.read_csv(PROCESSED / "menu_categories_clean.csv", usecols=["category_id", "category_name"])
    restaurants = pd.read_csv(PROCESSED / "restaurants_clean.csv", usecols=["restaurant_id", "restaurant_name"])

    df = lines.merge(orders[["order_id", "order_date", "restaurant_id"]], on="order_id") \
              .merge(menu[["item_id", "category_id"]], on="item_id")
    dates = pd.date_range(df["order_date"].min(), df["order_date"].max(), freq="D")

    def pivot(key):
        return (df.groupby(["order_date", key])["quantity"].sum()
                .unstack(fill_value=0).reindex(dates, fill_value=0))

    return {
        "dates": dates,
        "overall": {"all": ("All menu items", df.groupby("order_date")["quantity"].sum().reindex(dates, fill_value=0))},
        "category": {str(k): (categories.set_index("category_id")["category_name"].get(k, f"Category {k}"), s)
                     for k, s in pivot("category_id").items()},
        "location": {str(k): (restaurants.set_index("restaurant_id")["restaurant_name"].get(k, f"Location {k}"), s)
                     for k, s in pivot("restaurant_id").items()},
        "item": {str(k): (menu.set_index("item_id")["item_name"].get(k, f"Item {k}"), s)
                 for k, s in pivot("item_id").items()},
    }


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
def calendar_features(dates, origin):
    t = (dates - origin).days.to_numpy()
    doy = dates.dayofyear.to_numpy()
    features = pd.DataFrame({
        "t": t,
        "sin_year": np.sin(2 * np.pi * doy / 365.25),
        "cos_year": np.cos(2 * np.pi * doy / 365.25),
    }, index=dates)
    dow = pd.get_dummies(dates.dayofweek, prefix="dow").astype(float)
    dow.index = dates
    for d in range(7):  # make sure all weekday columns exist
        dow[f"dow_{d}"] = dow.get(f"dow_{d}", 0.0)
    return pd.concat([features, dow[[f"dow_{d}" for d in range(7)]]], axis=1)


def fit_linear(train, future_dates):
    origin = train.index[0]
    model = LinearRegression().fit(calendar_features(train.index, origin), train.to_numpy())
    residual_std = float(np.std(train.to_numpy() - model.predict(calendar_features(train.index, origin))))
    pred = model.predict(calendar_features(future_dates, origin))
    return np.clip(pred, 0, None), residual_std


def fit_arima(train, steps):
    model = SARIMAX(train.to_numpy(dtype=float), order=(2, 0, 0), seasonal_order=(1, 0, 0, 7), trend="ct",
                    enforce_stationarity=False, enforce_invertibility=False).fit(disp=False)
    forecast = model.get_forecast(steps=steps)
    ci = forecast.conf_int(alpha=0.10)
    return np.clip(forecast.predicted_mean, 0, None), np.clip(ci[:, 0], 0, None), ci[:, 1]


def forecast_all(train, future_dates):
    steps = len(future_dates)
    last_week = train.to_numpy()[-7:]
    preds = {
        "Naive (last value)": np.repeat(float(train.iloc[-1]), steps),
        "Seasonal Naive (7-day)": np.resize(last_week, steps).astype(float),
    }
    preds["Linear Regression"], _ = fit_linear(train, future_dates)
    try:
        preds["ARIMA"], _, _ = fit_arima(train, steps)
    except Exception:  # non-convergence on a flat/sparse series
        preds["ARIMA"] = None
    return preds


def score(actual, pred):
    actual = np.asarray(actual, dtype=float)
    pred = np.asarray(pred, dtype=float)
    err = actual - pred
    nonzero = actual != 0
    ss_tot = float(np.sum((actual - actual.mean()) ** 2))
    return {
        "mae": round(float(np.mean(np.abs(err))), 3),
        "rmse": round(float(np.sqrt(np.mean(err ** 2))), 3),
        "mape": round(float(np.mean(np.abs(err[nonzero] / actual[nonzero])) * 100), 2) if nonzero.any() else None,
        "r2": round(1 - float(np.sum(err ** 2)) / ss_tot, 4) if ss_tot else None,
    }


# ---------------------------------------------------------------------------
# One series end to end
# ---------------------------------------------------------------------------
def process_series(level, entity_id, name, series):
    n_train = int(len(series) * TRAIN_FRACTION)
    train, test = series.iloc[:n_train], series.iloc[n_train:]

    preds = forecast_all(train, test.index)
    metrics = {m: score(test, p) for m, p in preds.items() if p is not None}
    best_model = min((m for m in CANDIDATES if m in metrics), key=lambda m: metrics[m]["mae"])
    naive_mae = metrics[BASELINE]["mae"]
    improvement = round((naive_mae - metrics[best_model]["mae"]) / naive_mae * 100, 2) if naive_mae else None

    # Refit the best model on the full history for the real future forecast
    future_dates = pd.date_range(series.index[-1] + pd.Timedelta(days=1), periods=MAX_HORIZON, freq="D")
    if best_model == "ARIMA":
        future, lower, upper = fit_arima(series, MAX_HORIZON)
    elif best_model == "Linear Regression":
        future, resid = fit_linear(series, future_dates)
        lower, upper = np.clip(future - Z_90 * resid, 0, None), future + Z_90 * resid

    risk_threshold = float(np.percentile(series.to_numpy(), HIGH_RISK_PERCENTILE))
    history = series if HISTORY_DAYS[level] is None else series.iloc[-HISTORY_DAYS[level]:]

    return {
        "level": level,
        "entity_id": entity_id,
        "name": name,
        "train_period": {"start": str(train.index[0].date()), "end": str(train.index[-1].date()), "days": len(train)},
        "test_period": {"start": str(test.index[0].date()), "end": str(test.index[-1].date()), "days": len(test)},
        "metrics": metrics,
        "best_model": best_model,
        "improvement_vs_naive_pct": improvement,
        "beats_baseline": bool(improvement is not None and improvement > 0),
        "history": [{"date": str(d.date()), "actual": float(v)} for d, v in history.items()],
        "test": [
            {"date": str(d.date()), "actual": float(test.iloc[i]),
             **{m: round(float(p[i]), 2) for m, p in preds.items() if p is not None}}
            for i, d in enumerate(test.index)
        ],
        "future": [
            {"date": str(d.date()), "forecast": round(float(future[i]), 2),
             "lower": round(float(lower[i]), 2), "upper": round(float(upper[i]), 2),
             "high_risk": bool(future[i] >= risk_threshold)}
            for i, d in enumerate(future_dates)
        ],
        "high_risk_threshold": round(risk_threshold, 2),
    }


def main():
    started = time.time()
    print("=" * 48)
    print("DineIQ - Demand Forecasting")
    print("=" * 48)

    data = load_daily_demand()
    dates = data.pop("dates")
    n_train = int(len(dates) * TRAIN_FRACTION)
    print(f"History: {dates[0].date()} → {dates[-1].date()} ({len(dates)} days)")
    print(f"Chronological split: train {dates[0].date()} → {dates[n_train - 1].date()} ({n_train} days), "
          f"test {dates[n_train].date()} → {dates[-1].date()} ({len(dates) - n_train} days)")

    results = {}
    for level, series_map in data.items():
        results[level] = {}
        for entity_id, (name, series) in series_map.items():
            results[level][entity_id] = process_series(level, entity_id, name, series.astype(float))
        beats = sum(r["beats_baseline"] for r in results[level].values())
        print(f"  {level:<9} {len(series_map):>4} series  — best model beats naive baseline on {beats}")

    overall = results["overall"]["all"]
    print("\nOverall demand, test period:")
    print(f"{'Model':<24}{'MAE':>10}{'RMSE':>10}{'MAPE %':>9}{'R²':>9}")
    for model, m in overall["metrics"].items():
        print(f"{model:<24}{m['mae']:>10.1f}{m['rmse']:>10.1f}{(m['mape'] or 0):>9.2f}{(m['r2'] or 0):>9.3f}")
    print(f"Best: {overall['best_model']} — {overall['improvement_vs_naive_pct']}% lower MAE than naive")

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps({
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "model_version": f"forecast-{datetime.now():%Y%m%d-%H%M%S}",
        "train_fraction": TRAIN_FRACTION,
        "max_horizon_days": MAX_HORIZON,
        "models": MODELS,
        "baseline": BASELINE,
        "validation": "chronological split, first 80% of days train / last 20% test; "
                      "calendar-only regression features; no future data in training",
        "series": results,
    }))
    print(f"\nSaved {OUTPUT_PATH.name} in {time.time() - started:.0f}s")


if __name__ == "__main__":
    main()
