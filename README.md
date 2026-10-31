# AI Health Copilot Pro
> Production-Grade Full-Stack ML + Agentic Clinical Decision Support System  
> **Author:** Dr. Harry Patria, Chief Data & AI Officer, Patria & Co.  
> **Version:** 3.1.0 | **Framework:** fullstack-analytics-builder + Agentic ML Integration (Chapter 10)

---

## 🏥 Clinical Architecture & The ITDO Framework

The application implements the **ITDO Framework** to bridge empirical predictive risk estimation with clinical action:

```
[Patient Clinical Features]
        ↓
[Phase 1 & 3: Data Audit & Scikit-Learn Pipeline]
  • Zero imputation for biological impossibilities (Glucose, BP, Skin, Insulin, BMI)
  • SimpleImputer(strategy="median") + StandardScaler()
        ↓
[Phase 4: Calibrated Ensemble / Random Forest Classifier]
  • Predicts probability P(Type-2 Diabetes) [AUC-ROC = 0.835 holdout]
        ↓
[Phase 7: Deterministic Normal Range Guardrail]
  • Glucose (70-99), Diastolic BP (60-80), BMI (18.5-24.9), Age (0-120)
        ↓
[Agentic LLM Layer (Gemini)]
  • Receives ONLY probability + abnormal flags (Anti-hallucination discipline)
  • Structured Pydantic ClinicalExplanation output
        ↓
[ITDO CLOSED LOOP]
  • INSIGHT: Single/Batch live calibrated risk score & feature explanations
  • TRIGGER: Automated alert generated when probability ≥ 0.70 threshold
  • DECISION: Physician / Care Team clinical acknowledgment and triage
  • OPERATION: Kanban task assignment (Diagnostic Labs, DPP Referral, Med Review)
```

---

## 🚀 Key Features

1. **Executive Dashboard (`/`)**: High-level patient risk distribution, active trigger counts, clinical priority metrics, and recent evaluated cohorts.
2. **Single Patient Predictor (`/predict`)**: Live 300ms-debounced form & slider controls with physiological unit guides, risk gauge, deterministic anomaly chips, Gemini structured explanation, and one-click alert dispatch.
3. **Batch Predictor (`/batch`)**: Bulk CSV ingestion, instant risk categorization, population breakdown, and CSV report export.
4. **Alerts Management (`/alerts`)**: Clinical trigger inbox with status transitions (`OPEN`, `ACKNOWLEDGED`, `RESOLVED`), priority filters, and conversion to clinical tasks.
5. **Operational Kanban (`/tasks`)**: Care management board organizing interventions across `TODO`, `IN_PROGRESS`, `DONE`, and `CANCELLED`.
6. **Model Insights & CRISP-DM (`/model`)**: Live evaluation metrics (AUC-ROC, Accuracy, Precision, Recall, F1), interactive ROC curve with dynamic threshold slider, Confusion Matrix, and Feature Importance hierarchy.
7. **Clinical Governance (`/settings`)**: Configurable alert threshold (default 0.70), medical disclaimer customizer, and export tools.

---

## 🛠 Tech Stack

* **Frontend:** React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Framer Motion, Canvas Confetti.
* **Backend:** Express & Node.js with Vite middleware, Python 3.10 / FastAPI reference modules.
* **AI & Agentic Engine:** `@google/genai` (Gemini 3.8 Flash) with structured JSON schemas and deterministic clinical fallbacks.
* **Database & Persistence:** Supabase / PostgreSQL schema with Row-Level Security (RLS) migrations and in-memory server state.

---

## 💻 Local Quickstart

```bash
# 1. Install dependencies
npm install

# 2. Run the development full-stack server
npm run dev

# App runs at: http://localhost:3000
```
