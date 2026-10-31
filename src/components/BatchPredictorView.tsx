import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  Upload, 
  Download, 
  Play, 
  AlertTriangle
} from 'lucide-react';
import { PatientFeatures } from '../types/clinical.ts';

interface BatchPredictorViewProps {
  onBatchCompleted: () => void;
  setActiveTab: (tab: string) => void;
}

interface BatchResultRow {
  patient_ref: string;
  features: PatientFeatures;
  probability: number;
  risk_level: 'low' | 'moderate' | 'high';
  flags_count: number;
  flags: Array<{
    feature: string;
    value: number;
    status: string;
    normalRange: string;
  }>;
  recommendation: string;
  alert_triggered: boolean;
}

export const BatchPredictorView: React.FC<BatchPredictorViewProps> = ({
  onBatchCompleted,
  setActiveTab
}) => {
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [results, setResults] = useState<BatchResultRow[] | null>(null);
  const [summary, setSummary] = useState<{
    total_processed: number;
    high_risk: number;
    moderate_risk: number;
    low_risk: number;
    threshold: number;
  } | null>(null);
  const [filterRisk, setFilterRisk] = useState<'ALL' | 'high' | 'moderate' | 'low'>('ALL');

  const handleLoadSampleDataset = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/dataset');
      if (res.ok) {
        const data = await res.json();
        const samplePatients = data.sampleRows.slice(0, 45).map((r: PatientFeatures & { id: number }, idx: number) => ({
          patient_ref: `PID-SMPL-${String(idx + 1).padStart(3, '0')}`,
          Pregnancies: r.Pregnancies,
          Glucose: r.Glucose,
          BloodPressure: r.BloodPressure,
          SkinThickness: r.SkinThickness,
          Insulin: r.Insulin,
          BMI: r.BMI,
          DiabetesPedigreeFunction: r.DiabetesPedigreeFunction,
          Age: r.Age
        }));

        await runBatchInference(samplePatients);
      }
    } catch (err) {
      console.error('Failed to load sample dataset:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      parseAndRunCsv(file);
    }
  };

  const parseAndRunCsv = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.trim().split('\n');
      if (lines.length <= 1) return;

      const patients = [];

      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',').map((p) => p.trim());
        if (parts.length < 8) continue;

        patients.push({
          patient_ref: `CSV-${String(i).padStart(3, '0')}`,
          Pregnancies: Number(parts[0]) || 0,
          Glucose: Number(parts[1]) || 100,
          BloodPressure: Number(parts[2]) || 70,
          SkinThickness: Number(parts[3]) || 20,
          Insulin: Number(parts[4]) || 80,
          BMI: Number(parts[5]) || 25,
          DiabetesPedigreeFunction: Number(parts[6]) || 0.4,
          Age: Number(parts[7]) || 30
        });
      }

      await runBatchInference(patients);
    };
    reader.readAsText(file);
  };

  const runBatchInference = async (patients: Array<PatientFeatures & { patient_ref: string }>) => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/batch-predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patients })
      });

      if (res.ok) {
        const data = await res.json();
        setResults(data.results);
        setSummary({
          total_processed: data.total_processed,
          ...data.summary
        });
        onBatchCompleted();
      }
    } catch (err) {
      console.error('Batch error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadTemplateCsv = () => {
    const csvContent =
      'Pregnancies,Glucose,BloodPressure,SkinThickness,Insulin,BMI,DiabetesPedigreeFunction,Age\n' +
      '6,148,72,35,0,33.6,0.627,50\n' +
      '1,85,66,29,0,26.6,0.351,31\n' +
      '8,183,64,0,0,23.3,0.672,32\n' +
      '1,89,66,23,94,28.1,0.167,21\n' +
      '0,137,40,35,168,43.1,2.288,33\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'diabetes_batch_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportResultsCsv = () => {
    if (!results || results.length === 0) return;
    const header =
      'PatientRef,Pregnancies,Glucose,BloodPressure,SkinThickness,Insulin,BMI,DiabetesPedigreeFunction,Age,Probability,RiskLevel,FlagsCount,AlertTriggered\n';
    const rows = results.map((r) =>
      [
        r.patient_ref,
        r.features.Pregnancies,
        r.features.Glucose,
        r.features.BloodPressure,
        r.features.SkinThickness,
        r.features.Insulin,
        r.features.BMI,
        r.features.DiabetesPedigreeFunction,
        r.features.Age,
        (r.probability * 100).toFixed(1) + '%',
        r.risk_level,
        r.flags_count,
        r.alert_triggered ? 'YES' : 'NO'
      ].join(',')
    );

    const blob = new Blob([header + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `diabetes_batch_results_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredResults = results
    ? filterRisk === 'ALL'
      ? results
      : results.filter((r) => r.risk_level === filterRisk)
    : [];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Banner */}
      <div className="bg-card rounded-lg p-5 border border-border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-foreground tracking-tight">Population batch screening</h1>
            <span className="text-xs px-2 py-0.5 rounded font-medium bg-accent text-accent-foreground border border-border">
              CSV pipeline
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Ingest multiple patient records to score cohort risk distributions and dispatch automated clinical alerts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={downloadTemplateCsv}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-border bg-card hover:bg-secondary text-foreground text-xs font-semibold shadow-2xs transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Download className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
            <span>Download CSV template</span>
          </button>
          
          <button
            type="button"
            onClick={handleLoadSampleDataset}
            disabled={isProcessing}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-xs transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{isProcessing ? 'Processing cohort...' : 'Load 45 patients'}</span>
          </button>
        </div>
      </div>

      {/* Upload Zone */}
      <div className="bg-card rounded-lg p-6 border border-border shadow-xs">
        <label 
          htmlFor="cohort-file-upload"
          className="border-2 border-dashed border-border hover:border-primary rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer transition-colors bg-secondary/20 hover:bg-secondary/40 focus-within:ring-2 focus-within:ring-ring"
        >
          <Upload className="w-8 h-8 text-muted-foreground mb-2" aria-hidden="true" />
          <span className="text-sm font-semibold text-foreground">
            Select patient cohort CSV file or drag here
          </span>
          <span className="text-xs text-muted-foreground mt-1">
            Required columns: Pregnancies, Glucose, BloodPressure, SkinThickness, Insulin, BMI, DiabetesPedigreeFunction, Age
          </span>
          <input
            id="cohort-file-upload"
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="sr-only"
          />
        </label>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fadeIn">
          <div className="bg-card p-5 rounded-lg border border-border shadow-xs">
            <span className="text-xs text-muted-foreground font-medium">Total processed</span>
            <div className="mt-1.5 text-2xl font-bold text-foreground tabular-nums">{summary.total_processed}</div>
            <span className="text-xs text-muted-foreground mt-0.5 block">Patient feature vectors scored</span>
          </div>

          <div className="bg-card p-5 rounded-lg border border-border shadow-xs">
            <span className="text-xs text-destructive font-medium">High risk (&ge; 70%)</span>
            <div className="mt-1.5 text-2xl font-bold text-destructive tabular-nums">{summary.high_risk}</div>
            <span className="text-xs text-muted-foreground mt-0.5 block">
              Automated alerts created
            </span>
          </div>

          <div className="bg-card p-5 rounded-lg border border-border shadow-xs">
            <span className="text-xs text-foreground font-medium">Moderate risk (40–69%)</span>
            <div className="mt-1.5 text-2xl font-bold text-foreground tabular-nums">{summary.moderate_risk}</div>
            <span className="text-xs text-muted-foreground mt-0.5 block">Recommended for lifestyle counseling</span>
          </div>

          <div className="bg-card p-5 rounded-lg border border-border shadow-xs">
            <span className="text-xs text-primary font-medium">Low risk (&lt; 40%)</span>
            <div className="mt-1.5 text-2xl font-bold text-primary tabular-nums">{summary.low_risk}</div>
            <span className="text-xs text-muted-foreground mt-0.5 block">Routine monitoring indicated</span>
          </div>
        </div>
      )}

      {/* Batch Results Table */}
      {results && results.length > 0 && (
        <div className="bg-card rounded-lg p-6 border border-border shadow-xs space-y-4 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-semibold text-foreground">Scored population cohort</h2>
              
              {/* Filter Tabs */}
              <div className="flex items-center gap-1 p-0.5 bg-secondary rounded text-xs" role="tablist" aria-label="Risk category filters">
                <button
                  type="button"
                  onClick={() => setFilterRisk('ALL')}
                  className={`px-2.5 py-1 rounded font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring ${
                    filterRisk === 'ALL' ? 'bg-card text-foreground shadow-2xs font-semibold' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  All ({results.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterRisk('high')}
                  className={`px-2.5 py-1 rounded font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring ${
                    filterRisk === 'high' ? 'bg-card text-destructive shadow-2xs font-semibold' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  High ({results.filter((r) => r.risk_level === 'high').length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterRisk('moderate')}
                  className={`px-2.5 py-1 rounded font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring ${
                    filterRisk === 'moderate' ? 'bg-card text-foreground shadow-2xs font-semibold' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Moderate ({results.filter((r) => r.risk_level === 'moderate').length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterRisk('low')}
                  className={`px-2.5 py-1 rounded font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring ${
                    filterRisk === 'low' ? 'bg-card text-primary shadow-2xs font-semibold' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Low ({results.filter((r) => r.risk_level === 'low').length})
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={exportResultsCsv}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-border bg-card hover:bg-secondary text-foreground text-xs font-semibold transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Download className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
                <span>Export results CSV</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('alerts')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs font-semibold transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
              >
                <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                <span>View alerts</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-left text-xs text-foreground">
              <caption className="sr-only">Batch screening inference results table</caption>
              <thead className="sticky top-0 bg-card border-b border-border">
                <tr className="text-muted-foreground font-medium">
                  <th scope="col" className="pb-2.5 font-semibold">Ref</th>
                  <th scope="col" className="pb-2.5 font-semibold text-right">Glucose</th>
                  <th scope="col" className="pb-2.5 font-semibold text-right">BP</th>
                  <th scope="col" className="pb-2.5 font-semibold text-right">BMI</th>
                  <th scope="col" className="pb-2.5 font-semibold text-right">Age</th>
                  <th scope="col" className="pb-2.5 font-semibold text-right">Pedigree</th>
                  <th scope="col" className="pb-2.5 font-semibold text-right">Risk proba</th>
                  <th scope="col" className="pb-2.5 font-semibold">Flags</th>
                  <th scope="col" className="pb-2.5 font-semibold">Trigger status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredResults.map((r) => {
                  const probPct = Math.round(r.probability * 100);
                  const isH = r.risk_level === 'high';
                  const isM = r.risk_level === 'moderate';

                  return (
                    <tr key={r.patient_ref} className="hover:bg-secondary/40 transition-colors">
                      <td className="py-2.5 font-mono font-semibold text-foreground">{r.patient_ref}</td>
                      <td className="py-2.5 text-right font-mono tabular-nums">
                        <span className={r.features.Glucose > 99 ? 'text-destructive font-semibold' : ''}>
                          {r.features.Glucose} mg/dL
                        </span>
                      </td>
                      <td className="py-2.5 text-right font-mono tabular-nums">{r.features.BloodPressure}</td>
                      <td className="py-2.5 text-right font-mono tabular-nums">
                        <span className={r.features.BMI > 24.9 ? 'text-foreground font-semibold' : ''}>
                          {r.features.BMI.toFixed(1)}
                        </span>
                      </td>
                      <td className="py-2.5 text-right font-mono tabular-nums">{r.features.Age}y</td>
                      <td className="py-2.5 text-right font-mono tabular-nums">{r.features.DiabetesPedigreeFunction.toFixed(2)}</td>
                      <td className="py-2.5 text-right font-mono tabular-nums">
                        <span
                          className={`font-semibold ${
                            isH ? 'text-destructive' : isM ? 'text-foreground' : 'text-primary'
                          }`}
                        >
                          {probPct}% ({r.risk_level})
                        </span>
                      </td>
                      <td className="py-2.5 text-muted-foreground">
                        {r.flags_count > 0 ? `${r.flags_count} abnormal` : 'None'}
                      </td>
                      <td className="py-2.5">
                        {r.alert_triggered ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-destructive">
                            <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                            Alert open
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Monitoring</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
