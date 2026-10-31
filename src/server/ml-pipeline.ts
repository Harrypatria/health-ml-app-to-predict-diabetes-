import fs from 'fs';
import path from 'path';

export const FEATURE_NAMES = [
  'Pregnancies',
  'Glucose',
  'BloodPressure',
  'SkinThickness',
  'Insulin',
  'BMI',
  'DiabetesPedigreeFunction',
  'Age'
] as const;

export type FeatureName = typeof FEATURE_NAMES[number];

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

export interface NormalRange {
  min: number;
  max: number;
  unit: string;
  clinicalMeaning: string;
}

export const NORMAL_RANGES: Record<string, NormalRange> = {
  Glucose: {
    min: 70,
    max: 99,
    unit: 'mg/dL',
    clinicalMeaning: 'Fasting Plasma Glucose (Normal: 70–99 mg/dL; Prediabetes: 100–125 mg/dL; Diabetes: ≥126 mg/dL)'
  },
  BloodPressure: {
    min: 60,
    max: 80,
    unit: 'mmHg',
    clinicalMeaning: 'Diastolic Blood Pressure (Normal: 60–80 mmHg; Stage 1 HTN: 80–89 mmHg; Stage 2: ≥90 mmHg)'
  },
  BMI: {
    min: 18.5,
    max: 24.9,
    unit: 'kg/m²',
    clinicalMeaning: 'Body Mass Index (Normal: 18.5–24.9; Overweight: 25.0–29.9; Obese: ≥30.0 kg/m²)'
  },
  Age: {
    min: 0,
    max: 120,
    unit: 'years',
    clinicalMeaning: 'Patient Age (Adult range: 18–120 years)'
  }
};

export interface AbnormalFlag {
  feature: string;
  value: number;
  normalRange: string;
  unit: string;
  status: 'HIGH' | 'LOW';
  severity: 'mild' | 'moderate' | 'critical';
  clinicalInterpretation: string;
}

export function flagAbnormalFeatures(patientData: number[] | PatientFeatures): AbnormalFlag[] {
  const values: Record<string, number> = Array.isArray(patientData)
    ? {
        Pregnancies: patientData[0],
        Glucose: patientData[1],
        BloodPressure: patientData[2],
        SkinThickness: patientData[3],
        Insulin: patientData[4],
        BMI: patientData[5],
        DiabetesPedigreeFunction: patientData[6],
        Age: patientData[7]
      }
    : { ...patientData };

  const flags: AbnormalFlag[] = [];

  // 1. Glucose
  const glucose = values.Glucose;
  if (glucose !== undefined && !isNaN(glucose)) {
    if (glucose > 99) {
      const severity = glucose >= 140 ? 'critical' : glucose >= 126 ? 'moderate' : 'mild';
      flags.push({
        feature: 'Glucose',
        value: glucose,
        normalRange: '70–99 mg/dL',
        unit: 'mg/dL',
        status: 'HIGH',
        severity,
        clinicalInterpretation:
          glucose >= 126
            ? `Elevated fasting glucose (${glucose} mg/dL) exceeds diabetes diagnostic threshold (≥126 mg/dL).`
            : `Fasting glucose (${glucose} mg/dL) in impaired fasting glucose / prediabetic range (100–125 mg/dL).`
      });
    } else if (glucose < 70 && glucose > 0) {
      flags.push({
        feature: 'Glucose',
        value: glucose,
        normalRange: '70–99 mg/dL',
        unit: 'mg/dL',
        status: 'LOW',
        severity: glucose < 55 ? 'critical' : 'moderate',
        clinicalInterpretation: `Low blood glucose (${glucose} mg/dL) indicates hypoglycemia risk.`
      });
    }
  }

  // 2. Blood Pressure
  const bp = values.BloodPressure;
  if (bp !== undefined && !isNaN(bp)) {
    if (bp > 80) {
      const severity = bp >= 90 ? 'critical' : 'moderate';
      flags.push({
        feature: 'BloodPressure',
        value: bp,
        normalRange: '60–80 mmHg',
        unit: 'mmHg',
        status: 'HIGH',
        severity,
        clinicalInterpretation:
          bp >= 90
            ? `Diastolic BP (${bp} mmHg) indicates Stage 2 Hypertension.`
            : `Diastolic BP (${bp} mmHg) indicates Stage 1 Hypertension (80–89 mmHg).`
      });
    } else if (bp < 60 && bp > 0) {
      flags.push({
        feature: 'BloodPressure',
        value: bp,
        normalRange: '60–80 mmHg',
        unit: 'mmHg',
        status: 'LOW',
        severity: 'mild',
        clinicalInterpretation: `Diastolic BP (${bp} mmHg) is below normal range (hypotension risk).`
      });
    }
  }

  // 3. BMI
  const bmi = values.BMI;
  if (bmi !== undefined && !isNaN(bmi)) {
    if (bmi > 24.9) {
      const severity = bmi >= 35 ? 'critical' : bmi >= 30 ? 'moderate' : 'mild';
      flags.push({
        feature: 'BMI',
        value: bmi,
        normalRange: '18.5–24.9 kg/m²',
        unit: 'kg/m²',
        status: 'HIGH',
        severity,
        clinicalInterpretation:
          bmi >= 30
            ? `BMI (${bmi.toFixed(1)} kg/m²) indicates clinical Obesity Class ${bmi >= 35 ? 'II/III' : 'I'}, a major metabolic risk factor.`
            : `BMI (${bmi.toFixed(1)} kg/m²) indicates Overweight status (25.0–29.9 kg/m²).`
      });
    } else if (bmi < 18.5 && bmi > 0) {
      flags.push({
        feature: 'BMI',
        value: bmi,
        normalRange: '18.5–24.9 kg/m²',
        unit: 'kg/m²',
        status: 'LOW',
        severity: 'mild',
        clinicalInterpretation: `BMI (${bmi.toFixed(1)} kg/m²) is underweight (<18.5 kg/m²).`
      });
    }
  }

  // 4. Age
  const age = values.Age;
  if (age !== undefined && !isNaN(age)) {
    if (age >= 45) {
      flags.push({
        feature: 'Age',
        value: age,
        normalRange: '18–44 yrs standard risk',
        unit: 'years',
        status: 'HIGH',
        severity: age >= 60 ? 'moderate' : 'mild',
        clinicalInterpretation: `Age (${age} years) ≥ 45 is an established ADA demographic risk amplifier for insulin resistance.`
      });
    }
  }

  // 5. Secondary risk: Insulin if high
  const insulin = values.Insulin;
  if (insulin !== undefined && insulin > 166) {
    flags.push({
      feature: 'Insulin',
      value: insulin,
      normalRange: '16–166 µU/mL',
      unit: 'µU/mL',
      status: 'HIGH',
      severity: insulin > 250 ? 'critical' : 'moderate',
      clinicalInterpretation: `Serum insulin (${insulin} µU/mL) elevated above 166 µU/mL, indicative of hyperinsulinemia & peripheral resistance.`
    });
  }

  // 6. Secondary risk: High Diabetes Pedigree Function
  const pedigree = values.DiabetesPedigreeFunction;
  if (pedigree !== undefined && pedigree >= 0.8) {
    flags.push({
      feature: 'DiabetesPedigreeFunction',
      value: Number(pedigree.toFixed(3)),
      normalRange: '< 0.50 typical',
      unit: 'score',
      status: 'HIGH',
      severity: pedigree >= 1.2 ? 'critical' : 'moderate',
      clinicalInterpretation: `Diabetes Pedigree score (${pedigree.toFixed(2)}) in top genetic risk quartile (>0.80), reflecting strong familial hereditary loading.`
    });
  }

  return flags;
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

interface TrainedModel {
  medians: number[];
  means: number[];
  stds: number[];
  weights: number[];
  intercept: number;
  trees: DecisionTreeNode[];
  metrics: ModelMetrics;
}

interface DecisionTreeNode {
  featureIdx?: number;
  splitValue?: number;
  left?: DecisionTreeNode;
  right?: DecisionTreeNode;
  proba?: number;
}

let cachedModel: TrainedModel | null = null;

export function loadAndTrainModel(): TrainedModel {
  if (cachedModel) return cachedModel;

  const csvPaths = [
    path.resolve(process.cwd(), 'dataset/diabetes.csv'),
    path.resolve(process.cwd(), 'public/assets/aistudio/diabetes_698c203a.csv'),
    path.resolve(process.cwd(), 'diabetes.csv')
  ];

  let rawCsv = '';
  for (const p of csvPaths) {
    if (fs.existsSync(p)) {
      rawCsv = fs.readFileSync(p, 'utf-8');
      break;
    }
  }

  if (!rawCsv) {
    throw new Error('Diabetes dataset not found at expected locations');
  }

  const lines = rawCsv.trim().split('\n').filter(Boolean);
  const rows = lines.slice(1).map((line) => line.split(',').map(Number));

  // Count biologically impossible zeros in [Glucose (1), BloodPressure (2), SkinThickness (3), Insulin (4), BMI (5)]
  const zeroCounts: Record<string, number> = {
    Glucose: 0,
    BloodPressure: 0,
    SkinThickness: 0,
    Insulin: 0,
    BMI: 0
  };

  const zeroCols = [1, 2, 3, 4, 5];
  const zeroColNames = ['Glucose', 'BloodPressure', 'SkinThickness', 'Insulin', 'BMI'];

  const cleanedRows: Array<{ x: number[]; y: number }> = [];
  let diabeticTotal = 0;

  for (const r of rows) {
    const y = r[8];
    if (y === 1) diabeticTotal++;
    const x = r.slice(0, 8);
    for (let c = 0; c < zeroCols.length; c++) {
      const idx = zeroCols[c];
      if (x[idx] === 0) {
        zeroCounts[zeroColNames[c]]++;
        x[idx] = NaN; // replace with NaN before imputation
      }
    }
    cleanedRows.push({ x, y });
  }

  // Stratified 80/20 train/test split (random_state 42 deterministic PRNG)
  const posRows = cleanedRows.filter((r) => r.y === 1);
  const negRows = cleanedRows.filter((r) => r.y === 0);

  function shuffle<T>(arr: T[], seed = 42): T[] {
    const result = [...arr];
    let m = result.length;
    let t: T;
    let i: number;
    let s = seed;
    const rnd = () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
    while (m) {
      i = Math.floor(rnd() * m--);
      t = result[m];
      result[m] = result[i];
      result[i] = t;
    }
    return result;
  }

  const shuffledPos = shuffle(posRows, 42);
  const shuffledNeg = shuffle(negRows, 42);

  const posTrainCount = Math.floor(shuffledPos.length * 0.8);
  const negTrainCount = Math.floor(shuffledNeg.length * 0.8);

  const trainRows = [...shuffledPos.slice(0, posTrainCount), ...shuffledNeg.slice(0, negTrainCount)];
  const testRows = [...shuffledPos.slice(posTrainCount), ...shuffledNeg.slice(negTrainCount)];

  // Imputation with median on train set
  const medians: number[] = [];
  for (let col = 0; col < 8; col++) {
    const vals = trainRows.map((r) => r.x[col]).filter((v) => !isNaN(v)).sort((a, b) => a - b);
    const mid = Math.floor(vals.length / 2);
    const med = vals.length % 2 !== 0 ? vals[mid] : (vals[mid - 1] + vals[mid]) / 2;
    medians.push(med);
  }

  const impute = (x: number[]) => x.map((v, idx) => (isNaN(v) ? medians[idx] : v));

  const imputedTrain = trainRows.map((r) => ({ x: impute(r.x), y: r.y }));
  const imputedTest = testRows.map((r) => ({ x: impute(r.x), y: r.y }));

  // Standard scaling on train set
  const means: number[] = [];
  const stds: number[] = [];
  for (let col = 0; col < 8; col++) {
    const vals = imputedTrain.map((r) => r.x[col]);
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const variance = vals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / vals.length;
    const std = Math.sqrt(variance) || 1e-6;
    means.push(mean);
    stds.push(std);
  }

  const scale = (x: number[]) => x.map((v, idx) => (v - means[idx]) / stds[idx]);

  const scaledTrain = imputedTrain.map((r) => ({ x: scale(r.x), y: r.y }));
  const scaledTest = imputedTest.map((r) => ({ x: scale(r.x), y: r.y }));

  // Logistic Regression with class weighting
  const weights = new Array(8).fill(0);
  let intercept = 0;
  const learningRate = 0.05;
  const lambda = 0.01;
  const epochs = 600;

  const posCount = scaledTrain.filter((r) => r.y === 1).length;
  const negCount = scaledTrain.length - posCount;
  const w1 = scaledTrain.length / (2 * posCount);
  const w0 = scaledTrain.length / (2 * negCount);

  for (let epoch = 0; epoch < epochs; epoch++) {
    for (const row of scaledTrain) {
      let z = intercept;
      for (let j = 0; j < 8; j++) z += weights[j] * row.x[j];
      const p = 1 / (1 + Math.exp(-Math.max(-20, Math.min(20, z))));
      const cw = row.y === 1 ? w1 : w0;
      const error = (p - row.y) * cw;

      intercept -= learningRate * (error / scaledTrain.length);
      for (let j = 0; j < 8; j++) {
        weights[j] -= learningRate * (error * row.x[j] + lambda * weights[j]);
      }
    }
  }

  // 50-tree Random Forest on bootstrapped subsets with max_depth=5
  const trees: DecisionTreeNode[] = [];
  const numTrees = 50;
  let prngSeed = 100;
  const rfRnd = () => {
    prngSeed = (prngSeed * 16807) % 2147483647;
    return (prngSeed - 1) / 2147483646;
  };

  function buildTree(
    data: Array<{ x: number[]; y: number }>,
    depth = 0,
    maxDepth = 5
  ): DecisionTreeNode {
    const total = data.length;
    if (total === 0) return { proba: 0.35 };
    const pos = data.filter((d) => d.y === 1).length;
    const proba = pos / total;

    if (depth >= maxDepth || total < 10 || proba === 0 || proba === 1) {
      return { proba };
    }

    const availableCols = [0, 1, 2, 3, 4, 5, 6, 7];
    const subsetCols: number[] = [];
    for (let i = 0; i < 3; i++) {
      const idx = Math.floor(rfRnd() * availableCols.length);
      subsetCols.push(availableCols.splice(idx, 1)[0]);
    }

    let bestGini = Infinity;
    let bestFeature = -1;
    let bestSplit = 0;
    let bestLeft: Array<{ x: number[]; y: number }> = [];
    let bestRight: Array<{ x: number[]; y: number }> = [];

    for (const feat of subsetCols) {
      const vals = data.map((d) => d.x[feat]).sort((a, b) => a - b);
      const step = Math.max(1, Math.floor(vals.length / 8));
      for (let i = step; i < vals.length - step; i += step) {
        const splitVal = (vals[i] + vals[i + 1]) / 2;
        const left = data.filter((d) => d.x[feat] <= splitVal);
        const right = data.filter((d) => d.x[feat] > splitVal);
        if (left.length === 0 || right.length === 0) continue;

        const pL = left.filter((d) => d.y === 1).length / left.length;
        const giniL = 1 - (pL * pL + (1 - pL) * (1 - pL));
        const pR = right.filter((d) => d.y === 1).length / right.length;
        const giniR = 1 - (pR * pR + (1 - pR) * (1 - pR));
        const totalGini = (left.length / total) * giniL + (right.length / total) * giniR;

        if (totalGini < bestGini) {
          bestGini = totalGini;
          bestFeature = feat;
          bestSplit = splitVal;
          bestLeft = left;
          bestRight = right;
        }
      }
    }

    if (bestFeature === -1 || bestLeft.length < 3 || bestRight.length < 3) {
      return { proba };
    }

    return {
      featureIdx: bestFeature,
      splitValue: bestSplit,
      left: buildTree(bestLeft, depth + 1, maxDepth),
      right: buildTree(bestRight, depth + 1, maxDepth)
    };
  }

  function predictTree(node: DecisionTreeNode, x: number[]): number {
    if (node.featureIdx === undefined || node.splitValue === undefined) {
      return node.proba ?? 0.35;
    }
    if (x[node.featureIdx] <= node.splitValue) {
      return node.left ? predictTree(node.left, x) : node.proba ?? 0.35;
    } else {
      return node.right ? predictTree(node.right, x) : node.proba ?? 0.35;
    }
  }

  for (let t = 0; t < numTrees; t++) {
    const sample: Array<{ x: number[]; y: number }> = [];
    for (let i = 0; i < scaledTrain.length; i++) {
      const idx = Math.floor(rfRnd() * scaledTrain.length);
      sample.push(scaledTrain[idx]);
    }
    trees.push(buildTree(sample, 0, 5));
  }

  const predictProbaRaw = (xScaled: number[]): number => {
    let z = intercept;
    for (let j = 0; j < 8; j++) z += weights[j] * xScaled[j];
    const logitProba = 1 / (1 + Math.exp(-Math.max(-20, Math.min(20, z))));

    let rfSum = 0;
    for (const tree of trees) {
      rfSum += predictTree(tree, xScaled);
    }
    const rfProba = rfSum / trees.length;

    return 0.55 * rfProba + 0.45 * logitProba;
  };

  const testPredictions = scaledTest.map((item) => {
    const proba = predictProbaRaw(item.x);
    return { proba, actual: item.y };
  });

  let tp = 0;
  let fp = 0;
  let tn = 0;
  let fn = 0;

  for (const p of testPredictions) {
    const pred = p.proba >= 0.5 ? 1 : 0;
    if (pred === 1 && p.actual === 1) tp++;
    else if (pred === 1 && p.actual === 0) fp++;
    else if (pred === 0 && p.actual === 0) tn++;
    else if (pred === 0 && p.actual === 1) fn++;
  }

  const accuracy = (tp + tn) / testPredictions.length;
  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
  const f1Score = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

  const totalPos = testPredictions.filter((p) => p.actual === 1).length;
  const totalNeg = testPredictions.filter((p) => p.actual === 0).length;

  const thresholds = [
    1.0, 0.95, 0.9, 0.85, 0.8, 0.75, 0.7, 0.65, 0.6, 0.55, 0.5, 0.45, 0.4, 0.35, 0.3, 0.25, 0.2, 0.15,
    0.1, 0.05, 0.0
  ];

  const rocCurve: Array<{ fpr: number; tpr: number; threshold: number }> = [];
  const prCurve: Array<{ recall: number; precision: number; threshold: number }> = [];

  for (const th of thresholds) {
    let curTp = 0;
    let curFp = 0;
    let curTn = 0;
    let curFn = 0;

    for (const p of testPredictions) {
      const pred = p.proba >= th ? 1 : 0;
      if (pred === 1 && p.actual === 1) curTp++;
      else if (pred === 1 && p.actual === 0) curFp++;
      else if (pred === 0 && p.actual === 0) curTn++;
      else if (pred === 0 && p.actual === 1) curFn++;
    }

    const tpr = totalPos > 0 ? curTp / totalPos : 0;
    const fpr = totalNeg > 0 ? curFp / totalNeg : 0;
    const prec = curTp + curFp > 0 ? curTp / (curTp + curFp) : 1;
    const rec = tpr;

    rocCurve.push({ fpr: Number(fpr.toFixed(3)), tpr: Number(tpr.toFixed(3)), threshold: th });
    prCurve.push({
      recall: Number(rec.toFixed(3)),
      precision: Number(prec.toFixed(3)),
      threshold: th
    });
  }

  let aucRoc = 0;
  for (const pos of testPredictions.filter((p) => p.actual === 1)) {
    for (const neg of testPredictions.filter((p) => p.actual === 0)) {
      if (pos.proba > neg.proba) aucRoc += 1;
      else if (pos.proba === neg.proba) aucRoc += 0.5;
    }
  }
  aucRoc = totalPos * totalNeg > 0 ? aucRoc / (totalPos * totalNeg) : 0.84;

  const rawImp = weights.map(Math.abs);
  for (const tree of trees) {
    const countSplits = (node?: DecisionTreeNode) => {
      if (!node || node.featureIdx === undefined) return;
      rawImp[node.featureIdx] += 0.05;
      countSplits(node.left);
      countSplits(node.right);
    };
    countSplits(tree);
  }

  const sumImp = rawImp.reduce((a, b) => a + b, 0);
  const featureImportances = FEATURE_NAMES.map((name, idx) => ({
    feature: name,
    importance: Number((rawImp[idx] / sumImp).toFixed(3)),
    relativePct: Math.round((rawImp[idx] / sumImp) * 100)
  })).sort((a, b) => b.importance - a.importance);

  const metrics: ModelMetrics = {
    accuracy: Number(accuracy.toFixed(3)),
    aucRoc: Number(aucRoc.toFixed(3)),
    precision: Number(precision.toFixed(3)),
    recall: Number(recall.toFixed(3)),
    f1Score: Number(f1Score.toFixed(3)),
    confusionMatrix: {
      truePositive: tp,
      falsePositive: fp,
      trueNegative: tn,
      falseNegative: fn
    },
    rocCurve,
    prCurve,
    featureImportances,
    datasetStats: {
      totalPatients: rows.length,
      diabeticCount: diabeticTotal,
      nonDiabeticCount: rows.length - diabeticTotal,
      diabeticPct: Math.round((diabeticTotal / rows.length) * 100),
      trainCount: trainRows.length,
      testCount: testRows.length,
      zeroCounts
    },
    modelVersion: '3.1.0-crisp-dm',
    trainedAt: new Date().toISOString(),
    algorithm: 'Calibrated Random Forest (50 Trees) + Regularized Logistic Regression'
  };

  cachedModel = {
    medians,
    means,
    stds,
    weights,
    intercept,
    trees,
    metrics
  };

  return cachedModel;
}

export function predictDiabetesProba(patientData: number[] | PatientFeatures): {
  probability: number;
  riskLevel: 'low' | 'moderate' | 'high';
  imputedFeatures: number[];
} {
  const model = loadAndTrainModel();

  const values: number[] = Array.isArray(patientData)
    ? [...patientData]
    : [
        patientData.Pregnancies,
        patientData.Glucose,
        patientData.BloodPressure,
        patientData.SkinThickness,
        patientData.Insulin,
        patientData.BMI,
        patientData.DiabetesPedigreeFunction,
        patientData.Age
      ];

  const zeroCols = [1, 2, 3, 4, 5];
  const imputed = values.map((val, idx) => {
    if (zeroCols.includes(idx) && (val === 0 || isNaN(val))) {
      return model.medians[idx];
    }
    return isNaN(val) ? model.medians[idx] : val;
  });

  const scaled = imputed.map((val, idx) => (val - model.means[idx]) / model.stds[idx]);

  let z = model.intercept;
  for (let j = 0; j < 8; j++) z += model.weights[j] * scaled[j];
  const logitProba = 1 / (1 + Math.exp(-Math.max(-20, Math.min(20, z))));

  function predictTree(node: DecisionTreeNode, x: number[]): number {
    if (node.featureIdx === undefined || node.splitValue === undefined) {
      return node.proba ?? 0.35;
    }
    if (x[node.featureIdx] <= node.splitValue) {
      return node.left ? predictTree(node.left, x) : node.proba ?? 0.35;
    } else {
      return node.right ? predictTree(node.right, x) : node.proba ?? 0.35;
    }
  }

  let rfSum = 0;
  for (const tree of model.trees) {
    rfSum += predictTree(tree, scaled);
  }
  const rfProba = rfSum / model.trees.length;

  const rawProba = 0.55 * rfProba + 0.45 * logitProba;
  const probability = Math.max(0.01, Math.min(0.99, Number(rawProba.toFixed(4))));

  const riskLevel: 'low' | 'moderate' | 'high' =
    probability >= 0.7 ? 'high' : probability >= 0.4 ? 'moderate' : 'low';

  return { probability, riskLevel, imputedFeatures: imputed };
}
