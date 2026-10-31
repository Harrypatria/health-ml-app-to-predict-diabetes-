import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, 
  CheckCircle2, 
  Save, 
  RotateCcw, 
  ShieldAlert, 
  Info,
  Stethoscope,
  Brain
} from 'lucide-react';
import { PatientFeatures, PredictionResult } from '../types/clinical.ts';

interface SinglePredictorViewProps {
  onPredictionSaved: () => void;
  setActiveTab: (tab: string) => void;
}

const DEFAULT_FEATURES: PatientFeatures = {
  Pregnancies: 3,
  Glucose: 145,
  BloodPressure: 78,
  SkinThickness: 32,
  Insulin: 160,
  BMI: 34.2,
  DiabetesPedigreeFunction: 0.65,
  Age: 48
};

export const SinglePredictorView: React.FC<SinglePredictorViewProps> = ({
  onPredictionSaved,
  setActiveTab
}) => {
  const [patientRef, setPatientRef] = useState<string>('PID-7890');
  const [features, setFeatures] = useState<PatientFeatures>(DEFAULT_FEATURES);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    debounceTimerRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortControllerRef.current = controller;
      setIsLoading(true);

      try {
        const res = await fetch('/api/predict', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            features,
            patient_ref: patientRef,
            save: false
          }),
          signal: controller.signal
        });

        if (res.ok) {
          const data: PredictionResult = await res.json();
          setPrediction(data);
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error('Inference error:', err);
        }
      } finally {
        setIsLoading(false);
      }
    }, 450);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [features, patientRef]);

  const handleFeatureChange = (name: keyof PatientFeatures, val: number) => {
    setFeatures((prev) => ({ ...prev, [name]: val }));
  };

  const handleSaveAndAlert = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          features,
          patient_ref: patientRef,
          save: true
        })
      });

      if (res.ok) {
        const data = await res.json();
        setSaveSuccessMsg(
          data.alert_triggered
            ? `Assessment saved. High-risk alert created for ${patientRef} (P = ${(data.probability * 100).toFixed(1)}%).`
            : `Assessment saved for ${patientRef} (P = ${(data.probability * 100).toFixed(1)}%).`
        );
        onPredictionSaved();
        setTimeout(() => setSaveSuccessMsg(null), 6000);
      }
    } catch (err) {
      console.error('Failed to save assessment:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const applyPreset = (type: 'high' | 'prediabetes' | 'healthy' | 'gestational') => {
    if (type === 'high') {
      setPatientRef('PID-HIGH-01');
      setFeatures({
        Pregnancies: 5,
        Glucose: 172,
        BloodPressure: 88,
        SkinThickness: 38,
        Insulin: 240,
        BMI: 38.6,
        DiabetesPedigreeFunction: 1.15,
        Age: 54
      });
    } else if (type === 'prediabetes') {
      setPatientRef('PID-PRE-02');
      setFeatures({
        Pregnancies: 2,
        Glucose: 114,
        BloodPressure: 82,
        SkinThickness: 24,
        Insulin: 105,
        BMI: 28.2,
        DiabetesPedigreeFunction: 0.52,
        Age: 51
      });
    } else if (type === 'healthy') {
      setPatientRef('PID-NORM-03');
      setFeatures({
        Pregnancies: 1,
        Glucose: 86,
        BloodPressure: 68,
        SkinThickness: 20,
        Insulin: 65,
        BMI: 22.1,
        DiabetesPedigreeFunction: 0.28,
        Age: 27
      });
    } else if (type === 'gestational') {
      setPatientRef('PID-GEST-04');
      setFeatures({
        Pregnancies: 8,
        Glucose: 139,
        BloodPressure: 74,
        SkinThickness: 30,
        Insulin: 145,
        BMI: 33.0,
        DiabetesPedigreeFunction: 0.72,
        Age: 42
      });
    }
  };

  const proba = prediction ? prediction.probability : 0.5;
  const probaPct = Math.round(proba * 100);
  const isHigh = proba >= 0.70;
  const isMod = proba >= 0.40 && proba < 0.70;

  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (proba * circumference);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Title & Presets Header */}
      <div className="bg-card rounded-lg p-5 border border-border shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-foreground tracking-tight">Single patient risk predictor</h1>
            <span className="text-xs px-2 py-0.5 rounded font-medium bg-accent text-accent-foreground border border-border">
              Live scoring
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Adjust clinical biomarkers to score instant Type-2 diabetes probability and generate evidence-based guidance.
          </p>
        </div>

        {/* Clinical Case Presets */}
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Clinical case presets">
          <span className="text-xs text-muted-foreground font-medium mr-1">Profiles:</span>
          <button
            type="button"
            onClick={() => applyPreset('high')}
            className="text-xs px-2.5 py-1 rounded bg-secondary hover:bg-secondary/80 text-foreground border border-border font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
          >
            High risk case
          </button>
          <button
            type="button"
            onClick={() => applyPreset('prediabetes')}
            className="text-xs px-2.5 py-1 rounded bg-secondary hover:bg-secondary/80 text-foreground border border-border font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
          >
            Prediabetes profile
          </button>
          <button
            type="button"
            onClick={() => applyPreset('healthy')}
            className="text-xs px-2.5 py-1 rounded bg-secondary hover:bg-secondary/80 text-foreground border border-border font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
          >
            Normal profile
          </button>
          <button
            type="button"
            onClick={() => applyPreset('gestational')}
            className="text-xs px-2.5 py-1 rounded bg-secondary hover:bg-secondary/80 text-foreground border border-border font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
          >
            Gestational profile
          </button>
        </div>
      </div>

      {/* Success Notification Alert */}
      {saveSuccessMsg && (
        <div role="status" className="p-4 rounded bg-accent/80 border border-accent text-accent-foreground flex items-center justify-between text-xs animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
            <span className="font-medium text-foreground">{saveSuccessMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('alerts')}
            className="text-primary font-semibold underline hover:text-primary/80 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring rounded"
          >
            Open alerts
          </button>
        </div>
      )}

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Input Form & Slicers (7 Cols) */}
        <div className="lg:col-span-7 bg-card rounded-lg p-6 border border-border shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-border">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Patient biomarker parameters</h2>
              <p className="text-xs text-muted-foreground">Pima Indians clinical feature space (8 inputs)</p>
            </div>
            
            <div className="flex items-center gap-2">
              <label htmlFor="patientRef" className="text-xs text-muted-foreground font-medium">
                Ref ID:
              </label>
              <input
                id="patientRef"
                type="text"
                value={patientRef}
                onChange={(e) => setPatientRef(e.target.value)}
                className="w-28 text-xs font-mono font-semibold px-2 py-1 rounded border border-border bg-card text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
              />
              <button
                type="button"
                onClick={() => {
                  setFeatures(DEFAULT_FEATURES);
                  setPatientRef('PID-7890');
                }}
                aria-label="Reset inputs to default"
                className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-secondary focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
            
            {/* 1. Glucose */}
            <div className="space-y-1.5 p-3 rounded bg-secondary/40 border border-border">
              <div className="flex justify-between items-baseline">
                <label htmlFor="input-glucose" className="text-xs font-semibold text-foreground">
                  Fasting glucose
                </label>
                <span className={`text-xs font-mono font-bold tabular-nums ${features.Glucose > 99 ? 'text-destructive' : 'text-foreground'}`}>
                  {features.Glucose} mg/dL
                </span>
              </div>
              <input
                id="input-glucose"
                type="range"
                min="40"
                max="240"
                step="1"
                value={features.Glucose}
                onChange={(e) => handleFeatureChange('Glucose', Number(e.target.value))}
                className="w-full accent-primary cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Normal: 70–99 mg/dL</span>
                <span>Prediabetes: 100–125</span>
              </div>
            </div>

            {/* 2. BMI */}
            <div className="space-y-1.5 p-3 rounded bg-secondary/40 border border-border">
              <div className="flex justify-between items-baseline">
                <label htmlFor="input-bmi" className="text-xs font-semibold text-foreground">
                  Body mass index (BMI)
                </label>
                <span className={`text-xs font-mono font-bold tabular-nums ${features.BMI > 24.9 ? 'text-destructive' : 'text-foreground'}`}>
                  {features.BMI.toFixed(1)} kg/m²
                </span>
              </div>
              <input
                id="input-bmi"
                type="range"
                min="15.0"
                max="60.0"
                step="0.1"
                value={features.BMI}
                onChange={(e) => handleFeatureChange('BMI', Number(e.target.value))}
                className="w-full accent-primary cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Normal: 18.5–24.9</span>
                <span>Obesity: &ge; 30.0</span>
              </div>
            </div>

            {/* 3. Blood Pressure */}
            <div className="space-y-1.5 p-3 rounded bg-secondary/40 border border-border">
              <div className="flex justify-between items-baseline">
                <label htmlFor="input-bp" className="text-xs font-semibold text-foreground">
                  Diastolic blood pressure
                </label>
                <span className={`text-xs font-mono font-bold tabular-nums ${features.BloodPressure > 80 ? 'text-destructive' : 'text-foreground'}`}>
                  {features.BloodPressure} mmHg
                </span>
              </div>
              <input
                id="input-bp"
                type="range"
                min="40"
                max="130"
                step="1"
                value={features.BloodPressure}
                onChange={(e) => handleFeatureChange('BloodPressure', Number(e.target.value))}
                className="w-full accent-primary cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Normal: 60–80 mmHg</span>
                <span>Stage 1: 80–89</span>
              </div>
            </div>

            {/* 4. Age */}
            <div className="space-y-1.5 p-3 rounded bg-secondary/40 border border-border">
              <div className="flex justify-between items-baseline">
                <label htmlFor="input-age" className="text-xs font-semibold text-foreground">
                  Patient age
                </label>
                <span className={`text-xs font-mono font-bold tabular-nums ${features.Age >= 45 ? 'text-destructive' : 'text-foreground'}`}>
                  {features.Age} years
                </span>
              </div>
              <input
                id="input-age"
                type="range"
                min="18"
                max="90"
                step="1"
                value={features.Age}
                onChange={(e) => handleFeatureChange('Age', Number(e.target.value))}
                className="w-full accent-primary cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Adult: 18–120 yrs</span>
                <span>ADA threshold: &ge; 45</span>
              </div>
            </div>

            {/* 5. Diabetes Pedigree Function */}
            <div className="space-y-1.5 p-3 rounded bg-secondary/40 border border-border">
              <div className="flex justify-between items-baseline">
                <label htmlFor="input-pedigree" className="text-xs font-semibold text-foreground">
                  Diabetes pedigree function
                </label>
                <span className={`text-xs font-mono font-bold tabular-nums ${features.DiabetesPedigreeFunction >= 0.8 ? 'text-destructive' : 'text-foreground'}`}>
                  {features.DiabetesPedigreeFunction.toFixed(3)}
                </span>
              </div>
              <input
                id="input-pedigree"
                type="range"
                min="0.08"
                max="2.50"
                step="0.01"
                value={features.DiabetesPedigreeFunction}
                onChange={(e) => handleFeatureChange('DiabetesPedigreeFunction', Number(e.target.value))}
                className="w-full accent-primary cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Cohort mean: ~0.47</span>
                <span>High familial: &gt; 0.80</span>
              </div>
            </div>

            {/* 6. Pregnancies */}
            <div className="space-y-1.5 p-3 rounded bg-secondary/40 border border-border">
              <div className="flex justify-between items-baseline">
                <label htmlFor="input-preg" className="text-xs font-semibold text-foreground">
                  Pregnancies count
                </label>
                <span className="text-xs font-mono font-bold tabular-nums text-foreground">
                  {features.Pregnancies}
                </span>
              </div>
              <input
                id="input-preg"
                type="range"
                min="0"
                max="17"
                step="1"
                value={features.Pregnancies}
                onChange={(e) => handleFeatureChange('Pregnancies', Number(e.target.value))}
                className="w-full accent-primary cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0 = Nulliparous</span>
                <span>Gestational risk factor</span>
              </div>
            </div>

            {/* 7. Insulin */}
            <div className="space-y-1.5 p-3 rounded bg-secondary/40 border border-border">
              <div className="flex justify-between items-baseline">
                <label htmlFor="input-insulin" className="text-xs font-semibold text-foreground">
                  Serum insulin (2-hour)
                </label>
                <span className={`text-xs font-mono font-bold tabular-nums ${features.Insulin > 166 ? 'text-destructive' : 'text-foreground'}`}>
                  {features.Insulin === 0 ? '0 (Imputed median)' : `${features.Insulin} µU/mL`}
                </span>
              </div>
              <input
                id="input-insulin"
                type="range"
                min="0"
                max="600"
                step="5"
                value={features.Insulin}
                onChange={(e) => handleFeatureChange('Insulin', Number(e.target.value))}
                className="w-full accent-primary cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Normal: 16–166 µU/mL</span>
                <span>0 = Treated as missing</span>
              </div>
            </div>

            {/* 8. Skin Thickness */}
            <div className="space-y-1.5 p-3 rounded bg-secondary/40 border border-border">
              <div className="flex justify-between items-baseline">
                <label htmlFor="input-skin" className="text-xs font-semibold text-foreground">
                  Triceps skin fold
                </label>
                <span className="text-xs font-mono font-bold tabular-nums text-foreground">
                  {features.SkinThickness === 0 ? '0 (Imputed median)' : `${features.SkinThickness} mm`}
                </span>
              </div>
              <input
                id="input-skin"
                type="range"
                min="0"
                max="80"
                step="1"
                value={features.SkinThickness}
                onChange={(e) => handleFeatureChange('SkinThickness', Number(e.target.value))}
                className="w-full accent-primary cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Median: ~29 mm</span>
                <span>0 = Treated as missing</span>
              </div>
            </div>

          </div>

          {/* Action Row */}
          <div className="pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">
              Zeros in Glucose, BP, Skin, Insulin, BMI are median-imputed.
            </span>

            <button
              type="button"
              onClick={handleSaveAndAlert}
              disabled={isSaving}
              className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded text-xs font-semibold text-primary-foreground shadow-xs transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 ${
                isHigh
                  ? 'bg-destructive hover:bg-destructive/90'
                  : 'bg-primary hover:bg-primary/90'
              }`}
            >
              <Save className="w-4 h-4" aria-hidden="true" />
              <span>{isSaving ? 'Saving record...' : 'Save prediction and dispatch alert'}</span>
            </button>
          </div>

        </div>

        {/* RIGHT COLUMN: Live Gauge, Deterministic Flags & Agentic Cards (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Live Calibrated Gauge Card */}
          <div className="bg-card rounded-lg p-6 border border-border shadow-xs relative overflow-hidden">
            {isLoading && (
              <div className="absolute top-3 right-3 text-xs text-primary font-medium">
                Scoring...
              </div>
            )}

            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-4 h-4 text-primary" aria-hidden="true" />
              <h2 className="text-sm font-semibold text-foreground">Calibrated risk probability</h2>
            </div>

            {/* Circular Gauge Graphic */}
            <div className="flex flex-col items-center justify-center py-4">
              <div 
                className="relative w-40 h-40 flex items-center justify-center"
                role="img"
                aria-label={`Estimated diabetes risk probability: ${probaPct} percent`}
              >
                <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160" aria-hidden="true">
                  <circle
                    cx="80"
                    cy="80"
                    r={radius}
                    stroke="currentColor"
                    strokeWidth="12"
                    fill="transparent"
                    className="text-secondary"
                  />
                  <circle
                    cx="80"
                    cy="80"
                    r={radius}
                    stroke="currentColor"
                    strokeWidth="12"
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    className={`transition-all duration-300 ${
                      isHigh ? 'text-destructive' : isMod ? 'text-foreground' : 'text-primary'
                    }`}
                  />
                </svg>

                <div className="absolute text-center">
                  <span className={`text-4xl font-extrabold tracking-tight tabular-nums ${
                    isHigh ? 'text-destructive' : isMod ? 'text-foreground' : 'text-primary'
                  }`}>
                    {probaPct}%
                  </span>
                  <span className="block text-xs font-medium text-muted-foreground mt-0.5">
                    Diabetes risk
                  </span>
                </div>
              </div>

              {/* Risk Badge */}
              <div className="mt-3">
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded tracking-wider uppercase ${
                    isHigh
                      ? 'bg-destructive/10 text-destructive border border-destructive/20'
                      : isMod
                      ? 'bg-secondary text-foreground border border-border'
                      : 'bg-primary/10 text-primary border border-primary/20'
                  }`}
                >
                  {prediction ? prediction.risk_level : 'CALCULATING'} RISK
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
              <span>Threshold cutoff: &ge; 70%</span>
              <span className={`font-medium ${isHigh ? 'text-destructive font-bold' : 'text-foreground'}`}>
                {isHigh ? 'Trigger active (high risk)' : 'Routine monitoring'}
              </span>
            </div>
          </div>

          {/* Deterministic Abnormal Flags Card */}
          <div className="bg-card rounded-lg p-5 border border-border shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-foreground" aria-hidden="true" />
                <h2 className="text-sm font-semibold text-foreground">Deterministic feature flags</h2>
              </div>
              <span className="text-xs text-muted-foreground font-mono">
                {prediction?.flags ? `${prediction.flags.length} active` : '0 active'}
              </span>
            </div>

            {!prediction || prediction.flags.length === 0 ? (
              <div className="py-4 text-center bg-secondary/30 rounded border border-border">
                <p className="text-xs text-muted-foreground">
                  All physiological biomarkers within clinical reference ranges.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {prediction.flags.map((flag) => (
                  <div
                    key={flag.feature}
                    className={`p-2.5 rounded border text-xs ${
                      flag.severity === 'critical'
                        ? 'bg-destructive/10 border-destructive/20 text-foreground'
                        : 'bg-secondary/60 border-border text-foreground'
                    }`}
                  >
                    <div className="flex items-center justify-between font-semibold">
                      <span>{flag.feature} ({flag.status})</span>
                      <span className="font-mono tabular-nums">{flag.value} {flag.unit}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      {flag.clinicalInterpretation}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Agentic Clinical Explanation (Chapter 10 Core) */}
          <div className="bg-card rounded-lg p-5 border border-border shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-primary" aria-hidden="true" />
                <h2 className="text-sm font-semibold text-foreground">Agentic clinical explanation</h2>
              </div>
              {prediction?.source === 'gemini-3.8-flash' ? (
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-accent text-accent-foreground border border-border">
                  Gemini 3.8 Flash
                </span>
              ) : (
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-secondary text-foreground border border-border">
                  Clinical protocol
                </span>
              )}
            </div>

            {/* Key Factors */}
            <div>
              <span className="text-xs font-semibold text-foreground block mb-1.5">
                Key contributing factors:
              </span>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                {prediction?.key_factors?.map((f) => (
                  <li key={f} className="flex items-start gap-1.5">
                    <span className="text-primary font-bold" aria-hidden="true">·</span>
                    <span className="text-foreground">{f}</span>
                  </li>
                )) || (
                  <li className="text-muted-foreground">Evaluating factor attribution...</li>
                )}
              </ul>
            </div>

            {/* Recommendation */}
            <div className="p-3 rounded bg-accent/60 border border-accent text-xs">
              <span className="font-semibold text-accent-foreground block mb-1">
                Clinical recommendation:
              </span>
              <p className="text-foreground leading-relaxed">
                {prediction?.recommendation || 'Evaluating clinical guidance...'}
              </p>
            </div>

            {/* Disclaimer */}
            <div className="pt-2 border-t border-border flex items-start gap-2 text-xs text-muted-foreground leading-normal">
              <Info className="w-3.5 h-3.5 shrink-0 text-muted-foreground mt-0.5" aria-hidden="true" />
              <span>{prediction?.disclaimer || 'Clinical Decision Support Notice: Not a definitive diagnosis.'}</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
