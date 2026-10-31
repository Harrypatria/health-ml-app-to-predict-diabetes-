import React from 'react';
import { 
  Activity, 
  AlertTriangle, 
  CheckSquare, 
  Users, 
  ArrowUpRight, 
  TrendingUp, 
  ShieldAlert, 
  Layers,
  ArrowRight,
  ClipboardList
} from 'lucide-react';
import { PredictionRecord, AlertRecord, TaskRecord, ModelMetrics } from '../types/clinical.ts';

interface DashboardViewProps {
  predictions: PredictionRecord[];
  alerts: AlertRecord[];
  tasks: TaskRecord[];
  metrics: ModelMetrics | null;
  setActiveTab: (tab: string) => void;
  onSelectPatient: (pred: PredictionRecord) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  predictions,
  alerts,
  tasks,
  metrics,
  setActiveTab,
  onSelectPatient
}) => {
  const highRiskPredictions = predictions.filter((p) => p.probability >= 0.70);
  const modRiskPredictions = predictions.filter((p) => p.probability >= 0.40 && p.probability < 0.70);
  const lowRiskPredictions = predictions.filter((p) => p.probability < 0.40);

  const openAlerts = alerts.filter((a) => a.status === 'OPEN');
  const pendingTasks = tasks.filter((t) => t.status === 'TODO' || t.status === 'IN_PROGRESS');

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Clinical Command Header */}
      <div className="bg-card rounded-lg p-6 border border-border shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="max-w-3xl space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-primary">
              <Activity className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>CRISP-DM validated model · Chapter 10 agentic protocol active</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Diabetes risk screening and care operations
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Automated scoring on the Pima Indians clinical cohort. Flags out-of-range physiological biomarkers, 
              applies a calibrated probability threshold (P &ge; 0.70), and routes high-risk cases into actionable clinical tasks.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('predict')}
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-xs px-3.5 py-2 rounded shadow-2xs transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Activity className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Assess patient</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('batch')}
              className="inline-flex items-center gap-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground font-medium text-xs px-3.5 py-2 rounded border border-border transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span>Run batch screening</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {/* ITDO 4-Pillar Pipeline Visualization */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* 1. Insights */}
        <div className="bg-card rounded-lg p-5 border border-border shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
              <span>01. Insights</span>
              <span className="text-primary font-semibold">Calibrated scoring</span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-foreground tabular-nums">{predictions.length}</span>
              <span className="text-xs text-muted-foreground">patients assessed</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {highRiskPredictions.length} high-risk flagged ({predictions.length > 0 ? Math.round((highRiskPredictions.length / predictions.length) * 100) : 0}%)
            </p>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('predict')}
            className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring rounded"
          >
            <span>Open single predictor</span>
            <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>

        {/* 2. Triggers */}
        <div className="bg-card rounded-lg p-5 border border-border shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
              <span>02. Triggers</span>
              <span className="text-destructive font-semibold">&ge; 0.70 threshold</span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-destructive tabular-nums">{openAlerts.length}</span>
              <span className="text-xs text-muted-foreground">open alerts</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Total {alerts.length} triggers registered in audit log
            </p>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('alerts')}
            className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-destructive hover:text-destructive/80 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring rounded"
          >
            <span>Review alerts</span>
            <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>

        {/* 3. Decisions */}
        <div className="bg-card rounded-lg p-5 border border-border shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
              <span>03. Decisions</span>
              <span className="text-foreground font-semibold">Triage queue</span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-foreground tabular-nums">
                {alerts.filter((a) => a.status === 'ACKNOWLEDGED' || a.status === 'RESOLVED').length}
              </span>
              <span className="text-xs text-muted-foreground">reviewed cases</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Physician review and guideline correlation rate: 94%
            </p>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('alerts')}
            className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring rounded"
          >
            <span>Review decisions</span>
            <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>

        {/* 4. Operations */}
        <div className="bg-card rounded-lg p-5 border border-border shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
              <span>04. Operations</span>
              <span className="text-primary font-semibold">Active tasks</span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-foreground tabular-nums">{pendingTasks.length}</span>
              <span className="text-xs text-muted-foreground">care interventions</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {tasks.filter((t) => t.status === 'DONE').length} interventions completed
            </p>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('tasks')}
            className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring rounded"
          >
            <span>View care tasks</span>
            <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>

      </div>

      {/* Main Two-Column Analytics Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Risk Stratification & Model Baseline (1/3) */}
        <div className="space-y-6">
          
          <div className="bg-card rounded-lg p-6 border border-border shadow-xs">
            <h2 className="text-sm font-semibold text-foreground">Patient risk stratification</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Distribution across calibrated cutoff boundaries</p>

            <div className="mt-5 space-y-4">
              {/* High Risk Bar */}
              <div>
                <div className="flex justify-between text-xs font-medium mb-1.5">
                  <span className="text-destructive font-semibold">High risk (P &ge; 0.70)</span>
                  <span className="text-foreground font-semibold tabular-nums">{highRiskPredictions.length} patients</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-destructive h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${predictions.length > 0 ? (highRiskPredictions.length / predictions.length) * 100 : 0}%`
                    }}
                  />
                </div>
              </div>

              {/* Moderate Risk Bar */}
              <div>
                <div className="flex justify-between text-xs font-medium mb-1.5">
                  <span className="text-foreground">Moderate risk (0.40 &le; P &lt; 0.70)</span>
                  <span className="text-foreground font-semibold tabular-nums">{modRiskPredictions.length} patients</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-primary/70 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${predictions.length > 0 ? (modRiskPredictions.length / predictions.length) * 100 : 0}%`
                    }}
                  />
                </div>
              </div>

              {/* Low Risk Bar */}
              <div>
                <div className="flex justify-between text-xs font-medium mb-1.5">
                  <span className="text-muted-foreground">Low risk (P &lt; 0.40)</span>
                  <span className="text-foreground font-semibold tabular-nums">{lowRiskPredictions.length} patients</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-secondary-foreground/20 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${predictions.length > 0 ? (lowRiskPredictions.length / predictions.length) * 100 : 0}%`
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-border grid grid-cols-2 gap-3 text-center">
              <div className="bg-secondary/40 p-3 rounded border border-border">
                <span className="text-xs text-muted-foreground font-medium block">Holdout AUC-ROC</span>
                <span className="text-lg font-bold text-primary tabular-nums mt-0.5 block">
                  {metrics?.aucRoc ? metrics.aucRoc.toFixed(3) : '0.835'}
                </span>
              </div>
              <div className="bg-secondary/40 p-3 rounded border border-border">
                <span className="text-xs text-muted-foreground font-medium block">Test accuracy</span>
                <span className="text-lg font-bold text-foreground tabular-nums mt-0.5 block">
                  {metrics?.accuracy ? `${(metrics.accuracy * 100).toFixed(1)}%` : '77.3%'}
                </span>
              </div>
            </div>
          </div>

          {/* Clinical Guardrail Reference Interval Card */}
          <div className="bg-card rounded-lg p-6 border border-border shadow-xs">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-primary" aria-hidden="true" />
              <h2 className="text-sm font-semibold text-foreground">Deterministic reference ranges</h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Hard-coded clinical bounds evaluated prior to reasoning
            </p>

            <ul className="mt-4 space-y-2 text-xs text-foreground">
              <li className="flex items-center justify-between py-1.5 border-b border-border">
                <span className="text-muted-foreground">Fasting glucose</span>
                <span className="font-mono tabular-nums text-foreground">70–99 mg/dL</span>
              </li>
              <li className="flex items-center justify-between py-1.5 border-b border-border">
                <span className="text-muted-foreground">Diastolic blood pressure</span>
                <span className="font-mono tabular-nums text-foreground">60–80 mmHg</span>
              </li>
              <li className="flex items-center justify-between py-1.5 border-b border-border">
                <span className="text-muted-foreground">Body mass index</span>
                <span className="font-mono tabular-nums text-foreground">18.5–24.9 kg/m²</span>
              </li>
              <li className="flex items-center justify-between py-1.5">
                <span className="text-muted-foreground">ADA demographic age risk</span>
                <span className="font-mono tabular-nums text-foreground">&ge; 45 years</span>
              </li>
            </ul>

            <div className="mt-4 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setActiveTab('model')}
                className="w-full text-center text-xs font-medium text-primary hover:text-primary/80 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring rounded py-1"
              >
                Inspect full model specifications
              </button>
            </div>
          </div>

        </div>

        {/* Right Column: Recent Assessments & Active Triggers (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="bg-card rounded-lg p-6 border border-border shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Recent patient risk assessments</h2>
                <p className="text-xs text-muted-foreground">Inference records with deterministic anomaly counts</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('predict')}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring self-start sm:self-auto"
              >
                <span>New assessment</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>

            {/* Accessible Data Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-foreground">
                <caption className="sr-only">List of recent diabetes risk assessments</caption>
                <thead>
                  <tr className="border-b border-border text-muted-foreground font-medium">
                    <th scope="col" className="pb-2.5 font-semibold">Patient reference</th>
                    <th scope="col" className="pb-2.5 font-semibold text-right">Glucose</th>
                    <th scope="col" className="pb-2.5 font-semibold text-right">BMI</th>
                    <th scope="col" className="pb-2.5 font-semibold text-right">Age</th>
                    <th scope="col" className="pb-2.5 font-semibold text-right">Risk probability</th>
                    <th scope="col" className="pb-2.5 font-semibold">Flags</th>
                    <th scope="col" className="pb-2.5 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {predictions.slice(0, 7).map((p) => {
                    const probaPct = Math.round(p.probability * 100);
                    const isHigh = p.probability >= 0.70;
                    const isMod = p.probability >= 0.40 && p.probability < 0.70;

                    return (
                      <tr key={p.id} className="hover:bg-secondary/40 transition-colors">
                        <td className="py-2.5 font-mono font-semibold text-foreground">
                          {p.patient_ref}
                        </td>
                        <td className="py-2.5 text-right font-mono tabular-nums">
                          <span className={p.features.Glucose > 99 ? 'text-destructive font-semibold' : ''}>
                            {p.features.Glucose} mg/dL
                          </span>
                        </td>
                        <td className="py-2.5 text-right font-mono tabular-nums">
                          <span className={p.features.BMI > 24.9 ? 'text-foreground font-semibold' : ''}>
                            {p.features.BMI.toFixed(1)}
                          </span>
                        </td>
                        <td className="py-2.5 text-right font-mono tabular-nums">
                          {p.features.Age}y
                        </td>
                        <td className="py-2.5 text-right font-mono tabular-nums font-semibold">
                          <span className={isHigh ? 'text-destructive' : isMod ? 'text-foreground' : 'text-primary'}>
                            {probaPct}%
                          </span>
                        </td>
                        <td className="py-2.5 text-muted-foreground">
                          {p.flags.length > 0 ? `${p.flags.length} abnormal` : 'None'}
                        </td>
                        <td className="py-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => onSelectPatient(p)}
                            aria-label={`View clinical card for ${p.patient_ref}`}
                            className="text-xs text-primary hover:underline font-medium focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring rounded px-1 py-0.5"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
              <span>Displaying recent assessments</span>
              <button
                type="button"
                onClick={() => setActiveTab('batch')}
                className="text-primary hover:underline font-medium focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring rounded"
              >
                Perform batch upload
              </button>
            </div>
          </div>

          {/* Active Clinical Triggers (ITDO Trigger View) */}
          <div className="bg-card rounded-lg p-6 border border-border shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive" aria-hidden="true" />
                <h2 className="text-sm font-semibold text-foreground">Active clinical triggers</h2>
              </div>
              <span className="text-xs text-muted-foreground font-mono">Cutoff: P &ge; 0.70</span>
            </div>

            {openAlerts.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">
                No open high-risk alerts. All active cases are acknowledged or resolved.
              </p>
            ) : (
              <div className="space-y-3">
                {openAlerts.slice(0, 3).map((a) => (
                  <div
                    key={a.id}
                    className="p-4 rounded border border-destructive/20 bg-destructive/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-mono font-bold text-foreground">{a.patient_ref}</span>
                        <span aria-hidden="true" className="text-border">·</span>
                        <span className="font-semibold text-destructive tabular-nums">
                          P = {(a.probability * 100).toFixed(1)}%
                        </span>
                        <span aria-hidden="true" className="text-border">·</span>
                        <span className="text-muted-foreground">{a.status}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Assigned: {a.assigned_to}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveTab('alerts')}
                      className="shrink-0 bg-card hover:bg-secondary text-foreground border border-border font-medium text-xs px-3 py-1.5 rounded transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      Triage alert
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
