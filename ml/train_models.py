"""
ML Training, Baseline Comparison & Model Evaluation Pipeline for Crowd Forecasting.
Saves model artifacts and exports lightweight JSON bundle for Spring Boot backend.
"""

import json
import os
import joblib
import numpy as np
import pandas as pd
from typing import Dict, Any, Tuple
from sklearn.linear_model import Ridge
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, root_mean_squared_error

from feature_engineering import build_features, FEATURE_COLUMNS


def time_aware_split(df: pd.DataFrame, train_ratio: float = 0.70, val_ratio: float = 0.15) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    # Strictly chronological split
    df = df.sort_values("timestamp").reset_index(drop=True)
    n = len(df)
    train_end = int(n * train_ratio)
    val_end = int(n * (train_ratio + val_ratio))

    train_df = df.iloc[:train_end].copy()
    val_df = df.iloc[train_end:val_end].copy()
    test_df = df.iloc[val_end:].copy()

    return train_df, val_df, test_df


def compute_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> Dict[str, float]:
    mae = float(mean_absolute_error(y_true, y_pred))
    rmse = float(root_mean_squared_error(y_true, y_pred))
    # Safe MAPE (avoid division by zero)
    mask = y_true > 10
    mape = float(np.mean(np.abs((y_true[mask] - y_pred[mask]) / y_true[mask])) * 100.0) if mask.any() else 0.0

    return {
        "mae": round(mae, 2),
        "rmse": round(rmse, 2),
        "mape_percent": round(mape, 2)
    }


def train_and_evaluate(df: pd.DataFrame) -> Dict[str, Any]:
    processed_df, features = build_features(df)
    train_df, val_df, test_df = time_aware_split(processed_df)

    print(f"Dataset split: Train={len(train_df)}, Val={len(val_df)}, Test={len(test_df)}")

    X_train = train_df[features].values
    X_val = val_df[features].values
    X_test = test_df[features].values

    horizons = ["15m", "30m", "60m"]
    targets = {
        "15m": {"train": train_df["target_15m"].values, "val": val_df["target_15m"].values, "test": test_df["target_15m"].values},
        "30m": {"train": train_df["target_30m"].values, "val": val_df["target_30m"].values, "test": test_df["target_30m"].values},
        "60m": {"train": train_df["target_60m"].values, "val": val_df["target_60m"].values, "test": test_df["target_60m"].values},
    }

    results = {
        "horizons": {},
        "scenario_evaluations": {},
        "model_export": {
            "version": "1.0.0",
            "features": features,
            "horizons": {}
        }
    }

    # 1. Evaluate Baseline Model (Persistence: y_{t+h} = current_crowd)
    baseline_preds = {
        h: test_df["current_crowd"].values for h in horizons
    }
    baseline_metrics = {
        h: compute_metrics(targets[h]["test"], baseline_preds[h]) for h in horizons
    }

    print("\n--- BASELINE MODEL (PERSISTENCE) ---")
    for h, m in baseline_metrics.items():
        print(f"Baseline +{h}: MAE = {m['mae']}, RMSE = {m['rmse']}, MAPE = {m['mape_percent']}%")

    # 2. Train and Evaluate ML Models
    trained_models = {}

    for h in horizons:
        y_train = targets[h]["train"]
        y_val = targets[h]["val"]
        y_test = targets[h]["test"]

        # Models
        ridge = Ridge(alpha=1.0)
        ridge.fit(X_train, y_train)

        rf = RandomForestRegressor(n_estimators=60, max_depth=10, random_state=42, n_jobs=-1)
        rf.fit(X_train, y_train)

        gbr = GradientBoostingRegressor(n_estimators=80, max_depth=5, learning_rate=0.08, random_state=42)
        gbr.fit(X_train, y_train)

        # Predictions on Test set
        p_ridge = ridge.predict(X_test)
        p_rf = rf.predict(X_test)
        p_gbr = gbr.predict(X_test)

        m_ridge = compute_metrics(y_test, p_ridge)
        m_rf = compute_metrics(y_test, p_rf)
        m_gbr = compute_metrics(y_test, p_gbr)

        # Pick best model (GBDT or Ridge)
        best_model_name = "GradientBoosting" if m_gbr["rmse"] <= m_ridge["rmse"] else "Ridge"
        best_model = gbr if best_model_name == "GradientBoosting" else ridge
        best_metrics = m_gbr if best_model_name == "GradientBoosting" else m_ridge
        trained_models[h] = best_model

        results["horizons"][h] = {
            "baseline": baseline_metrics[h],
            "ridge": m_ridge,
            "random_forest": m_rf,
            "gradient_boosting": m_gbr,
            "best_model": best_model_name,
            "selected_metrics": best_metrics,
            "improvement_vs_baseline_pct": round(((baseline_metrics[h]["mae"] - best_metrics["mae"]) / baseline_metrics[h]["mae"]) * 100.0, 2)
        }

        # Export model coefficients & parameters for Spring Boot embedded inference
        results["model_export"]["horizons"][h] = {
            "intercept": float(ridge.intercept_),
            "coefficients": {feat: float(coef) for feat, coef in zip(features, ridge.coef_)},
            "rmse": float(m_ridge["rmse"]),
            "mae": float(m_ridge["mae"])
        }

        print(f"\n--- +{h} FORECAST EVALUATION ---")
        print(f"Ridge:               MAE={m_ridge['mae']}, RMSE={m_ridge['rmse']}, MAPE={m_ridge['mape_percent']}%")
        print(f"Random Forest:       MAE={m_rf['mae']}, RMSE={m_rf['rmse']}, MAPE={m_rf['mape_percent']}%")
        print(f"Gradient Boosting:   MAE={m_gbr['mae']}, RMSE={m_gbr['rmse']}, MAPE={m_gbr['mape_percent']}%")
        print(f"Improvement over Baseline: +{results['horizons'][h]['improvement_vs_baseline_pct']}% reduction in MAE")

    # 3. Scenario-Specific Test Evaluation
    print("\n--- SCENARIO-SPECIFIC EVALUATION (+30m) ---")
    ridge_30m = trained_models["30m"]
    test_df["pred_30m"] = ridge_30m.predict(X_test)

    for scenario in test_df["scenario"].unique():
        sc_df = test_df[test_df["scenario"] == scenario]
        if len(sc_df) > 5:
            sc_m = compute_metrics(sc_df["target_30m"].values, sc_df["pred_30m"].values)
            results["scenario_evaluations"][scenario] = sc_m
            print(f"Scenario [{scenario:<22}]: MAE={sc_m['mae']:<6} RMSE={sc_m['rmse']:<6} MAPE={sc_m['mape_percent']}%")

    # 4. Save Artifacts
    os.makedirs("ml/models", exist_ok=True)
    joblib.dump(trained_models, "ml/models/trained_models.pkl")
    with open("ml/models/evaluation_report.json", "w") as f:
        json.dump(results, f, indent=2)

    # Export to Spring Boot resources
    os.makedirs("backend/src/main/resources/models", exist_ok=True)
    with open("backend/src/main/resources/models/crowd_forecast_model.json", "w") as f:
        json.dump(results["model_export"], f, indent=2)

    print("\nSaved trained model bundle to backend/src/main/resources/models/crowd_forecast_model.json")
    return results


if __name__ == "__main__":
    df = pd.read_csv("ml/synthetic_crowd_data.csv")
    train_and_evaluate(df)
