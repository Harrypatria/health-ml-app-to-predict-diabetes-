"""
AI Health Copilot Pro — Phase 4 & 6: Model Training & Serialisation
Author: Dr. Harry Patria, Chief Data & AI Officer, Patria & Co.
CRISP-DM Phase: Modeling & Deployment
"""

import os
import json
import pickle
from typing import Dict, Any, List
import numpy as np
import pandas as pd
from sklearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import StratifiedKFold, cross_val_score, GridSearchCV
from sklearn.metrics import (
    accuracy_score,
    roc_auc_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    classification_report
)

from data_pipeline import load_and_audit_data, FEATURE_NAMES
from preprocessing import build_preprocessing_pipeline, prepare_train_test_split

NORMAL_RANGES = {
    "Glucose": (70, 99),
    "BloodPressure": (60, 80),
    "BMI": (18.5, 24.9),
    "Age": (0, 120)
}

def train_and_evaluate_models() -> Dict[str, Any]:
    """
    Executes Phase 4 Model Training:
    1. Loads audited data and prepares stratified 80/20 train/test split.
    2. Builds pipelines for Model A (RandomForest) and Model B (LogisticRegression).
    3. Evaluates both models on the holdout test set.
    4. Performs 5-Fold Stratified Cross Validation.
    5. Serialises the best pipeline, metrics, and feature names.
    """
    df = load_and_audit_data()
    X_train, X_test, y_train, y_test = prepare_train_test_split(df, test_size=0.2, random_state=42)

    # Candidate Model A: Random Forest
    rf_pipeline = Pipeline(
        steps=[
            ("preprocessing", build_preprocessing_pipeline()),
            (
                "classifier",
                RandomForestClassifier(
                    n_estimators=200,
                    max_depth=5,
                    class_weight="balanced",
                    random_state=42
                )
            )
        ]
    )

    # Candidate Model B: Logistic Regression
    lr_pipeline = Pipeline(
        steps=[
            ("preprocessing", build_preprocessing_pipeline()),
            (
                "classifier",
                LogisticRegression(
                    max_iter=1000,
                    class_weight="balanced",
                    random_state=42
                )
            )
        ]
    )

    print("\n[TRAINING] Fitting Candidate Model A: Random Forest (n_estimators=200, max_depth=5)...")
    rf_pipeline.fit(X_train, y_train)
    rf_pred = rf_pipeline.predict(X_test)
    rf_proba = rf_pipeline.predict_proba(X_test)[:, 1]
    rf_auc = roc_auc_score(y_test, rf_proba)
    rf_acc = accuracy_score(y_test, rf_pred)
    rf_prec = precision_score(y_test, rf_pred)
    rf_rec = recall_score(y_test, rf_pred)
    rf_f1 = f1_score(y_test, rf_pred)

    print("\n[TRAINING] Fitting Candidate Model B: Logistic Regression (max_iter=1000)...")
    lr_pipeline.fit(X_train, y_train)
    lr_pred = lr_pipeline.predict(X_test)
    lr_proba = lr_pipeline.predict_proba(X_test)[:, 1]
    lr_auc = roc_auc_score(y_test, lr_proba)
    lr_acc = accuracy_score(y_test, lr_pred)

    print(f"\n[RESULTS] Holdout Evaluation:")
    print(f"  • Model A (RandomForest)    — Accuracy: {rf_acc:.3f} | AUC-ROC: {rf_auc:.3f}")
    print(f"  • Model B (LogisticRegress) — Accuracy: {lr_acc:.3f} | AUC-ROC: {lr_auc:.3f}")

    # 5-Fold Stratified Cross-Validation on Full Data
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_scores = cross_val_score(rf_pipeline, df[FEATURE_NAMES], df["Outcome"], cv=cv, scoring="roc_auc")
    print(f"\n[CV] 5-Fold Stratified CV AUC-ROC for Random Forest: {cv_scores.mean():.3f} (±{cv_scores.std():.3f})")

    # Select Best Model (prefer Random Forest if competitive)
    best_pipeline = rf_pipeline if rf_auc >= lr_auc - 0.02 else lr_pipeline
    selected_name = "RandomForestClassifier" if best_pipeline == rf_pipeline else "LogisticRegression"
    print(f"\n[SELECTION] Best model chosen: {selected_name}")

    cm = confusion_matrix(y_test, rf_pred)
    metrics = {
        "model_name": selected_name,
        "accuracy": float(rf_acc),
        "auc_roc": float(rf_auc),
        "precision": float(rf_prec),
        "recall": float(rf_rec),
        "f1_score": float(rf_f1),
        "cv_auc_mean": float(cv_scores.mean()),
        "cv_auc_std": float(cv_scores.std()),
        "confusion_matrix": {
            "tn": int(cm[0][0]),
            "fp": int(cm[0][1]),
            "fn": int(cm[1][0]),
            "tp": int(cm[1][1])
        },
        "target_auc_threshold_met": bool(rf_auc >= 0.80),
        "feature_names": FEATURE_NAMES
    }

    # Phase 6: Serialisation
    os.makedirs("saved_models", exist_ok=True)
    model_save_path = "saved_models/diabetes_model.sav"
    with open(model_save_path, "wb") as f:
        pickle.dump(best_pipeline, f)
    print(f"[SERIALISE] Saved trained model pipeline to: {model_save_path}")

    with open("saved_models/feature_names.json", "w") as f:
        json.dump(FEATURE_NAMES, f, indent=2)

    with open("saved_models/metrics.json", "w") as f:
        json.dump(metrics, f, indent=2)

    print("[SERIALISE] Saved feature_names.json and metrics.json successfully.")
    return metrics

def predict_diabetes_proba(patient_data: List[float], model_path: str = "saved_models/diabetes_model.sav") -> float:
    """
    Helper function to score a patient feature vector using the serialized model.
    """
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Model not found at {model_path}. Please run train.py first.")
    with open(model_path, "rb") as f:
        pipeline = pickle.load(f)
    
    # Replace zeros in biological cols with np.nan for imputer
    data_arr = np.array(patient_data, dtype=float).reshape(1, -1)
    # Zero indices: 1 (Glucose), 2 (BloodPressure), 3 (SkinThickness), 4 (Insulin), 5 (BMI)
    for idx in [1, 2, 3, 4, 5]:
        if data_arr[0, idx] == 0:
            data_arr[0, idx] = np.nan

    df_sample = pd.DataFrame(data_arr, columns=FEATURE_NAMES)
    proba = pipeline.predict_proba(df_sample)[0, 1]
    return float(proba)

def flag_abnormal_features(patient_data: List[float], feature_names: List[str] = FEATURE_NAMES) -> List[str]:
    """
    Deterministic clinical feature flagging based on hard-coded medical normal ranges:
      Glucose: (70, 99)
      BloodPressure: (60, 80)
      BMI: (18.5, 24.9)
      Age: (0, 120)
    """
    flags = []
    feat_map = dict(zip(feature_names, patient_data))

    glucose = feat_map.get("Glucose")
    if glucose is not None and not np.isnan(glucose):
        if glucose > 99:
            flags.append(f"Glucose: {glucose:.1f} mg/dL (HIGH - normal range 70-99)")
        elif glucose < 70 and glucose > 0:
            flags.append(f"Glucose: {glucose:.1f} mg/dL (LOW - normal range 70-99)")

    bp = feat_map.get("BloodPressure")
    if bp is not None and not np.isnan(bp):
        if bp > 80:
            flags.append(f"BloodPressure: {bp:.1f} mmHg (HIGH - normal range 60-80)")
        elif bp < 60 and bp > 0:
            flags.append(f"BloodPressure: {bp:.1f} mmHg (LOW - normal range 60-80)")

    bmi = feat_map.get("BMI")
    if bmi is not None and not np.isnan(bmi):
        if bmi > 24.9:
            flags.append(f"BMI: {bmi:.1f} kg/m² (HIGH - normal range 18.5-24.9)")
        elif bmi < 18.5 and bmi > 0:
            flags.append(f"BMI: {bmi:.1f} kg/m² (LOW - normal range 18.5-24.9)")

    age = feat_map.get("Age")
    if age is not None and not np.isnan(age):
        if age >= 45:
            flags.append(f"Age: {int(age)} yrs (ELEVATED RISK - ADA age risk threshold >=45)")

    return flags

if __name__ == "__main__":
    train_and_evaluate_models()
