export interface PatientFeatures {
  Pregnancies: number;
  Glucose: number;
  BloodPressure: number;
  SkinThickness: number;
  Insulin: number;
  BMI: number;
  DiabetesPedigreeFunction: number;
  Age: number;
}

export interface AbnormalFlag {
  feature: string;
  value: number;
  normalRange: string;
  unit: string;
  status: 'HIGH' | 'LOW';
  severity: 'mild' | 'moderate' | 'critical';
  clinicalInterpretation: string;
}

export interface PredictionResult {
  probability: number;
  risk_level: 'low' | 'moderate' | 'high';
  flags: AbnormalFlag[];
  key_factors: string[];
  recommendation: string;
  disclaimer: string;
  source?: 'gemini-3.8-flash' | 'clinical-heuristics-engine';
  imputed_features?: number[];
  prediction_id?: string;
  patient_id?: string;
  patient_ref?: string;
  alert_id?: string;
  alert_triggered?: boolean;
}

export interface PatientRecord {
  id: string;
  patient_ref: string;
  age: number;
  gender: string;
  created_at: string;
  features: PatientFeatures;
}

export interface PredictionRecord {
  id: string;
  patient_id: string;
  patient_ref: string;
  probability: number;
  risk_level: 'low' | 'moderate' | 'high';
  flags: AbnormalFlag[];
  key_factors: string[];
  recommendation: string;
  disclaimer: string;
  model_version: string;
  features: PatientFeatures;
  created_at: string;
}

export interface AlertRecord {
  id: string;
  prediction_id: string;
  patient_id: string;
  patient_ref: string;
  threshold: number;
  probability: number;
  risk_level: 'low' | 'moderate' | 'high';
  status: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED';
  assigned_to: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface TaskRecord {
  id: string;
  alert_id?: string;
  prediction_id?: string;
  patient_id: string;
  patient_ref: string;
  title: string;
  description: string;
  intervention: 'DIAGNOSTIC_LAB' | 'SPECIALIST_REFERRAL' | 'LIFESTYLE_INTERVENTION' | 'MEDICATION_REVIEW' | 'CARE_COORDINATION';
  status: 'TODO' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';
  priority: 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';
  due_date: string;
  assigned_to: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ModelMetrics {
  accuracy: number;
  aucRoc: number;
  precision: number;
  recall: number;
  f1Score: number;
  confusionMatrix: {
    truePositive: number;
    falsePositive: number;
    trueNegative: number;
    falseNegative: number;
  };
  rocCurve: Array<{ fpr: number; tpr: number; threshold: number }>;
  prCurve: Array<{ recall: number; precision: number; threshold: number }>;
  featureImportances: Array<{ feature: string; importance: number; relativePct: number }>;
  datasetStats: {
    totalPatients: number;
    diabeticCount: number;
    nonDiabeticCount: number;
    diabeticPct: number;
    trainCount: number;
    testCount: number;
    zeroCounts: Record<string, number>;
  };
  modelVersion: string;
  trainedAt: string;
  algorithm: string;
}

export interface AppSettings {
  alert_threshold: number;
  default_disclaimer: string;
  auto_create_alerts: boolean;
  selected_model: string;
}
