import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import {
  loadAndTrainModel,
  flagAbnormalFeatures,
  predictDiabetesProba,
  FEATURE_NAMES,
  PatientFeatures
} from './src/server/ml-pipeline.ts';
import { explainDiagnosis, generateFallbackExplanation } from './src/server/agent.ts';
import { clinicalDb } from './src/server/store.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '10mb' }));

// Pre-warm the ML model
try {
  loadAndTrainModel();
  console.log('✅ Clinical ML model trained and initialized successfully.');
} catch (e) {
  console.error('Failed to pre-train model:', e);
}

// ==========================================
// API ROUTES
// ==========================================

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    model_loaded: true,
    version: '3.1.0-crisp-dm',
    timestamp: new Date().toISOString()
  });
});

// Model metrics & evaluation endpoint
app.get('/api/model-metrics', (req, res) => {
  try {
    const model = loadAndTrainModel();
    res.json(model.metrics);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to load model metrics' });
  }
});

// Dataset preview & exploration endpoint
app.get('/api/dataset', (req, res) => {
  try {
    const csvPaths = [
      path.resolve(process.cwd(), 'dataset/diabetes.csv'),
      path.resolve(process.cwd(), 'public/assets/aistudio/diabetes_698c203a.csv'),
      path.resolve(process.cwd(), 'diabetes.csv')
    ];
    let csvData = '';
    for (const p of csvPaths) {
      if (fs.existsSync(p)) {
        csvData = fs.readFileSync(p, 'utf-8');
        break;
      }
    }
    if (!csvData) {
      return res.status(404).json({ error: 'Dataset not found' });
    }
    const lines = csvData.trim().split('\n');
    const headers = lines[0].split(',');
    const sampleRows = lines.slice(1, 101).map((line, idx) => {
      const vals = line.split(',').map(Number);
      return {
        id: idx + 1,
        Pregnancies: vals[0],
        Glucose: vals[1],
        BloodPressure: vals[2],
        SkinThickness: vals[3],
        Insulin: vals[4],
        BMI: vals[5],
        DiabetesPedigreeFunction: vals[6],
        Age: vals[7],
        Outcome: vals[8]
      };
    });

    const model = loadAndTrainModel();
    res.json({
      headers,
      totalRows: lines.length - 1,
      sampleRows,
      stats: model.metrics.datasetStats
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to read dataset' });
  }
});

// Single patient prediction + deterministic flags + agentic clinical explanation
app.post('/api/predict', async (req, res) => {
  try {
    let patientData: number[] | PatientFeatures = req.body.features || req.body;
    let patientRef: string = req.body.patient_ref || '';
    const shouldSave: boolean = req.body.save !== false;

    let vector: number[];
    let featureObj: PatientFeatures;

    if (Array.isArray(patientData)) {
      if (patientData.length !== 8) {
        return res.status(400).json({ error: 'Expected 8 patient features.' });
      }
      vector = patientData.map(Number);
      featureObj = {
        Pregnancies: vector[0],
        Glucose: vector[1],
        BloodPressure: vector[2],
        SkinThickness: vector[3],
        Insulin: vector[4],
        BMI: vector[5],
        DiabetesPedigreeFunction: vector[6],
        Age: vector[7]
      };
    } else {
      featureObj = patientData;
      vector = [
        featureObj.Pregnancies,
        featureObj.Glucose,
        featureObj.BloodPressure,
        featureObj.SkinThickness,
        featureObj.Insulin,
        featureObj.BMI,
        featureObj.DiabetesPedigreeFunction,
        featureObj.Age
      ];
    }

    // Step 1: Deterministic prediction via trained pipeline
    const { probability, riskLevel, imputedFeatures } = predictDiabetesProba(vector);

    // Step 2: Deterministic abnormal flagging
    const flags = flagAbnormalFeatures(featureObj);

    // Step 3: Agentic clinical reasoning via Gemini
    const explanation = await explainDiagnosis(probability, flags);

    let savedResult = null;
    if (shouldSave) {
      savedResult = clinicalDb.savePrediction(
        patientRef,
        featureObj,
        probability,
        riskLevel,
        flags,
        explanation
      );
    }

    res.json({
      probability,
      risk_level: riskLevel,
      flags,
      key_factors: explanation.key_factors,
      recommendation: explanation.recommendation,
      disclaimer: explanation.disclaimer,
      source: explanation.source,
      imputed_features: imputedFeatures,
      patient_id: savedResult?.patient.id,
      patient_ref: savedResult?.patient.patient_ref,
      prediction_id: savedResult?.prediction.id,
      alert_id: savedResult?.alert?.id,
      alert_triggered: !!savedResult?.alert
    });
  } catch (err: any) {
    console.error('Prediction error:', err);
    res.status(500).json({ error: err.message || 'Error executing prediction pipeline' });
  }
});

// Batch prediction endpoint (handles up to 500 rows)
app.post('/api/batch-predict', async (req, res) => {
  try {
    const patients = req.body.patients;
    if (!Array.isArray(patients) || patients.length === 0) {
      return res.status(400).json({ error: 'Expected an array of patient records.' });
    }

    const settings = clinicalDb.getSettings();
    const results = [];
    let highRiskCount = 0;
    let modRiskCount = 0;
    let lowRiskCount = 0;

    for (let i = 0; i < patients.length; i++) {
      const p = patients[i];
      let vector: number[];
      let ref = p.patient_ref || `BATCH-${String(i + 1).padStart(3, '0')}`;
      let featObj: PatientFeatures;

      if (Array.isArray(p)) {
        vector = p.slice(0, 8).map(Number);
        featObj = {
          Pregnancies: vector[0],
          Glucose: vector[1],
          BloodPressure: vector[2],
          SkinThickness: vector[3],
          Insulin: vector[4],
          BMI: vector[5],
          DiabetesPedigreeFunction: vector[6],
          Age: vector[7]
        };
      } else {
        featObj = {
          Pregnancies: Number(p.Pregnancies ?? 0),
          Glucose: Number(p.Glucose ?? 100),
          BloodPressure: Number(p.BloodPressure ?? 70),
          SkinThickness: Number(p.SkinThickness ?? 20),
          Insulin: Number(p.Insulin ?? 80),
          BMI: Number(p.BMI ?? 25),
          DiabetesPedigreeFunction: Number(p.DiabetesPedigreeFunction ?? 0.3),
          Age: Number(p.Age ?? 30)
        };
        vector = [
          featObj.Pregnancies,
          featObj.Glucose,
          featObj.BloodPressure,
          featObj.SkinThickness,
          featObj.Insulin,
          featObj.BMI,
          featObj.DiabetesPedigreeFunction,
          featObj.Age
        ];
        if (p.patient_ref) ref = p.patient_ref;
      }

      const { probability, riskLevel } = predictDiabetesProba(vector);
      const flags = flagAbnormalFeatures(featObj);
      const explanation = generateFallbackExplanation(probability, flags);

      if (riskLevel === 'high') highRiskCount++;
      else if (riskLevel === 'moderate') modRiskCount++;
      else lowRiskCount++;

      // Automatically create alert if auto_create_alerts enabled and probability >= threshold
      let alertTriggered = false;
      if (settings.auto_create_alerts && probability >= settings.alert_threshold) {
        clinicalDb.savePrediction(ref, featObj, probability, riskLevel, flags, explanation);
        alertTriggered = true;
      }

      results.push({
        patient_ref: ref,
        features: featObj,
        probability,
        risk_level: riskLevel,
        flags_count: flags.length,
        flags,
        recommendation: explanation.recommendation,
        alert_triggered: alertTriggered
      });
    }

    res.json({
      total_processed: results.length,
      summary: {
        high_risk: highRiskCount,
        moderate_risk: modRiskCount,
        low_risk: lowRiskCount,
        threshold: settings.alert_threshold
      },
      results
    });
  } catch (err: any) {
    console.error('Batch error:', err);
    res.status(500).json({ error: err.message || 'Batch prediction error' });
  }
});

// Predictions list
app.get('/api/predictions', (req, res) => {
  res.json(clinicalDb.getPredictions());
});

// Alerts (ITDO Triggers)
app.get('/api/alerts', (req, res) => {
  res.json(clinicalDb.getAlerts());
});

app.patch('/api/alerts/:id', (req, res) => {
  const { status, notes } = req.body;
  const updated = clinicalDb.updateAlertStatus(req.params.id, status, notes);
  if (!updated) {
    return res.status(404).json({ error: 'Alert not found' });
  }
  res.json(updated);
});

app.post('/api/alerts/:id/convert-to-task', (req, res) => {
  const { title, intervention, priority, due_date, assigned_to } = req.body;
  const task = clinicalDb.convertAlertToTask(
    req.params.id,
    title || 'Clinical Intervention Task',
    intervention || 'DIAGNOSTIC_LAB',
    priority || 'HIGH',
    due_date || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    assigned_to || 'Care Coordinator Team'
  );
  if (!task) {
    return res.status(404).json({ error: 'Alert not found or could not be converted' });
  }
  res.json(task);
});

// Tasks (ITDO Operations)
app.get('/api/tasks', (req, res) => {
  res.json(clinicalDb.getTasks());
});

app.post('/api/tasks', (req, res) => {
  try {
    const task = clinicalDb.createTask(req.body);
    res.status(201).json(task);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.patch('/api/tasks/:id', (req, res) => {
  const updated = clinicalDb.updateTask(req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ error: 'Task not found' });
  }
  res.json(updated);
});

app.delete('/api/tasks/:id', (req, res) => {
  const ok = clinicalDb.deleteTask(req.params.id);
  res.json({ success: ok });
});

// Settings
app.get('/api/settings', (req, res) => {
  res.json(clinicalDb.getSettings());
});

app.post('/api/settings', (req, res) => {
  const updated = clinicalDb.updateSettings(req.body);
  res.json(updated);
});

// ==========================================
// STATIC FILES & DEV SERVER
// ==========================================

async function startServer() {
  if (!isProduction) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`🚀 AI Health Copilot Pro server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
