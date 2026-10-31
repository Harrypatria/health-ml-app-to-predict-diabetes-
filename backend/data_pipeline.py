"""
AI Health Copilot Pro — Phase 1: Data Ingestion & Audit
Author: Dr. Harry Patria, Chief Data & AI Officer, Patria & Co.
CRISP-DM Phase: Data Understanding & Data Cleaning
"""

import os
import sys
import numpy as np
import pandas as pd

ZERO_MISSING_COLUMNS = ["Glucose", "BloodPressure", "SkinThickness", "Insulin", "BMI"]
FEATURE_NAMES = [
    "Pregnancies",
    "Glucose",
    "BloodPressure",
    "SkinThickness",
    "Insulin",
    "BMI",
    "DiabetesPedigreeFunction",
    "Age"
]
TARGET_COLUMN = "Outcome"

_BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
_PROJECT_DIR = os.path.dirname(_BACKEND_DIR)

def load_and_audit_data(csv_path: str = "") -> pd.DataFrame:
    """
    Loads the Pima Indians Diabetes Dataset and executes the clinical audit:
    1. Check shape, columns, and target distribution
    2. Audit biologically impossible zeros
    3. Replace biologically impossible zeros with np.nan
    4. Validate data integrity
    """
    if not csv_path:
        csv_path = os.path.join(_PROJECT_DIR, "dataset", "diabetes.csv")
    if not os.path.exists(csv_path):
        # Fallback search paths (absolute, relative to project root)
        alt_paths = [
            os.path.join(_PROJECT_DIR, "public", "assets", "aistudio", "diabetes_698c203a.csv"),
            os.path.join(_PROJECT_DIR, "diabetes.csv"),
            os.path.join(_BACKEND_DIR, "diabetes.csv"),
        ]
        found = False
        for alt in alt_paths:
            if os.path.exists(alt):
                csv_path = alt
                found = True
                break
        if not found:
            raise FileNotFoundError(f"Diabetes dataset could not be found at {csv_path} or fallback locations.")

    print(f"[AUDIT] Loading Pima dataset from: {csv_path}")
    df = pd.read_csv(csv_path)

    print(f"[AUDIT] Raw Dataset Shape: {df.shape[0]} rows x {df.shape[1]} columns")
    print("\n[AUDIT] Target Distribution (Outcome):")
    val_counts = df[TARGET_COLUMN].value_counts()
    print(val_counts)
    print(f"Positive class (Diabetic): {val_counts.get(1, 0)} ({val_counts.get(1, 0) / len(df) * 100:.2f}%)")
    print(f"Negative class (Non-Diabetic): {val_counts.get(0, 0)} ({val_counts.get(0, 0) / len(df) * 100:.2f}%)")

    print("\n[AUDIT] Counting biologically impossible zeros:")
    zero_audit = {}
    for col in ZERO_MISSING_COLUMNS:
        zero_count = (df[col] == 0).sum()
        zero_pct = (zero_count / len(df)) * 100
        zero_audit[col] = zero_count
        print(f"  • {col:15s}: {zero_count:3d} zeros ({zero_pct:5.1f}% missing)")

    # Treat biologically impossible zeros as missing (np.nan)
    print("\n[AUDIT] Replacing biologically impossible zeros with np.nan in target columns...")
    df_cleaned = df.copy()
    for col in ZERO_MISSING_COLUMNS:
        df_cleaned[col] = df_cleaned[col].replace(0, np.nan)

    # Verify no unexpected nulls in features where zero is valid (Pregnancies) or Age
    assert df_cleaned["Age"].isna().sum() == 0, "Error: Unexpected missing values found in Age"
    assert df_cleaned["Outcome"].isna().sum() == 0, "Error: Unexpected missing values in Outcome"

    print("[AUDIT] Data audit completed successfully. Cleaned dataset ready for preprocessing.")
    return df_cleaned

if __name__ == "__main__":
    df = load_and_audit_data()
    print("\nCleaned Data Summary:")
    print(df.describe().T[["count", "mean", "std", "min", "50%", "max"]])
