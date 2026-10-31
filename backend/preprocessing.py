"""
AI Health Copilot Pro — Phase 3: Preprocessing Pipeline
Author: Dr. Harry Patria, Chief Data & AI Officer, Patria & Co.
CRISP-DM Phase: Data Preparation
"""

from typing import Tuple
import pandas as pd
import numpy as np
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split

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
TARGET_NAME = "Outcome"

def build_preprocessing_pipeline() -> Pipeline:
    """
    Builds the standard scikit-learn preprocessing pipeline:
    - Step 1: SimpleImputer(strategy='median') to handle clinical NaN replacements
    - Step 2: StandardScaler() to zero-center and standardize unit variance
    """
    pipeline = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler())
        ]
    )
    return pipeline

def prepare_train_test_split(
    df: pd.DataFrame,
    test_size: float = 0.2,
    random_state: int = 42
) -> Tuple[pd.DataFrame, pd.DataFrame, pd.Series, pd.Series]:
    """
    Separates features X and target y, then performs stratified 80/20 train/test split.
    Guarantees strict ordering of FEATURE_NAMES.
    """
    X = df[FEATURE_NAMES].copy()
    y = df[TARGET_NAME].copy()

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=test_size,
        stratify=y,
        random_state=random_state
    )

    print(f"[PREPROCESS] Split complete: Train={X_train.shape[0]} samples, Test={X_test.shape[0]} samples")
    print(f"[PREPROCESS] Train class ratio (Outcome=1): {y_train.mean():.3f}")
    print(f"[PREPROCESS] Test class ratio (Outcome=1): {y_test.mean():.3f}")

    return X_train, X_test, y_train, y_test
