-- ============================================================================
-- AI Health Copilot Pro — Supabase / PostgreSQL Schema Migration
-- Author: Dr. Harry Patria, Chief Data & AI Officer, Patria & Co.
-- Migration: 001_init.sql
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Patients Table
CREATE TABLE IF NOT EXISTS public.patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_ref TEXT NOT NULL UNIQUE,
    age INT NOT NULL CHECK (age >= 0 AND age <= 125),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Predictions Table
CREATE TABLE IF NOT EXISTS public.predictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    probability NUMERIC(5,4) NOT NULL CHECK (probability >= 0.0 AND probability <= 1.0),
    risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'moderate', 'high')),
    flags JSONB NOT NULL DEFAULT '[]'::jsonb,
    key_factors JSONB NOT NULL DEFAULT '[]'::jsonb,
    recommendation TEXT NOT NULL,
    disclaimer TEXT NOT NULL,
    model_version TEXT NOT NULL DEFAULT '3.1.0',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Alerts Table (ITDO Triggers)
CREATE TABLE IF NOT EXISTS public.alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prediction_id UUID REFERENCES public.predictions(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    threshold NUMERIC(5,4) NOT NULL DEFAULT 0.7000,
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'ACKNOWLEDGED', 'RESOLVED')),
    assigned_to UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Tasks Table (ITDO Operations)
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_id UUID REFERENCES public.alerts(id) ON DELETE SET NULL,
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    intervention TEXT,
    status TEXT NOT NULL DEFAULT 'TODO' CHECK (status IN ('TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED')),
    due_date DATE,
    assigned_to UUID,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for high-performance querying
CREATE INDEX IF NOT EXISTS idx_predictions_patient_id ON public.predictions(patient_id);
CREATE INDEX IF NOT EXISTS idx_predictions_risk_level ON public.predictions(risk_level);
CREATE INDEX IF NOT EXISTS idx_predictions_created_at ON public.predictions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_alerts_status ON public.alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON public.alerts(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Default Permissive Policies for Authenticated Care Team
CREATE POLICY "Allow authenticated read patients" ON public.patients
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert patients" ON public.patients
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated read predictions" ON public.predictions
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert predictions" ON public.predictions
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated read alerts" ON public.alerts
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated update alerts" ON public.alerts
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated read tasks" ON public.tasks
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated manage tasks" ON public.tasks
    FOR ALL TO authenticated USING (true);
