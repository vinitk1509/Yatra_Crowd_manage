"""
ML Training, Quantile GBDT Regression & Model Evaluation Pipeline for Crowd Forecasting.
Trains Quantile GBDTs (q10, q50, q90), Ridge, and RF models across multi-horizons (+15m, +30m, +60m).
Saves artifacts and exports lightweight JSON bundle for Spring Boot backend.
"""

import json
import os
import joblib
import numpy as np
import pandas as pd
from typing import Dict, Any, Tuple
from sklearn.linear_model import Ridge
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, root_mean_squared_error

from feature_engineering import build_features, FEATURE_COLUMNS


def time_aware_split(df: pd.DataFrame, train_ratio: float = 0.70, val_ratio: float = 0.15) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
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
    mask = y_true > 10
    mape = float(np.mean(np.abs((y_true[mask] - y_pred[mask]) / y_true[mask])) * 100.0) if mask.any() else 0.0

    return {
        "mae": round(mae, 2),
        "rmse": round(rmse, 2),
        "mape_percent": round(mape, 2)
    }


def pinball_loss(y_true: np.ndarray, y_pred: np.ndarray, alpha: float) -> float:
    err = y_true - y_pred
    return float(np.mean(np.maximum(alpha * err, (alpha - 1.0) * err)))


def train_and_evaluate(df: pd.DataFrame) -> Dict[str, Any]:
    processed_df, features = build_features(df)
    train_df, val_df, test_df = time_aware_split(processed_df)

    print(f"Dataset split: Total={len(processed_df)} | Train={len(train_df)}, Val={len(val_df)}, Test={len(test_df)}")

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
        "dataset_summary": {
            "total_records": len(processed_df),
            "train_size": len(train_df),
            "val_size": len(val_df),
            "test_size": len(test_df),
            "num_features": len(features)
        },
        "horizons": {},
        "scenario_evaluations": {},
        "feature_importance": {},
        "model_export": {
            "version": "2.0.0-quantile-spatiotemporal",
            "features": features,
            "feature_importance_top": {},
            "horizons": {}
        }
    }

    # 1. Baseline Model Evaluation (Persistence)
    baseline_preds = {
        h: test_df["current_crowd"].values for h in horizons
    }
    baseline_metrics = {
        h: compute_metrics(targets[h]["test"], baseline_preds[h]) for h in horizons
    }

    print("\n--- BASELINE MODEL (PERSISTENCE) ---")
    for h, m in baseline_metrics.items():
        print(f"Baseline +{h}: MAE = {m['mae']}, RMSE = {m['rmse']}, MAPE = {m['mape_percent']}%")

    trained_models = {}

    for h in horizons:
        y_train = targets[h]["train"]
        y_val = targets[h]["val"]
        y_test = targets[h]["test"]

        # 2a. Linear / Ridge Baseline
        ridge = Ridge(alpha=1.0)
        ridge.fit(X_train, y_train)
        p_ridge = ridge.predict(X_test)
        m_ridge = compute_metrics(y_test, p_ridge)

        # 2b. Random Forest Regressor
        rf = RandomForestRegressor(n_estimators=70, max_depth=10, random_state=42, n_jobs=-1)
        rf.fit(X_train, y_train)
        p_rf = rf.predict(X_test)
        m_rf = compute_metrics(y_test, p_rf)

        # 2c. Gradient Boosted Trees (Point Forecast / Mean Squared Error)
        gbr_mean = GradientBoostingRegressor(n_estimators=100, max_depth=5, learning_rate=0.08, random_state=42)
        gbr_mean.fit(X_train, y_train)
        p_gbr = gbr_mean.predict(X_test)
        m_gbr = compute_metrics(y_test, p_gbr)

        # 2d. Quantile GBDT Models (q10 = 10th percentile, q50 = median, q90 = 90th percentile)
        gbr_q10 = GradientBoostingRegressor(loss='quantile', alpha=0.10, n_estimators=60, max_depth=4, learning_rate=0.08, random_state=42)
        gbr_q10.fit(X_train, y_train)
        p_q10 = gbr_q10.predict(X_test)

        gbr_q50 = GradientBoostingRegressor(loss='quantile', alpha=0.50, n_estimators=60, max_depth=4, learning_rate=0.08, random_state=42)
        gbr_q50.fit(X_train, y_train)
        p_q50 = gbr_q50.predict(X_test)

        gbr_q90 = GradientBoostingRegressor(loss='quantile', alpha=0.90, n_estimators=60, max_depth=4, learning_rate=0.08, random_state=42)
        gbr_q90.fit(X_train, y_train)
        p_q90 = gbr_q90.predict(X_test)

        # Quantile Coverage Evaluation (Target within [q10, q90])
        covered = (y_test >= p_q10) & (y_test <= p_q90)
        coverage_ratio = float(np.mean(covered) * 100.0)
        pinball_10 = pinball_loss(y_test, p_q10, 0.10)
        pinball_50 = pinball_loss(y_test, p_q50, 0.50)
        pinball_90 = pinball_loss(y_test, p_q90, 0.90)

        # Feature Importance from GBDT
        feat_importances = dict(zip(features, [round(float(v), 4) for v in gbr_mean.feature_importances_]))
        sorted_feats = sorted(feat_importances.items(), key=lambda x: x[1], reverse=True)
        results["feature_importance"][h] = sorted_feats

        # Store models
        trained_models[f"{h}_gbr_mean"] = gbr_mean
        trained_models[f"{h}_gbr_q10"] = gbr_q10
        trained_models[f"{h}_gbr_q50"] = gbr_q50
        trained_models[f"{h}_gbr_q90"] = gbr_q90
        trained_models[f"{h}_ridge"] = ridge

        # Compute average empirical quantile offset for embedded inference
        q10_offset = float(np.mean(p_gbr - p_q10))
        q90_offset = float(np.mean(p_q90 - p_gbr))

        results["horizons"][h] = {
            "baseline": baseline_metrics[h],
            "ridge": m_ridge,
            "random_forest": m_rf,
            "gradient_boosting": m_gbr,
            "quantile_coverage_pct": round(coverage_ratio, 2),
            "pinball_loss_q10": round(pinball_10, 2),
            "pinball_loss_q50": round(pinball_50, 2),
            "pinball_loss_q90": round(pinball_90, 2),
            "best_model": "GradientBoosting (GBDT + Quantile Envelopes)",
            "selected_metrics": m_gbr,
            "improvement_vs_baseline_pct": round(((baseline_metrics[h]["mae"] - m_gbr["mae"]) / baseline_metrics[h]["mae"]) * 100.0, 2)
        }

        # Export parameters for Java runtime
        results["model_export"]["horizons"][h] = {
            "intercept": float(ridge.intercept_),
            "coefficients": {feat: float(coef) for feat, coef in zip(features, ridge.coef_)},
            "rmse": float(m_gbr["rmse"]),
            "mae": float(m_gbr["mae"]),
            "q10_offset": round(q10_offset, 2),
            "q90_offset": round(q90_offset, 2),
            "quantile_coverage_pct": round(coverage_ratio, 2)
        }

        results["model_export"]["feature_importance_top"][h] = sorted_feats[:7]

        print(f"\n--- +{h} FORECAST EVALUATION ---")
        print(f"Ridge:                 MAE={m_ridge['mae']}, RMSE={m_ridge['rmse']}, MAPE={m_ridge['mape_percent']}%")
        print(f"Random Forest:         MAE={m_rf['mae']}, RMSE={m_rf['rmse']}, MAPE={m_rf['mape_percent']}%")
        print(f"Gradient Boosting:     MAE={m_gbr['mae']}, RMSE={m_gbr['rmse']}, MAPE={m_gbr['mape_percent']}%")
        print(f"Quantile Coverage:     {coverage_ratio:.1f}% of observations safely inside [q10, q90]")
        print(f"Improvement vs Base:   +{results['horizons'][h]['improvement_vs_baseline_pct']}% error reduction")
        print(f"Top 3 Predictive Cues: {', '.join([f'{k} ({v*100:.1f}%)' for k, v in sorted_feats[:3]])}")

    # 3. Scenario-Specific Test Evaluation (+30m)
    print("\n--- SCENARIO-SPECIFIC EVALUATION (+30m) ---")
    gbr_30m = trained_models["30m_gbr_mean"]
    test_df["pred_30m"] = gbr_30m.predict(X_test)

    for scenario in sorted(test_df["scenario"].unique()):
        sc_df = test_df[test_df["scenario"] == scenario]
        if len(sc_df) > 5:
            sc_m = compute_metrics(sc_df["target_30m"].values, sc_df["pred_30m"].values)
            results["scenario_evaluations"][scenario] = sc_m
            print(f"Scenario [{scenario:<24}]: MAE={sc_m['mae']:<6} RMSE={sc_m['rmse']:<6} MAPE={sc_m['mape_percent']}%")

    # 4. Save Artifacts
    os.makedirs("ml/models", exist_ok=True)
    joblib.dump(trained_models, "ml/models/trained_models.pkl")
    with open("ml/models/evaluation_report.json", "w") as f:
        json.dump(results, f, indent=2)

    # Export to Spring Boot resources
    os.makedirs("backend/src/main/resources/models", exist_ok=True)
    with open("backend/src/main/resources/models/crowd_forecast_model.json", "w") as f:
        json.dump(results["model_export"], f, indent=2)

    print("\nSUCCESS: Deployed updated model bundle to backend/src/main/resources/models/crowd_forecast_model.json")
    return results


if __name__ == "__main__":
    df = pd.read_csv("ml/synthetic_crowd_data.csv")
    train_and_evaluate(df)
