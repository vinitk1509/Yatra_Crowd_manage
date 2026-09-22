"""
Time-Series Feature Engineering Pipeline for Multi-Horizon Crowd Forecasting.
Constructs lag windows, rolling momentum, cyclical time representations, and target horizons (+15m, +30m, +60m).
"""

import numpy as np
import pandas as pd
from typing import Tuple, List, Dict


FEATURE_COLUMNS = [
    "current_crowd",
    "crowd_lag_1",      # t-15m
    "crowd_lag_2",      # t-30m
    "crowd_lag_3",      # t-45m
    "crowd_lag_4",      # t-60m
    "crowd_delta_15m",  # current - lag_1
    "crowd_delta_30m",  # current - lag_2
    "inflow",
    "outflow",
    "net_flow",
    "average_speed",
    "transit_time",
    "occupancy_pct",
    "capacity",
    "in_transit_count",
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
    df = df.sort_values(["checkpointCode", "timestamp"]).reset_index(drop=True)

    all_features = []

    for cp_code in df["checkpointCode"].unique():
        cp_df = df[df["checkpointCode"] == cp_code].copy().reset_index(drop=True)

        # Lags for crowd
        cp_df["crowd_lag_1"] = cp_df["currentCrowd"].shift(1)  # t-15m
        cp_df["crowd_lag_2"] = cp_df["currentCrowd"].shift(2)  # t-30m
        cp_df["crowd_lag_3"] = cp_df["currentCrowd"].shift(3)  # t-45m
        cp_df["crowd_lag_4"] = cp_df["currentCrowd"].shift(4)  # t-60m

        # Momentum / Trend
        cp_df["crowd_delta_15m"] = cp_df["currentCrowd"] - cp_df["crowd_lag_1"]
        cp_df["crowd_delta_30m"] = cp_df["currentCrowd"] - cp_df["crowd_lag_2"]

        # Rename core columns to standard feature names
        cp_df["current_crowd"] = cp_df["currentCrowd"]
        cp_df["net_flow"] = cp_df["netFlow"]
        cp_df["average_speed"] = cp_df["averageSpeed"]
        cp_df["transit_time"] = cp_df["averageTransitTime"]
        cp_df["occupancy_pct"] = cp_df["occupancyPercentage"]
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

        all_features.append(cp_df)

    processed_df = pd.concat(all_features, ignore_index=True)
    
    # Drop warm-up lags (first 4 rows) and end-of-series target leads (last 4 rows)
    processed_df = processed_df.dropna(subset=["crowd_lag_4", "target_60m"]).reset_index(drop=True)

    # Sort strictly chronologically to prepare for time-aware splitting
    processed_df = processed_df.sort_values("timestamp").reset_index(drop=True)

    return processed_df, FEATURE_COLUMNS
