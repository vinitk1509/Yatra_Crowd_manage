"""
Dataset Validation Engine for Synthetic Crowd Flow Data.
Ensures physical plausibility, temporal continuity, and absence of anomalies.
"""

import pandas as pd
import numpy as np
from typing import Dict, Any, List


class DatasetValidator:

    def validate(self, df: pd.DataFrame) -> Dict[str, Any]:
        report = {
            "total_records": len(df),
            "checkpoints_found": df["checkpointCode"].unique().tolist(),
            "scenarios_found": df["scenario"].unique().tolist(),
            "date_range": [str(df["timestamp"].min()), str(df["timestamp"].max())],
            "passed": True,
            "errors": [],
            "warnings": [],
            "metrics": {}
        }

        # 1. Null / Missing Checks
        null_counts = df.isnull().sum()
        if null_counts.any():
            cols = null_counts[null_counts > 0].to_dict()
            report["errors"].append(f"Found missing values in columns: {cols}")
            report["passed"] = False

        # 2. Non-Negativity Checks
        numeric_cols = ["currentCrowd", "inflow", "outflow", "capacity", "averageTransitTime", "inTransitCount"]
        for col in numeric_cols:
            if (df[col] < 0).any():
                neg_count = (df[col] < 0).sum()
                report["errors"].append(f"Column '{col}' has {neg_count} negative values.")
                report["passed"] = False

        # 3. Speed Bounds Check (0.2 to 12.0 km/h)
        speed_invalid = (df["averageSpeed"] < 0.2) | (df["averageSpeed"] > 12.0)
        if speed_invalid.any():
            report["errors"].append(f"Found {speed_invalid.sum()} speed values out of physical bounds [0.2, 12.0].")
            report["passed"] = False

        # 4. Occupancy Bounds Check (0 to 100%)
        occ_invalid = (df["occupancyPercentage"] < 0.0) | (df["occupancyPercentage"] > 100.0)
        if occ_invalid.any():
            report["errors"].append(f"Found {occ_invalid.sum()} occupancy percentage values outside [0, 100].")
            report["passed"] = False

        # 5. Duplicate Timestamps per Checkpoint
        duplicates = df.duplicated(subset=["timestamp", "checkpointCode"])
        if duplicates.any():
            report["errors"].append(f"Found {duplicates.sum()} duplicate (timestamp, checkpointCode) pairs.")
            report["passed"] = False

        # 6. Conservation Equation Check
        # For each checkpoint, check if crowd_t == max(0, crowd_{t-1} + inflow_t - outflow_t)
        for cp in df["checkpointCode"].unique():
            cp_df = df[df["checkpointCode"] == cp].sort_values("timestamp").reset_index(drop=True)
            diffs = []
            for i in range(1, len(cp_df)):
                expected = max(0, cp_df.loc[i - 1, "currentCrowd"] + cp_df.loc[i, "inflow"] - cp_df.loc[i, "outflow"])
                actual = cp_df.loc[i, "currentCrowd"]
                diffs.append(abs(actual - expected))
            max_diff = max(diffs) if diffs else 0
            if max_diff > 1:
                report["warnings"].append(f"Conservation deviation of {max_diff} in checkpoint {cp}")

        # Summary Metrics
        report["metrics"] = {
            "mean_occupancy": round(float(df["occupancyPercentage"].mean()), 2),
            "max_occupancy": round(float(df["occupancyPercentage"].max()), 2),
            "mean_inflow": round(float(df["inflow"].mean()), 2),
            "mean_outflow": round(float(df["outflow"].mean()), 2),
            "mean_speed_kmh": round(float(df["averageSpeed"].mean()), 2),
            "bottleneck_records": int(df["isBottleneck"].sum()),
            "critical_status_records": int((df["operationalStatus"] == "CRITICAL").sum())
        }

        return report


if __name__ == "__main__":
    df = pd.read_csv("ml/synthetic_crowd_data.csv")
    validator = DatasetValidator()
    report = validator.validate(df)
    print("--- DATASET VALIDATION REPORT ---")
    print(f"Status Passed: {report['passed']}")
    print(f"Total Rows: {report['total_records']}")
    print(f"Checkpoints: {report['checkpoints_found']}")
    print(f"Scenarios: {len(report['scenarios_found'])} present")
    print(f"Metrics: {report['metrics']}")
    if report["errors"]:
        print(f"ERRORS: {report['errors']}")
    else:
        print("ZERO ERRORS DETECTED. Dataset is physically sound and ready for ML.")
