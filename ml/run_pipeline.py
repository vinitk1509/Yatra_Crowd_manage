"""
End-to-End Pipeline Execution:
1. Synthetic Generation (10 physical scenarios)
2. Dataset Validation
3. Time-Series Feature Engineering
4. Multi-Horizon Training & Baseline Comparison
5. Model Bundle Export to Spring Boot
"""

import os
import sys
from synthetic_generator import SyntheticCrowdDataGenerator
from dataset_validator import DatasetValidator
from train_models import train_and_evaluate


def main():
    print("================================================================")
    print("      AMARNATH YATRA CROWD INTELLIGENCE — ML PIPELINE           ")
    print("================================================================")

    # 1. Generate Synthetic Data
    print("\n[STEP 1/4] Generating 60 days of physical corridor crowd data (28,800 timestamps)...")
    generator = SyntheticCrowdDataGenerator(seed=42)
    df = generator.generate_dataset(days=60, interval_minutes=15)
    os.makedirs("ml", exist_ok=True)
    df.to_csv("ml/synthetic_crowd_data.csv", index=False)
    print(f"Generated {len(df)} rows across 5 checkpoints and 10 scenarios.")

    # 2. Validate Dataset
    print("\n[STEP 2/4] Validating dataset integrity & physics...")
    validator = DatasetValidator()
    report = validator.validate(df)
    if not report["passed"]:
        print(f"VALIDATION FAILED: {report['errors']}")
        sys.exit(1)
    print("Validation PASSED (0 physical violations, 0 missing values).")

    # 3. Train & Evaluate Models
    print("\n[STEP 3/4] Running time-aware training & baseline evaluation...")
    results = train_and_evaluate(df)

    # 4. Deployment Verification
    print("\n[STEP 4/4] Verifying model bundle deployment...")
    bundle_path = "backend/src/main/resources/models/crowd_forecast_model.json"
    if os.path.exists(bundle_path):
        print(f"SUCCESS: Model bundle deployed to {bundle_path}")
    else:
        print(f"ERROR: Model bundle missing at {bundle_path}")
        sys.exit(1)

    print("\n================================================================")
    print("   ML CROWD PREDICTION PIPELINE COMPLETED SUCCESSFULLY!        ")
    print("================================================================")


if __name__ == "__main__":
    main()
