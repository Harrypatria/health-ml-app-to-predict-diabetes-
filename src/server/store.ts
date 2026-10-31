import { randomUUID } from 'crypto';
const uuidv4 = () => randomUUID();
import { AbnormalFlag } from './ml-pipeline.ts';
import { ClinicalExplanation } from './agent.ts';

export interface PatientRecord {
  id: string;
  patient_ref: string;
  age: number;
  gender: string;
  created_at: string;
  features: {
    Pregnancies: number;
    Glucose: number;
    BloodPressure: number;
    SkinThickness: number;
    Insulin: number;
    BMI: number;
    DiabetesPedigreeFunction: number;
    Age: number;
  };
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
  features: PatientRecord['features'];
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

export interface AppSettings {
  alert_threshold: number;
  default_disclaimer: string;
  auto_create_alerts: boolean;
  selected_model: 'calibrated_ensemble' | 'random_forest' | 'logistic_regression';
}

class ClinicalDatabase {
  private patients: Map<string, PatientRecord> = new Map();
  private predictions: Map<string, PredictionRecord> = new Map();
  private alerts: Map<string, AlertRecord> = new Map();
  private tasks: Map<string, TaskRecord> = new Map();
  private settings: AppSettings = {
    alert_threshold: 0.70,
    default_disclaimer:
      'CLINICAL DECISION SUPPORT NOTICE: This automated risk prediction is for licensed healthcare professional use only. Not a diagnostic confirmation.',
    auto_create_alerts: true,
    selected_model: 'calibrated_ensemble'
  };

  constructor() {
    this.seedInitialData();
  }

  private seedInitialData() {
    // Seed high-fidelity clinical cases from Pima dataset
    const seeds = [
      {
        ref: 'PID-7012',
        age: 50,
        features: {
          Pregnancies: 6,
          Glucose: 148,
          BloodPressure: 72,
          SkinThickness: 35,
          Insulin: 125,
          BMI: 33.6,
          DiabetesPedigreeFunction: 0.627,
          Age: 50
        },
        probability: 0.705,
        risk_level: 'high' as const,
        flags: [
          {
            feature: 'Glucose',
            value: 148,
            normalRange: '70–99 mg/dL',
            unit: 'mg/dL',
            status: 'HIGH' as const,
            severity: 'critical' as const,
            clinicalInterpretation: 'Fasting glucose 148 mg/dL exceeds diagnostic threshold for diabetes.'
          },
          {
            feature: 'BMI',
            value: 33.6,
            normalRange: '18.5–24.9 kg/m²',
            unit: 'kg/m²',
            status: 'HIGH' as const,
            severity: 'moderate' as const,
            clinicalInterpretation: 'Class I Obesity (33.6 kg/m²).'
          },
          {
            feature: 'Age',
            value: 50,
            normalRange: '18–44 yrs',
            unit: 'years',
            status: 'HIGH' as const,
            severity: 'mild' as const,
            clinicalInterpretation: 'Age 50 is an established demographic risk factor.'
          }
        ],
        key_factors: [
          'Fasting Plasma Glucose (148 mg/dL) significantly exceeds upper reference limit (99 mg/dL).',
          'Body Mass Index (33.6 kg/m²) is classified as clinical Obesity Class I.',
          'Patient Age (50 years) is in the high-incidence risk bracket for Type-2 diabetes.'
        ],
        recommendation:
          'Order fasting HbA1c and venous glucose panel within 7 days. Schedule cardiovascular risk assessment and diabetes educator intake.',
        alertStatus: 'OPEN' as const,
        task: {
          title: 'Order Venous HbA1c & Fasting Lab Confirmation',
          description: 'Confirm elevated screening glucose (148 mg/dL) with diagnostic venous HbA1c and lipid profile.',
          intervention: 'DIAGNOSTIC_LAB' as const,
          priority: 'URGENT' as const,
          status: 'TODO' as const,
          due_date: '2026-11-07'
        }
      },
      {
        ref: 'PID-7045',
        age: 33,
        features: {
          Pregnancies: 0,
          Glucose: 137,
          BloodPressure: 40,
          SkinThickness: 35,
          Insulin: 168,
          BMI: 43.1,
          DiabetesPedigreeFunction: 2.288,
          Age: 33
        },
        probability: 0.812,
        risk_level: 'high' as const,
        flags: [
          {
            feature: 'Glucose',
            value: 137,
            normalRange: '70–99 mg/dL',
            unit: 'mg/dL',
            status: 'HIGH' as const,
            severity: 'critical' as const,
            clinicalInterpretation: 'Fasting glucose 137 mg/dL in diabetic range.'
          },
          {
            feature: 'BMI',
            value: 43.1,
            normalRange: '18.5–24.9 kg/m²',
            unit: 'kg/m²',
            status: 'HIGH' as const,
            severity: 'critical' as const,
            clinicalInterpretation: 'Morbid Obesity Class III (43.1 kg/m²).'
          },
          {
            feature: 'DiabetesPedigreeFunction',
            value: 2.29,
            normalRange: '<0.50 typical',
            unit: 'score',
            status: 'HIGH' as const,
            severity: 'critical' as const,
            clinicalInterpretation: 'Exceptionally high genetic family risk score (2.29).'
          }
        ],
        key_factors: [
          'Severe hereditary predisposition with Pedigree score of 2.29.',
          'Class III Morbid Obesity (BMI 43.1 kg/m²).',
          'Elevated fasting glucose (137 mg/dL) accompanied by hyperinsulinemia (168 µU/mL).'
        ],
        recommendation:
          'Urgent multi-disciplinary consult: endocrinology referral, bariatric lifestyle intervention, and continuous glucose monitoring trial.',
        alertStatus: 'ACKNOWLEDGED' as const,
        task: {
          title: 'Endocrinology & Bariatric Medicine Referral',
          description: 'High genetic loading (Pedigree 2.29) and BMI 43.1. Route to Metabolic Care Team.',
          intervention: 'SPECIALIST_REFERRAL' as const,
          priority: 'HIGH' as const,
          status: 'IN_PROGRESS' as const,
          due_date: '2026-11-12'
        }
      },
      {
        ref: 'PID-7089',
        age: 31,
        features: {
          Pregnancies: 1,
          Glucose: 85,
          BloodPressure: 66,
          SkinThickness: 29,
          Insulin: 125,
          BMI: 26.6,
          DiabetesPedigreeFunction: 0.351,
          Age: 31
        },
        probability: 0.124,
        risk_level: 'low' as const,
        flags: [
          {
            feature: 'BMI',
            value: 26.6,
            normalRange: '18.5–24.9 kg/m²',
            unit: 'kg/m²',
            status: 'HIGH' as const,
            severity: 'mild' as const,
            clinicalInterpretation: 'Mild overweight status (BMI 26.6).'
          }
        ],
        key_factors: [
          'Fasting blood glucose (85 mg/dL) is well within optimal physiological range.',
          'Normal blood pressure and low hereditary pedigree score (0.35).'
        ],
        recommendation:
          'Patient at baseline low risk. Continue annual preventive health visits and moderate physical activity.',
        alertStatus: null,
        task: null
      },
      {
        ref: 'PID-7120',
        age: 41,
        features: {
          Pregnancies: 7,
          Glucose: 194,
          BloodPressure: 68,
          SkinThickness: 28,
          Insulin: 125,
          BMI: 35.9,
          DiabetesPedigreeFunction: 0.745,
          Age: 41
        },
        probability: 0.849,
        risk_level: 'high' as const,
        flags: [
          {
            feature: 'Glucose',
            value: 194,
            normalRange: '70–99 mg/dL',
            unit: 'mg/dL',
            status: 'HIGH' as const,
            severity: 'critical' as const,
            clinicalInterpretation: 'Severe hyperglycemia at 194 mg/dL.'
          },
          {
            feature: 'BMI',
            value: 35.9,
            normalRange: '18.5–24.9 kg/m²',
            unit: 'kg/m²',
            status: 'HIGH' as const,
            severity: 'critical' as const,
            clinicalInterpretation: 'Class II Obesity (35.9 kg/m²).'
          }
        ],
        key_factors: [
          'Marked hyperglycemia (194 mg/dL) presenting acute diabetes clinical profile.',
          'Class II Obesity (BMI 35.9 kg/m²) compounding metabolic resistance.',
          'Multiparous history (7 pregnancies) with elevated gestational risk background.'
        ],
        recommendation:
          'Prompt physician review for diagnostic confirmation and initiation of diabetes management plan (metformin/lifestyle).',
        alertStatus: 'OPEN' as const,
        task: {
          title: 'Urgent Diagnostic Review & Metformin Initiation Protocol',
          description: 'Severe hyperglycemia (194 mg/dL). Expedite primary physician consultation within 48h.',
          intervention: 'MEDICATION_REVIEW' as const,
          priority: 'URGENT' as const,
          status: 'TODO' as const,
          due_date: '2026-11-04'
        }
      },
      {
        ref: 'PID-7155',
        age: 27,
        features: {
          Pregnancies: 3,
          Glucose: 111,
          BloodPressure: 90,
          SkinThickness: 12,
          Insulin: 78,
          BMI: 28.4,
          DiabetesPedigreeFunction: 0.495,
          Age: 29
        },
        probability: 0.468,
        risk_level: 'moderate' as const,
        flags: [
          {
            feature: 'Glucose',
            value: 111,
            normalRange: '70–99 mg/dL',
            unit: 'mg/dL',
            status: 'HIGH' as const,
            severity: 'mild' as const,
            clinicalInterpretation: 'Prediabetes range (100–125 mg/dL).'
          },
          {
            feature: 'BloodPressure',
            value: 90,
            normalRange: '60–80 mmHg',
            unit: 'mmHg',
            status: 'HIGH' as const,
            severity: 'critical' as const,
            clinicalInterpretation: 'Stage 2 Diastolic Hypertension (≥90 mmHg).'
          }
        ],
        key_factors: [
          'Impaired fasting glucose (111 mg/dL) meets prediabetes diagnostic criteria.',
          'Concurrent Stage 2 diastolic hypertension (90 mmHg) raising metabolic syndrome risk.'
        ],
        recommendation:
          'Enroll patient in National Diabetes Prevention Program (DPP). Repeat fasting blood glucose in 90 days and start ambulatory BP monitoring.',
        alertStatus: null,
        task: {
          title: 'Enroll in Diabetes Prevention Program (DPP) & BP Monitoring',
          description: 'Provide nutritional therapy and prescribe 24-hr ambulatory blood pressure cuff.',
          intervention: 'LIFESTYLE_INTERVENTION' as const,
          priority: 'MEDIUM' as const,
          status: 'DONE' as const,
          due_date: '2026-10-25'
        }
      }
    ];

    for (const seed of seeds) {
      const patientId = `p-${seed.ref.toLowerCase()}`;
      const patient: PatientRecord = {
        id: patientId,
        patient_ref: seed.ref,
        age: seed.age,
        gender: 'Female', // Pima dataset cohort
        created_at: new Date(Date.now() - Math.floor(Math.random() * 86400000 * 10)).toISOString(),
        features: seed.features
      };
      this.patients.set(patientId, patient);

      const predictionId = `pred-${patientId}`;
      const prediction: PredictionRecord = {
        id: predictionId,
        patient_id: patientId,
        patient_ref: seed.ref,
        probability: seed.probability,
        risk_level: seed.risk_level,
        flags: seed.flags,
        key_factors: seed.key_factors,
        recommendation: seed.recommendation,
        disclaimer: this.settings.default_disclaimer,
        model_version: '3.1.0-crisp-dm',
        features: seed.features,
        created_at: patient.created_at
      };
      this.predictions.set(predictionId, prediction);

      if (seed.alertStatus) {
        const alertId = `alt-${patientId}`;
        const alert: AlertRecord = {
          id: alertId,
          prediction_id: predictionId,
          patient_id: patientId,
          patient_ref: seed.ref,
          threshold: this.settings.alert_threshold,
          probability: seed.probability,
          risk_level: seed.risk_level,
          status: seed.alertStatus,
          assigned_to: 'Dr. Sarah Lin, MD (Lead Endocrinologist)',
          created_at: patient.created_at,
          updated_at: new Date().toISOString()
        };
        this.alerts.set(alertId, alert);

        if (seed.task) {
          const taskId = `tsk-${patientId}`;
          const task: TaskRecord = {
            id: taskId,
            alert_id: alertId,
            prediction_id: predictionId,
            patient_id: patientId,
            patient_ref: seed.ref,
            title: seed.task.title,
            description: seed.task.description,
            intervention: seed.task.intervention,
            priority: seed.task.priority,
            status: seed.task.status,
            due_date: seed.task.due_date,
            assigned_to: 'Clinical Care Coordinator Team',
            created_by: 'AI Health Copilot Trigger',
            created_at: patient.created_at,
            updated_at: new Date().toISOString()
          };
          this.tasks.set(taskId, task);
        }
      }
    }
  }

  // Patients
  getPatients(): PatientRecord[] {
    return Array.from(this.patients.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  getPatient(id: string): PatientRecord | undefined {
    return this.patients.get(id);
  }

  // Predictions
  getPredictions(): PredictionRecord[] {
    return Array.from(this.predictions.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  savePrediction(
    patientRef: string,
    features: PatientRecord['features'],
    probability: number,
    riskLevel: 'low' | 'moderate' | 'high',
    flags: AbnormalFlag[],
    explanation: ClinicalExplanation
  ): { prediction: PredictionRecord; alert?: AlertRecord; patient: PatientRecord } {
    const patientId = `pat-${uuidv4().slice(0, 8)}`;
    const patient: PatientRecord = {
      id: patientId,
      patient_ref: patientRef || `PID-${Math.floor(1000 + Math.random() * 9000)}`,
      age: features.Age,
      gender: 'Female',
      created_at: new Date().toISOString(),
      features
    };
    this.patients.set(patientId, patient);

    const predictionId = `pred-${uuidv4().slice(0, 8)}`;
    const prediction: PredictionRecord = {
      id: predictionId,
      patient_id: patientId,
      patient_ref: patient.patient_ref,
      probability,
      risk_level: riskLevel,
      flags,
      key_factors: explanation.key_factors,
      recommendation: explanation.recommendation,
      disclaimer: explanation.disclaimer || this.settings.default_disclaimer,
      model_version: '3.1.0-crisp-dm',
      features,
      created_at: new Date().toISOString()
    };
    this.predictions.set(predictionId, prediction);

    let alert: AlertRecord | undefined;
    // Auto trigger alert if probability >= threshold
    if (probability >= this.settings.alert_threshold) {
      const alertId = `alt-${uuidv4().slice(0, 8)}`;
      alert = {
        id: alertId,
        prediction_id: predictionId,
        patient_id: patientId,
        patient_ref: patient.patient_ref,
        threshold: this.settings.alert_threshold,
        probability,
        risk_level: riskLevel,
        status: 'OPEN',
        assigned_to: 'Dr. Sarah Lin, MD (Lead Endocrinologist)',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      this.alerts.set(alertId, alert);

      // Auto create an operational task for high risk
      const taskId = `tsk-${uuidv4().slice(0, 8)}`;
      const task: TaskRecord = {
        id: taskId,
        alert_id: alertId,
        prediction_id: predictionId,
        patient_id: patientId,
        patient_ref: patient.patient_ref,
        title: `Diagnostic Lab Follow-up for ${patient.patient_ref} (Risk ${(probability * 100).toFixed(0)}%)`,
        description: `Patient flagged with ${riskLevel.toUpperCase()} risk (${(probability * 100).toFixed(1)}%). Recommended action: ${explanation.recommendation}`,
        intervention: 'DIAGNOSTIC_LAB',
        priority: probability >= 0.85 ? 'URGENT' : 'HIGH',
        status: 'TODO',
        due_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        assigned_to: 'Clinical Care Coordinator Team',
        created_by: 'ITDO Automated Workflow',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      this.tasks.set(taskId, task);
    }

    return { prediction, alert, patient };
  }

  // Alerts (ITDO Triggers)
  getAlerts(): AlertRecord[] {
    return Array.from(this.alerts.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  updateAlertStatus(id: string, status: AlertRecord['status'], notes?: string): AlertRecord | null {
    const alert = this.alerts.get(id);
    if (!alert) return null;
    alert.status = status;
    if (notes) alert.notes = notes;
    alert.updated_at = new Date().toISOString();
    return alert;
  }

  convertAlertToTask(
    alertId: string,
    title: string,
    intervention: TaskRecord['intervention'],
    priority: TaskRecord['priority'],
    dueDate: string,
    assignedTo: string
  ): TaskRecord | null {
    const alert = this.alerts.get(alertId);
    if (!alert) return null;

    const taskId = `tsk-${uuidv4().slice(0, 8)}`;
    const task: TaskRecord = {
      id: taskId,
      alert_id: alertId,
      prediction_id: alert.prediction_id,
      patient_id: alert.patient_id,
      patient_ref: alert.patient_ref,
      title,
      description: `Task escalated from Alert ${alertId} (Risk ${(alert.probability * 100).toFixed(1)}%).`,
      intervention,
      priority,
      status: 'TODO',
      due_date: dueDate,
      assigned_to: assignedTo || 'Care Coordinator Team',
      created_by: 'Physician Trigger Action',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.tasks.set(taskId, task);

    // Auto mark alert acknowledged
    alert.status = 'ACKNOWLEDGED';
    alert.updated_at = new Date().toISOString();

    return task;
  }

  // Tasks (ITDO Operations)
  getTasks(): TaskRecord[] {
    return Array.from(this.tasks.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  createTask(data: Omit<TaskRecord, 'id' | 'created_at' | 'updated_at'>): TaskRecord {
    const id = `tsk-${uuidv4().slice(0, 8)}`;
    const task: TaskRecord = {
      ...data,
      id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.tasks.set(id, task);
    return task;
  }

  updateTask(
    id: string,
    updates: Partial<Pick<TaskRecord, 'status' | 'priority' | 'assigned_to' | 'due_date' | 'title' | 'description'>>
  ): TaskRecord | null {
    const task = this.tasks.get(id);
    if (!task) return null;
    Object.assign(task, updates);
    task.updated_at = new Date().toISOString();
    return task;
  }

  deleteTask(id: string): boolean {
    return this.tasks.delete(id);
  }

  // Settings
  getSettings(): AppSettings {
    return { ...this.settings };
  }

  updateSettings(newSettings: Partial<AppSettings>): AppSettings {
    this.settings = { ...this.settings, ...newSettings };
    return this.settings;
  }
}

export const clinicalDb = new ClinicalDatabase();
