"""
AI Health Copilot Pro — FastAPI Backend Application
Author: Dr. Harry Patria, Chief Data & AI Officer, Patria & Co.
"""

import os
import json
import uuid
from typing import List, Union
from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from schemas import (
    PatientFeatures,
    PredictionResponse,
    BatchPredictRequest,
    BatchPredictResponse,
    ModelMetricsResponse,
    HealthResponse
)
from train import predict_diabetes_proba, flag_abnormal_features, FEATURE_NAMES
from agent import explain_diagnosis

app = FastAPI(
    title="AI Health Copilot Pro API",
    description="Full-stack clinical risk modeling & agentic AI copilot for early Type-2 diabetes detection.",
    version="3.1.0"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ALERT_THRESHOLD = float(os.getenv("ALERT_THRESHOLD", 0.70))

@app.get("/health", response_model=HealthResponse)
def health_check():
    model_exists = os.path.exists("saved_models/diabetes_model.sav")
    return HealthResponse(
        status="ok",
        model_loaded=model_exists,
        version="3.1.0"
    )

@app.get("/model-metrics", response_model=ModelMetricsResponse)
def get_model_metrics():
    metrics_path = "saved_models/metrics.json"
    if not os.path.exists(metrics_path):
        raise HTTPException(status_code=404, detail="Model metrics not found. Train the model first.")
    with open(metrics_path, "r") as f:
        data = json.load(f)
    return ModelMetricsResponse(
        auc_roc=data["auc_roc"],
        accuracy=data["accuracy"],
        precision=data["precision"],
        recall=data["recall"],
        f1_score=data["f1_score"],
        trained_at=data.get("trained_at", "2026-10-31"),
        model_version="1.0.0",
        algorithm=data.get("model_name", "RandomForestClassifier")
    )

@app.post("/predict", response_model=PredictionResponse)
def predict_single(patient: Union[PatientFeatures, List[float]]):
    try:
        if isinstance(patient, list):
            if len(patient) != 8:
                raise HTTPException(status_code=400, detail="Expected a list of 8 float features.")
            vector = patient
        else:
            vector = [
                patient.Pregnancies,
                patient.Glucose,
                patient.BloodPressure,
                patient.SkinThickness,
                patient.Insulin,
                patient.BMI,
                patient.DiabetesPedigreeFunction,
                patient.Age
            ]

        # 1. Deterministic Prediction
        probability = predict_diabetes_proba(vector)
        risk_level = "high" if probability >= 0.70 else "moderate" if probability >= 0.40 else "low"

        # 2. Deterministic Feature Flagging
        flags = flag_abnormal_features(vector, FEATURE_NAMES)

        # 3. Agentic Explanation
        explanation = explain_diagnosis(probability, flags)

        alert_triggered = probability >= ALERT_THRESHOLD

        return PredictionResponse(
            prediction_id=str(uuid.uuid4()),
            probability=probability,
            risk_level=risk_level,
            flags=flags,
            key_factors=explanation.key_factors,
            recommendation=explanation.recommendation,
            disclaimer=explanation.disclaimer,
            alert_triggered=alert_triggered
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

@app.post("/batch-predict", response_model=BatchPredictResponse)
def batch_predict(request: BatchPredictRequest):
    predictions = []
    high = 0
    mod = 0
    low = 0

    for patient in request.patients:
        vector = [
            patient.Pregnancies,
            patient.Glucose,
            patient.BloodPressure,
            patient.SkinThickness,
            patient.Insulin,
            patient.BMI,
            patient.DiabetesPedigreeFunction,
            patient.Age
        ]
        prob = predict_diabetes_proba(vector)
        level = "high" if prob >= 0.70 else "moderate" if prob >= 0.40 else "low"
        flags = flag_abnormal_features(vector, FEATURE_NAMES)
        explanation = explain_diagnosis(prob, flags)

        if level == "high":
            high += 1
        elif level == "moderate":
            mod += 1
        else:
            low += 1

        predictions.append(
            PredictionResponse(
                prediction_id=str(uuid.uuid4()),
                probability=prob,
                risk_level=level,
                flags=flags,
                key_factors=explanation.key_factors,
                recommendation=explanation.recommendation,
                disclaimer=explanation.disclaimer,
                alert_triggered=prob >= ALERT_THRESHOLD
            )
        )

    return BatchPredictResponse(
        total_processed=len(predictions),
        high_risk_count=high,
        moderate_risk_count=mod,
        low_risk_count=low,
        predictions=predictions
    )
