import React, { useState, useEffect } from 'react';
import { 
  Sliders, 
  Shield, 
  Database, 
  Save, 
  CheckCircle2, 
  Copy, 
  Check
} from 'lucide-react';
import { AppSettings } from '../types/clinical.ts';

interface SettingsViewProps {
  onSettingsUpdated: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onSettingsUpdated }) => {
  const [threshold, setThreshold] = useState<number>(0.70);
  const [disclaimer, setDisclaimer] = useState<string>(
    'CLINICAL DECISION SUPPORT NOTICE: This automated risk prediction is for licensed healthcare professional use only. Not a diagnostic confirmation.'
  );
  const [autoAlerts, setAutoAlerts] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [copiedSql, setCopiedSql] = useState<boolean>(false);

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data: AppSettings) => {
        if (data.alert_threshold) setThreshold(data.alert_threshold);
        if (data.default_disclaimer) setDisclaimer(data.default_disclaimer);
        if (data.auto_create_alerts !== undefined) setAutoAlerts(data.auto_create_alerts);
      })
      .catch((err) => console.error('Failed to load settings:', err));
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alert_threshold: threshold,
          default_disclaimer: disclaimer,
          auto_create_alerts: autoAlerts
        })
      });

      if (res.ok) {
        setSaveSuccess(true);
        onSettingsUpdated();
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const sqlMigrationCode = `-- Supabase / PostgreSQL Schema Migration
-- Migration: supabase/migrations/001_init.sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_ref TEXT NOT NULL UNIQUE,
    age INT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.predictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    probability NUMERIC(5,4) NOT NULL,
    risk_level TEXT NOT NULL,
    flags JSONB NOT NULL DEFAULT '[]'::jsonb,
    key_factors JSONB NOT NULL DEFAULT '[]'::jsonb,
    recommendation TEXT NOT NULL,
    disclaimer TEXT NOT NULL,
    model_version TEXT NOT NULL DEFAULT '3.1.0',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prediction_id UUID REFERENCES public.predictions(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    threshold NUMERIC(5,4) NOT NULL DEFAULT 0.7000,
    status TEXT NOT NULL DEFAULT 'OPEN',
    assigned_to UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_id UUID REFERENCES public.alerts(id) ON DELETE SET NULL,
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    intervention TEXT,
    status TEXT NOT NULL DEFAULT 'TODO',
    due_date DATE,
    assigned_to UUID,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);`;

  const copySqlToClipboard = () => {
    navigator.clipboard.writeText(sqlMigrationCode);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  return (
    <div className="space-y-6 animate-fadeIn max-w-5xl mx-auto">
      {/* Top Banner */}
      <div className="bg-card rounded-lg p-5 border border-border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-foreground tracking-tight">Clinical governance and settings</h1>
            <span className="text-xs px-2 py-0.5 rounded font-medium bg-accent text-accent-foreground border border-border">
              Configuration
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure clinical risk threshold boundaries, disclaimer notices, and inspect Supabase persistence architecture.
          </p>
        </div>
      </div>

      {saveSuccess && (
        <div role="status" className="p-4 rounded bg-accent/80 border border-accent text-accent-foreground flex items-center gap-2 text-xs animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-primary" aria-hidden="true" />
          <span className="font-semibold text-foreground">Configuration updated successfully.</span>
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSaveSettings} className="space-y-6">
        
        {/* Risk Threshold Card */}
        <div className="bg-card rounded-lg p-6 border border-border shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border">
            <Sliders className="w-4 h-4 text-primary" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-foreground">
              Clinical alert threshold (ITDO trigger)
            </h2>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs">
              <label htmlFor="settings-threshold-slider" className="font-medium text-foreground">
                Probability cutoff for automated alert creation:
              </label>
              <span className="font-mono font-bold text-sm text-destructive tabular-nums">
                {(threshold * 100).toFixed(0)}% (P &ge; {threshold.toFixed(2)})
              </span>
            </div>

            <input
              id="settings-threshold-slider"
              type="range"
              min="0.50"
              max="0.90"
              step="0.05"
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="w-full accent-primary cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
            />

            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0.50 (Early warning)</span>
              <span className="font-semibold text-foreground">0.70 (Recommended clinical standard)</span>
              <span>0.90 (High specificity)</span>
            </div>

            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              Patients evaluated above this probability automatically populate the <strong>Clinical Alerts Inbox</strong> and generate an operational care task.
            </p>

            <div className="pt-2 flex items-center gap-2">
              <input
                type="checkbox"
                id="autoAlerts"
                checked={autoAlerts}
                onChange={(e) => setAutoAlerts(e.target.checked)}
                className="rounded border-border text-primary focus-visible:ring-2 focus-visible:ring-ring"
              />
              <label htmlFor="autoAlerts" className="text-xs text-foreground font-medium">
                Automatically generate care task on alert trigger
              </label>
            </div>
          </div>
        </div>

        {/* Disclaimer Editor Card */}
        <div className="bg-card rounded-lg p-6 border border-border shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border">
            <Shield className="w-4 h-4 text-primary" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-foreground">
              Clinical decision support disclaimer
            </h2>
          </div>

          <div>
            <label htmlFor="disclaimer-textarea" className="text-xs font-medium text-muted-foreground block mb-1.5">
              Mandatory legal and medical notice appended to all communications:
            </label>
            <textarea
              id="disclaimer-textarea"
              rows={3}
              value={disclaimer}
              onChange={(e) => setDisclaimer(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded border border-border bg-card text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring leading-relaxed"
            />
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-xs transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          >
            <Save className="w-4 h-4" aria-hidden="true" />
            <span>{isSaving ? 'Saving...' : 'Save settings'}</span>
          </button>
        </div>

      </form>

      {/* Supabase Schema Preview Card */}
      <div className="bg-card rounded-lg p-6 border border-border shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-primary" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-foreground">
              PostgreSQL schema definition (001_init.sql)
            </h2>
          </div>

          <button
            type="button"
            onClick={copySqlToClipboard}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground border border-border px-2.5 py-1 rounded bg-secondary/50 font-medium focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
          >
            {copiedSql ? <Check className="w-3.5 h-3.5 text-primary" aria-hidden="true" /> : <Copy className="w-3.5 h-3.5" aria-hidden="true" />}
            <span>{copiedSql ? 'Copied' : 'Copy SQL'}</span>
          </button>
        </div>

        <p className="text-xs text-muted-foreground">
          Enforces tables for <code className="text-foreground">patients</code>, <code className="text-foreground">predictions</code>, <code className="text-foreground">alerts</code>, and <code className="text-foreground">tasks</code> with Row-Level Security (RLS) policies.
        </p>

        <pre className="p-4 rounded bg-foreground text-background text-xs font-mono overflow-x-auto max-h-64 leading-relaxed scrollbar-none">
          {sqlMigrationCode}
        </pre>
      </div>
    </div>
  );
};
