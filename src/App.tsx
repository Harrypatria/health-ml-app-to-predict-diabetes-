import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar.tsx';
import { DashboardView } from './components/DashboardView.tsx';
import { SinglePredictorView } from './components/SinglePredictorView.tsx';
import { BatchPredictorView } from './components/BatchPredictorView.tsx';
import { AlertsView } from './components/AlertsView.tsx';
import { TasksKanbanView } from './components/TasksKanbanView.tsx';
import { ModelInsightsView } from './components/ModelInsightsView.tsx';
import { SettingsView } from './components/SettingsView.tsx';
import { 
  PredictionRecord, 
  AlertRecord, 
  TaskRecord, 
  ModelMetrics 
} from './types/clinical.ts';
import { Stethoscope, X } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [predictions, setPredictions] = useState<PredictionRecord[]>([]);
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [metrics, setMetrics] = useState<ModelMetrics | null>(null);
  const [selectedPatientForInspect, setSelectedPatientForInspect] = useState<PredictionRecord | null>(null);

  const loadData = async () => {
    try {
      const predRes = await fetch('/api/predictions');
      if (predRes.ok) setPredictions(await predRes.json());

      const altRes = await fetch('/api/alerts');
      if (altRes.ok) setAlerts(await altRes.json());

      const tskRes = await fetch('/api/tasks');
      if (tskRes.ok) setTasks(await tskRes.json());

      const metRes = await fetch('/api/model-metrics');
      if (metRes.ok) setMetrics(await metRes.json());
    } catch (err) {
      console.error('Failed to load application data:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAlertsCount = alerts.filter((a) => a.status === 'OPEN').length;
  const pendingTasksCount = tasks.filter((t) => t.status === 'TODO' || t.status === 'IN_PROGRESS').length;

  const handleSelectPatient = (p: PredictionRecord) => {
    setSelectedPatientForInspect(p);
  };

  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col font-sans antialiased selection:bg-accent selection:text-accent-foreground">
      {/* Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        openAlertsCount={openAlertsCount}
        pendingTasksCount={pendingTasksCount}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && (
          <DashboardView
            predictions={predictions}
            alerts={alerts}
            tasks={tasks}
            metrics={metrics}
            setActiveTab={setActiveTab}
            onSelectPatient={handleSelectPatient}
          />
        )}

        {activeTab === 'predict' && (
          <SinglePredictorView
            onPredictionSaved={loadData}
            setActiveTab={setActiveTab}
          />
        )}

        {activeTab === 'batch' && (
          <BatchPredictorView
            onBatchCompleted={loadData}
            setActiveTab={setActiveTab}
          />
        )}

        {activeTab === 'alerts' && (
          <AlertsView
            alerts={alerts}
            onAlertUpdated={loadData}
            setActiveTab={setActiveTab}
          />
        )}

        {activeTab === 'tasks' && (
          <TasksKanbanView
            tasks={tasks}
            onTaskUpdated={loadData}
          />
        )}

        {activeTab === 'model' && (
          <ModelInsightsView metrics={metrics} />
        )}

        {activeTab === 'settings' && (
          <SettingsView onSettingsUpdated={loadData} />
        )}
      </main>

      {/* Patient Inspect Modal */}
      {selectedPatientForInspect && (
        <div 
          role="dialog" 
          aria-modal="true" 
          aria-labelledby="patient-card-title"
          className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-card text-card-foreground rounded-lg max-w-lg w-full p-6 shadow-lg border border-border animate-fadeIn space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-primary shrink-0" aria-hidden="true" />
                <h3 id="patient-card-title" className="text-base font-semibold tracking-tight text-foreground">
                  Patient record: {selectedPatientForInspect.patient_ref}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPatientForInspect(null)}
                aria-label="Close dialog"
                className="p-1 rounded text-muted-foreground hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded bg-secondary/50 border border-border">
                <span className="text-muted-foreground block text-xs">Risk probability</span>
                <span className="text-lg font-semibold tabular-nums text-foreground">
                  {(selectedPatientForInspect.probability * 100).toFixed(1)}%
                </span>
                <span className="block text-xs uppercase font-medium text-primary mt-0.5">
                  {selectedPatientForInspect.risk_level} risk
                </span>
              </div>
              <div className="p-3 rounded bg-secondary/50 border border-border">
                <span className="text-muted-foreground block text-xs">Fasting glucose</span>
                <span className="text-lg font-semibold tabular-nums text-foreground">
                  {selectedPatientForInspect.features.Glucose} mg/dL
                </span>
                <span className="block text-xs text-muted-foreground mt-0.5">Reference: 70–99</span>
              </div>
              <div className="p-3 rounded bg-secondary/50 border border-border">
                <span className="text-muted-foreground block text-xs">Body mass index</span>
                <span className="text-base font-semibold tabular-nums text-foreground">
                  {selectedPatientForInspect.features.BMI.toFixed(1)} kg/m²
                </span>
              </div>
              <div className="p-3 rounded bg-secondary/50 border border-border">
                <span className="text-muted-foreground block text-xs">Diastolic blood pressure</span>
                <span className="text-base font-semibold tabular-nums text-foreground">
                  {selectedPatientForInspect.features.BloodPressure} mmHg
                </span>
              </div>
            </div>

            <div>
              <span className="text-xs font-semibold text-foreground block mb-1">
                Deterministic abnormal flags:
              </span>
              <div className="space-y-1.5">
                {selectedPatientForInspect.flags.length === 0 ? (
                  <p className="text-xs text-muted-foreground">All physiological values within normal ranges.</p>
                ) : (
                  selectedPatientForInspect.flags.map((f) => (
                    <div key={f.feature} className="text-xs p-2 rounded bg-destructive/10 border border-destructive/20 text-foreground">
                      <span className="font-semibold">{f.feature} ({f.status}):</span> {f.clinicalInterpretation}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="p-3 rounded bg-accent/60 border border-accent text-xs">
              <span className="font-semibold text-accent-foreground block mb-0.5">Clinical recommendation:</span>
              <p className="text-foreground leading-relaxed">{selectedPatientForInspect.recommendation}</p>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedPatientForInspect(null)}
                className="px-3 py-1.5 text-xs font-medium rounded border border-border bg-card text-foreground hover:bg-secondary focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedPatientForInspect(null);
                  setActiveTab('predict');
                }}
                className="px-3.5 py-1.5 text-xs font-medium rounded bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
              >
                Open in predictor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-auto border-t border-border bg-card py-5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground">AI Health Copilot Pro</span>
            <span aria-hidden="true">·</span>
            <span>v3.1.0</span>
            <span aria-hidden="true">·</span>
            <span>Dr. Harry Patria, Chief Data &amp; AI Officer</span>
          </div>

          <div className="flex items-center gap-3">
            <span>CRISP-DM cycle</span>
            <span aria-hidden="true">·</span>
            <span>ITDO care protocol</span>
            <span aria-hidden="true">·</span>
            <span>Pima Indians cohort</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
