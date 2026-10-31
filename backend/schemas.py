"""
AI Health Copilot Pro — Pydantic v2 Schemas
Author: Dr. Harry Patria, Chief Data & AI Officer, Patria & Co.
"""

from typing import List, Optional, Literal
from pydantic import BaseModel, Field
import uuid

class PatientFeatures(BaseModel):
    Pregnancies: float = Field(..., ge=0, le=25, description="Number of times pregnant")
    Glucose: float = Field(..., ge=0, le=350, description="Plasma glucose concentration 2h OGTT (mg/dL)")
    BloodPressure: float = Field(..., ge=0, le=250, description="Diastolic blood pressure (mm Hg)")
    SkinThickness: float = Field(..., ge=0, le=120, description="Triceps skin fold thickness (mm)")
    Insulin: float = Field(..., ge=0, le=900, description="2-Hour serum insulin (mu U/ml)")
    BMI: float = Field(..., ge=0, le=80, description="Body mass index (weight in kg/(height in m)^2)")
    DiabetesPedigreeFunction: float = Field(..., ge=0.05, le=3.0, description="Diabetes pedigree function score")
    Age: float = Field(..., ge=1, le=120, description="Age in years")

class ClinicalExplanation(BaseModel):
    risk_level: Literal["low", "moderate", "high"] = Field(
        ..., description="Clinical risk category: low, moderate, or high"
    )
    key_factors: List[str] = Field(
        ..., description="Specific contributing factors extracted strictly from deterministic flags"
    )
    recommendation: str = Field(
        ..., description="Actionable clinical guidance and evidence-based next steps"
    )
    disclaimer: str = Field(
        ..., description="Formal clinical decision support disclaimer"
    )

class PredictionResponse(BaseModel):
    prediction_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    probability: float = Field(..., description="Estimated diabetes probability (0.0 to 1.0)")
    risk_level: Literal["low", "moderate", "high"]
    flags: List[str] = Field(..., description="Deterministic abnormal feature flags")
    key_factors: List[str]
    recommendation: str
    disclaimer: str
    alert_triggered: bool = False

class BatchPredictRequest(BaseModel):
    patients: List[PatientFeatures] = Field(..., max_length=200)

class BatchPredictResponse(BaseModel):
    total_processed: int
    high_risk_count: int
    moderate_risk_count: int
    low_risk_count: int
    predictions: List[PredictionResponse]

class ModelMetricsResponse(BaseModel):
    auc_roc: float
    accuracy: float
    precision: float
    recall: float
    f1_score: float
    trained_at: str
    model_version: str
    algorithm: str

class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    version: str
