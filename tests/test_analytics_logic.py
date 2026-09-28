"""Unit tests for the analytical rules — small hand-made inputs, no dataset needed."""

import json

import numpy as np
import pandas as pd
import pytest

from conftest import ROOT, load_module

forecasting = load_module("python_pipeline/demand_forecasting.py", "demand_forecasting")
pricing = load_module("python_pipeline/price_sensitivity.py", "price_sensitivity")
py_models = load_module("python_pipeline/models.py", "py_menu_models")


# --- Forecast accuracy metrics (SRS Step 22) -------------------------------
def test_forecast_metrics_match_hand_calculation():
    actual = [10, 20, 30, 40]
    pred = [12, 18, 33, 40]
    m = forecasting.score(actual, pred)
    assert m["mae"] == pytest.approx((2 + 2 + 3 + 0) / 4)
    assert m["rmse"] == pytest.approx(np.sqrt((4 + 4 + 9 + 0) / 4), abs=1e-3)
    assert m["mape"] == pytest.approx((0.2 + 0.1 + 0.1 + 0) / 4 * 100, abs=0.01)


def test_mape_ignores_zero_actuals():
    m = forecasting.score([0, 10], [5, 12])
    assert m["mape"] == pytest.approx(20.0)


def test_linear_forecast_uses_only_training_dates():
    """Time-aware validation: the regression is fit on train dates only and
    extrapolates a clean weekly pattern into the unseen period."""
    dates = pd.date_range("2025-01-01", periods=140, freq="D")
    series = pd.Series(100 + 20 * (dates.dayofweek >= 5) + np.arange(140) * 0.5, index=dates, dtype=float)
    train, test = series.iloc[:112], series.iloc[112:]
    pred, _ = forecasting.fit_linear(train, test.index)
    assert forecasting.score(test, pred)["mae"] < 1.0


# --- Price sensitivity classification (SRS Step 26) -------------------------
@pytest.mark.parametrize("elasticity, significant, expected", [
    (-2.0, 1, "Highly Price Sensitive"),
    (-1.5, 1, "Highly Price Sensitive"),
    (-0.8, 2, "Moderately Price Sensitive"),
    (-0.2, 1, "Low Price Sensitivity"),
    (-2.0, 0, "Low Price Sensitivity"),      # large ratio but no significant shift = noise
    (0.9, 3, "Low Price Sensitivity"),       # demand rose with price
    (None, 0, "Insufficient Data"),
])
def test_price_sensitivity_classes(elasticity, significant, expected):
    assert pricing.classify(elasticity, significant) == expected


# --- Menu classification split (dual pipeline uses the same rule) -----------
def test_stratified_split_is_deterministic_and_70_30():
    df = pd.DataFrame({"item_id": range(1, 151), "cls": [i % 4 for i in range(150)]})
    split_a = py_models.stratified_split(df, "cls")
    split_b = py_models.stratified_split(df.sample(frac=1, random_state=1).sort_index(), "cls")
    assert split_a.equals(split_b)
    assert split_a.sum() == pytest.approx(45, abs=2)
    for _, group in df.assign(test=split_a).groupby("cls"):
        assert group["test"].mean() == pytest.approx(0.3, abs=0.05)


def test_menu_labels_are_rule_based_on_several_indicators():
    rows = pd.DataFrame([
        {"profit_percentage": 70, "total_quantity_sold": 900, "wastage_percentage": 5, "avg_rating": 4.2},   # Profit Driver
        {"profit_percentage": 70, "total_quantity_sold": 900, "wastage_percentage": 40, "avg_rating": 4.2},  # high wastage -> not PD
        {"profit_percentage": 65, "total_quantity_sold": 100, "wastage_percentage": 5, "avg_rating": 4.5},   # Hidden Opportunity
        {"profit_percentage": -10, "total_quantity_sold": 950, "wastage_percentage": 5, "avg_rating": 4.0},  # loss maker
    ])
    labels = [py_models.label_item(r, median_quantity=500, profit_low=40, profit_high=55) for _, r in rows.iterrows()]
    assert labels[0] == 0
    assert labels[1] != 0
    assert labels[2] == 2
    assert labels[3] == 3


# --- Market-basket metrics (SRS Step 17) ------------------------------------
def test_association_rule_support_confidence_lift():
    from mlxtend.frequent_patterns import association_rules, fpgrowth

    baskets = pd.DataFrame(
        [[1, 1, 0], [1, 1, 0], [1, 0, 1], [0, 1, 0]], columns=["tea", "cake", "soup"]).astype(bool)
    rules = association_rules(fpgrowth(baskets, min_support=0.25, use_colnames=True), metric="lift", min_threshold=0)
    rule = rules[(rules["antecedents"] == frozenset({"tea"})) & (rules["consequents"] == frozenset({"cake"}))].iloc[0]
    assert rule["support"] == pytest.approx(2 / 4)
    assert rule["confidence"] == pytest.approx(2 / 3)
    assert rule["lift"] == pytest.approx((2 / 3) / (3 / 4))


# --- Pipeline outputs are real, not hard-coded ------------------------------
@pytest.mark.skipif(not (ROOT / "reports" / "dual_pipeline_summary.json").exists(), reason="comparison not run")
def test_dual_pipeline_report_has_100_plus_unseen_records():
    summary = json.loads((ROOT / "reports" / "dual_pipeline_summary.json").read_text())
    customers = summary["customer_segmentation"]
    assert customers["test_records"] >= 100
    assert customers["agreement_count"] + customers["disagreement_count"] == customers["test_records"]
    comparison = pd.read_csv(ROOT / "reports" / "dual_pipeline_comparison.csv")
    assert len(comparison) == customers["test_records"]
    expected = {"record_id", "actual_segment", "spark_result", "python_result", "match",
                "numerical_difference", "explanation"}
    assert expected <= set(comparison.columns)
    assert comparison["match"].mean() * 100 == pytest.approx(customers["agreement_pct"], abs=0.01)
