"""
Time-Series Feature Engineering Pipeline for Multi-Horizon Crowd Forecasting.
Constructs lag windows, rolling momentum, upstream corridor propagation, cyclical time, and target horizons (+15m, +30m, +60m).
"""

import numpy as np
import pandas as pd
from typing import Tuple, List, Dict


FEATURE_COLUMNS = [
    "current_crowd",
    "crowd_lag_1",          # t-15m
    "crowd_lag_2",          # t-30m
    "crowd_lag_3",          # t-45m
    "crowd_lag_4",          # t-60m
    "crowd_delta_15m",      # current - lag_1
    "crowd_delta_30m",      # current - lag_2
    "inflow",
    "inflow_lag_1",         # inflow at t-15m
    "inflow_accel",         # inflow_t - inflow_{t-1}
    "outflow",
    "net_flow",
    "net_flow_accel",       # net_flow_t - net_flow_{t-1}
    "average_speed",
    "transit_time",
    "occupancy_pct",
    "density_speed_ratio",   # occupancy / max(0.5, speed)
    "capacity",
    "in_transit_count",
    "upstream_crowd_lag_1",  # upstream CP crowd at t-15m
    "upstream_outflow_lag_2",# upstream CP outflow at t-30m
    "upstream_pressure",     # (upstream_occ * upstream_net_flow)
    "sin_time_of_day",
    "cos_time_of_day",
    "day_of_week",
    "is_weekend",
    "weather_code",
    "is_bottleneck",
    "cp_id"
]


def build_features(df: pd.DataFrame) -> Tuple[pd.DataFrame, List[str]]:
    df = df.copy()
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df = df.sort_values(["timestamp", "checkpointCode"]).reset_index(drop=True)

    # 1. First extract checkpoint-level time series lags
    cp_dfs = {}
    cp_codes = sorted(df["checkpointCode"].unique())

    for cp_code in cp_codes:
        cp_df = df[df["checkpointCode"] == cp_code].copy().sort_values("timestamp").reset_index(drop=True)

        # Lags for crowd
        cp_df["crowd_lag_1"] = cp_df["currentCrowd"].shift(1)  # t-15m
        cp_df["crowd_lag_2"] = cp_df["currentCrowd"].shift(2)  # t-30m
        cp_df["crowd_lag_3"] = cp_df["currentCrowd"].shift(3)  # t-45m
        cp_df["crowd_lag_4"] = cp_df["currentCrowd"].shift(4)  # t-60m

        # Momentum / Trend
        cp_df["crowd_delta_15m"] = cp_df["currentCrowd"] - cp_df["crowd_lag_1"]
        cp_df["crowd_delta_30m"] = cp_df["currentCrowd"] - cp_df["crowd_lag_2"]

        # Inflow / Outflow dynamics
        cp_df["inflow_lag_1"] = cp_df["inflow"].shift(1)
        cp_df["inflow_accel"] = cp_df["inflow"] - cp_df["inflow_lag_1"]
        cp_df["net_flow_lag_1"] = cp_df["netFlow"].shift(1)
        cp_df["net_flow_accel"] = cp_df["netFlow"] - cp_df["net_flow_lag_1"]

        # Rename core columns to standard feature names
        cp_df["current_crowd"] = cp_df["currentCrowd"]
        cp_df["net_flow"] = cp_df["netFlow"]
        cp_df["average_speed"] = cp_df["averageSpeed"]
        cp_df["transit_time"] = cp_df["averageTransitTime"]
        cp_df["occupancy_pct"] = cp_df["occupancyPercentage"]
        cp_df["density_speed_ratio"] = cp_df["occupancy_pct"] / np.maximum(0.5, cp_df["average_speed"])
        cp_df["in_transit_count"] = cp_df["inTransitCount"]
        cp_df["cp_id"] = cp_df["checkpointId"]
        cp_df["is_bottleneck"] = cp_df["isBottleneck"].astype(int)

        # Cyclical Time Encoding
        cp_df["sin_time_of_day"] = np.sin(2 * np.pi * cp_df["timeOfDay"] / 24.0)
        cp_df["cos_time_of_day"] = np.cos(2 * np.pi * cp_df["timeOfDay"] / 24.0)
        cp_df["day_of_week"] = cp_df["dayOfWeek"]
        cp_df["is_weekend"] = cp_df["isWeekend"].astype(int)

        # Weather encoding
        weather_map = {"CLEAR": 0, "OVERCAST": 1, "RAIN": 2, "SLEET": 3}
        cp_df["weather_code"] = cp_df["weatherCondition"].map(lambda w: weather_map.get(w, 0))

        # Targets (Future Leads)
        cp_df["target_15m"] = cp_df["currentCrowd"].shift(-1)  # t+15m
        cp_df["target_30m"] = cp_df["currentCrowd"].shift(-2)  # t+30m
        cp_df["target_60m"] = cp_df["currentCrowd"].shift(-4)  # t+60m

        cp_dfs[cp_code] = cp_df

    # 2. Spatio-temporal upstream corridor features
    # Map each checkpoint to its upstream predecessor
    upstream_map = {
        "CP-01": None,
        "CP-02": "CP-01",
        "CP-03": "CP-02",
        "CP-04": "CP-03",
        "CP-05": "CP-04"
    }

    all_features = []
    for cp_code, cp_df in cp_dfs.items():
        upstream_code = upstream_map.get(cp_code)
        if upstream_code and upstream_code in cp_dfs:
            up_df = cp_dfs[upstream_code]
            # Match on index/timestamp
            cp_df["upstream_crowd_lag_1"] = up_df["currentCrowd"].shift(1)
            cp_df["upstream_outflow_lag_2"] = up_df["outflow"].shift(2)
            up_net = up_df["netFlow"].shift(1)
            up_occ = up_df["occupancyPercentage"].shift(1)
            cp_df["upstream_pressure"] = (up_occ * up_net) / 100.0
        else:
            cp_df["upstream_crowd_lag_1"] = 0.0
            cp_df["upstream_outflow_lag_2"] = 0.0
            cp_df["upstream_pressure"] = 0.0

        all_features.append(cp_df)

    processed_df = pd.concat(all_features, ignore_index=True)
    
    # Fill remaining NaNs from first lags with 0
    for col in FEATURE_COLUMNS:
        if col in processed_df.columns:
            processed_df[col] = processed_df[col].fillna(0.0)

    # Drop end-of-series target leads (last 4 rows)
    processed_df = processed_df.dropna(subset=["target_60m"]).reset_index(drop=True)

    # Sort strictly chronologically to prepare for time-aware splitting
    processed_df = processed_df.sort_values("timestamp").reset_index(drop=True)

    return processed_df, FEATURE_COLUMNS
