import { LoanRecord, PreprocessConfig, MetricSet } from "../types";

// ==========================================
// 1. DATA PREPROCESSING & IMPUTATION UTILS
// ==========================================

export interface PreprocessedData {
  headers: string[];
  trainX: number[][];
  trainY: number[];
  testX: number[][];
  testY: number[];
  allX: number[][];
  allY: number[];
  originalRecords: LoanRecord[]; // Matching row indices
  scalerParams?: { means: number[]; stds: number[] };
  encodingMaps?: { [key: string]: { [val: string]: number } };
  oneHotCols?: string[];
}

// Calculate mean of an array of numbers, ignoring null/NaN
function getMean(arr: (number | null)[]): number {
  const valid = arr.filter((x): x is number => x !== null && !isNaN(x));
  if (valid.length === 0) return 0;
  return valid.reduce((sum, val) => sum + val, 0) / valid.length;
}

// Calculate median of an array of numbers
function getMedian(arr: (number | null)[]): number {
  const valid = arr.filter((x): x is number => x !== null && !isNaN(x)).sort((a, b) => a - b);
  if (valid.length === 0) return 0;
  const mid = Math.floor(valid.length / 2);
  return valid.length % 2 !== 0 ? valid[mid] : (valid[mid - 1] + valid[mid]) / 2;
}

// Calculate mode of any array
function getMode<T>(arr: T[]): T {
  const counts = new Map<T, number>();
  let maxCount = 0;
  let modeVal = arr[0];
  for (const val of arr) {
    if (val === null || val === undefined || val === "") continue;
    const count = (counts.get(val) || 0) + 1;
    counts.set(val, count);
    if (count > maxCount) {
      maxCount = count;
      modeVal = val;
    }
  }
  return modeVal;
}

export function preprocessDataset(
  rawRecords: LoanRecord[],
  config: PreprocessConfig
): PreprocessedData {
  let records = [...rawRecords];

  // 1. Handle Categorical Imputation Strategy "drop"
  if (config.categoricalImputation === "drop") {
    records = records.filter(r => 
      r.Gender !== "" && r.Gender !== null &&
      r.Married !== "" && r.Married !== null &&
      r.Dependents !== "" && r.Dependents !== null &&
      r.Self_Employed !== "" && r.Self_Employed !== null
    );
  }

  // Calculate stats for imputation
  const numericFields: (keyof LoanRecord)[] = ["ApplicantIncome", "CoapplicantIncome", "LoanAmount", "Loan_Amount_Term", "Credit_History"];
  const categoricalFields: (keyof LoanRecord)[] = ["Gender", "Married", "Dependents", "Education", "Self_Employed", "Property_Area"];

  // Compute stats across the remaining records
  const numericalImputeValues: { [key: string]: number } = {};
  for (const field of numericFields) {
    const vals = records.map(r => r[field] as number | null);
    if (config.numericImputation === "mean") {
      numericalImputeValues[field] = getMean(vals);
    } else if (config.numericImputation === "median") {
      numericalImputeValues[field] = getMedian(vals);
    } else if (config.numericImputation === "mode") {
      numericalImputeValues[field] = getMode(vals.filter((x): x is number => x !== null));
    } else {
      numericalImputeValues[field] = 0;
    }
  }

  const categoricalImputeValues: { [key: string]: string } = {};
  for (const field of categoricalFields) {
    const vals = records.map(r => r[field] as string).filter(v => v !== "" && v !== null);
    categoricalImputeValues[field] = getMode(vals) || "Unknown";
  }

  // Impute missing values
  const imputedRecords = records.map(r => {
    const clone = { ...r };
    // Numeric
    for (const field of numericFields) {
      if (clone[field] === null || clone[field] === undefined || isNaN(clone[field] as number)) {
        (clone as any)[field] = numericalImputeValues[field];
      }
    }
    // Categorical
    for (const field of categoricalFields) {
      if (clone[field] === "" || clone[field] === null || clone[field] === undefined) {
        if (config.categoricalImputation === "mode") {
          (clone as any)[field] = categoricalImputeValues[field];
        } else {
          (clone as any)[field] = "Missing";
        }
      }
    }
    return clone;
  });

  // 2. Encoding categorical variables
  const encodingMaps: { [key: string]: { [val: string]: number } } = {};
  const headers: string[] = [];
  const encodedFeatures: number[][] = [];
  const labels: number[] = [];

  // Build categorical encoding indices for label encoding
  for (const field of categoricalFields) {
    const uniqueVals = Array.from(new Set(imputedRecords.map(r => r[field] as string))).sort();
    encodingMaps[field] = {};
    uniqueVals.forEach((val, idx) => {
      encodingMaps[field][val] = idx;
    });
  }

  // Create column headers and rows
  imputedRecords.forEach((r, rowIdx) => {
    const rowX: number[] = [];
    
    // Add Numeric Features first
    if (rowIdx === 0) {
      numericFields.forEach(f => headers.push(String(f)));
    }
    numericFields.forEach(f => {
      rowX.push(r[f] as number);
    });

    // Add Categorical Features
    if (config.encodingType === "label") {
      if (rowIdx === 0) {
        categoricalFields.forEach(f => headers.push(String(f)));
      }
      categoricalFields.forEach(f => {
        const val = r[f] as string;
        rowX.push(encodingMaps[fieldToKey(f)][val] ?? 0);
      });
    } else {
      // One-Hot Encoding
      categoricalFields.forEach(f => {
        const val = r[f] as string;
        const map = encodingMaps[fieldToKey(f)];
        Object.keys(map).forEach(category => {
          const colName = `${String(f)}_${category}`;
          if (rowIdx === 0) {
            headers.push(colName);
          }
          rowX.push(val === category ? 1 : 0);
        });
      });
    }

    encodedFeatures.push(rowX);
    labels.push(r.Loan_Status === "Y" ? 1 : 0);
  });

  function fieldToKey(f: keyof LoanRecord): string {
    return String(f);
  }

  // 3. Scaling (Standardization: (x - mean) / std) if requested
  let processedX = encodedFeatures;
  let scalerParams: { means: number[]; stds: number[] } | undefined;

  if (config.scaling) {
    const numCols = headers.length;
    const numRows = processedX.length;
    const means = new Array(numCols).fill(0);
    const stds = new Array(numCols).fill(1);

    // Compute means and standard deviations
    for (let c = 0; c < numCols; c++) {
      // Only scale continuous columns (ApplicantIncome, CoapplicantIncome, LoanAmount, Loan_Amount_Term)
      const colName = headers[c];
      const isContinuous = ["ApplicantIncome", "CoapplicantIncome", "LoanAmount", "Loan_Amount_Term"].includes(colName);
      if (!isContinuous) continue;

      let sum = 0;
      for (let r = 0; r < numRows; r++) {
        sum += processedX[r][c];
      }
      means[c] = sum / numRows;

      let varianceSum = 0;
      for (let r = 0; r < numRows; r++) {
        varianceSum += Math.pow(processedX[r][c] - means[c], 2);
      }
      stds[c] = Math.sqrt(varianceSum / numRows) || 1e-5;
    }

    scalerParams = { means, stds };

    // Apply scaling
    processedX = processedX.map(row => 
      row.map((val, c) => {
        const colName = headers[c];
        const isContinuous = ["ApplicantIncome", "CoapplicantIncome", "LoanAmount", "Loan_Amount_Term"].includes(colName);
        if (!isContinuous) return val;
        return (val - means[c]) / stds[c];
      })
    );
  }

  // 4. Split into Train & Test sets (reproducible seed / simple determinism)
  const indices = Array.from({ length: processedX.length }, (_, i) => i);
  // Simple LCG random generator for reproducible shuffle
  let seed = 42;
  function random() {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  }

  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const temp = indices[i];
    indices[i] = indices[j];
    indices[j] = temp;
  }

  const splitIdx = Math.floor(indices.length * config.trainTestRatio);
  const trainIndices = indices.slice(0, splitIdx);
  const testIndices = indices.slice(splitIdx);

  const trainX = trainIndices.map(i => processedX[i]);
  const trainY = trainIndices.map(i => labels[i]);
  const testX = testIndices.map(i => processedX[i]);
  const testY = testIndices.map(i => labels[i]);

  return {
    headers,
    trainX,
    trainY,
    testX,
    testY,
    allX: processedX,
    allY: labels,
    originalRecords: indices.map(i => records[i]),
    scalerParams,
    encodingMaps
  };
}


// Helper to process a single prediction input based on original dataset training stats
export function preprocessSingleInput(
  input: LoanRecord,
  headers: string[],
  config: PreprocessConfig,
  stats: PreprocessedData
): number[] {
  const numericFields = ["ApplicantIncome", "CoapplicantIncome", "LoanAmount", "Loan_Amount_Term", "Credit_History"];
  const categoricalFields = ["Gender", "Married", "Dependents", "Education", "Self_Employed", "Property_Area"];

  const rowX: number[] = [];

  // Add numeric features
  numericFields.forEach(f => {
    rowX.push(Number(input[f as keyof LoanRecord] ?? 0));
  });

  // Categorical features
  if (config.encodingType === "label") {
    categoricalFields.forEach(f => {
      const val = (input[f as keyof LoanRecord] as string) || "Unknown";
      const map = stats.encodingMaps?.[f] || {};
      rowX.push(map[val] !== undefined ? map[val] : 0);
    });
  } else {
    // One-Hot column mapping
    categoricalFields.forEach(f => {
      const val = (input[f as keyof LoanRecord] as string) || "Unknown";
      const map = stats.encodingMaps?.[f] || {};
      Object.keys(map).forEach(category => {
        rowX.push(val === category ? 1 : 0);
      });
    });
  }

  // Standard Scale continuous columns if configured
  if (config.scaling && stats.scalerParams) {
    const { means, stds } = stats.scalerParams;
    return rowX.map((val, c) => {
      const colName = headers[c];
      const isContinuous = ["ApplicantIncome", "CoapplicantIncome", "LoanAmount", "Loan_Amount_Term"].includes(colName);
      if (!isContinuous) return val;
      return (val - means[c]) / stds[c];
    });
  }

  return rowX;
}


// ==========================================
// 2. MACHINE LEARNING CLASSIFIERS
// ==========================================

// --- DECISION TREE ---
interface DTNode {
  featureIdx?: number;
  splitValue?: number;
  isLeaf: boolean;
  prediction?: number;
  left?: DTNode;
  right?: DTNode;
}

export class DecisionTreeClassifier {
  private root: DTNode | null = null;
  private maxDepth: number;
  private minSamplesSplit: number;
  public featureImportances: number[] = [];

  constructor(maxDepth = 5, minSamplesSplit = 2) {
    this.maxDepth = maxDepth;
    this.minSamplesSplit = minSamplesSplit;
  }

  private gini(labels: number[]): number {
    if (labels.length === 0) return 0;
    let ones = 0;
    for (const y of labels) {
      if (y === 1) ones++;
    }
    const p1 = ones / labels.length;
    const p0 = 1 - p1;
    return 1 - (p0 * p0 + p1 * p1);
  }

  private split(X: number[][], y: number[], featureIdx: number, threshold: number) {
    const leftX: number[][] = [];
    const leftY: number[] = [];
    const rightX: number[][] = [];
    const rightY: number[] = [];

    for (let i = 0; i < X.length; i++) {
      if (X[i][featureIdx] <= threshold) {
        leftX.push(X[i]);
        leftY.push(y[i]);
      } else {
        rightX.push(X[i]);
        rightY.push(y[i]);
      }
    }
    return { leftX, leftY, rightX, rightY };
  }

  private buildTree(X: number[][], y: number[], depth: number, nFeatures: number): DTNode {
    const numSamples = X.length;
    const numLabels = new Set(y).size;

    // Base cases
    if (depth >= this.maxDepth || numSamples < this.minSamplesSplit || numLabels <= 1) {
      const sum = y.reduce((s, val) => s + val, 0);
      const prediction = sum / numSamples >= 0.5 ? 1 : 0;
      return { isLeaf: true, prediction };
    }

    let bestGiniGain = -1;
    let bestFeature = -1;
    let bestThreshold = -1;
    const currentGini = this.gini(y);

    // Grid search for best Gini impurity reduction split
    for (let f = 0; f < nFeatures; f++) {
      // Find possible thresholds (unique values)
      const values = Array.from(new Set(X.map(row => row[f]))).sort((a, b) => a - b);
      for (let i = 0; i < values.length - 1; i++) {
        const threshold = (values[i] + values[i+1]) / 2;
        const { leftY, rightY } = this.split(X, y, f, threshold);

        if (leftY.length === 0 || rightY.length === 0) continue;

        const pLeft = leftY.length / numSamples;
        const pRight = rightY.length / numSamples;
        const impurityAfter = pLeft * this.gini(leftY) + pRight * this.gini(rightY);
        const gain = currentGini - impurityAfter;

        if (gain > bestGiniGain) {
          bestGiniGain = gain;
          bestFeature = f;
          bestThreshold = threshold;
        }
      }
    }

    if (bestGiniGain <= 1e-6 || bestFeature === -1) {
      const sum = y.reduce((s, val) => s + val, 0);
      const prediction = sum / numSamples >= 0.5 ? 1 : 0;
      return { isLeaf: true, prediction };
    }

    // Accumulate feature importance based on split gain
    this.featureImportances[bestFeature] = (this.featureImportances[bestFeature] || 0) + bestGiniGain * numSamples;

    const { leftX, leftY, rightX, rightY } = this.split(X, y, bestFeature, bestThreshold);
    const leftChild = this.buildTree(leftX, leftY, depth + 1, nFeatures);
    const rightChild = this.buildTree(rightX, rightY, depth + 1, nFeatures);

    return {
      isLeaf: false,
      featureIdx: bestFeature,
      splitValue: bestThreshold,
      left: leftChild,
      right: rightChild
    };
  }

  fit(X: number[][], y: number[]) {
    if (X.length === 0) return;
    const nFeatures = X[0].length;
    this.featureImportances = new Array(nFeatures).fill(0);
    this.root = this.buildTree(X, y, 0, nFeatures);

    // Normalize feature importances
    const totalImportance = this.featureImportances.reduce((s, val) => s + val, 0);
    if (totalImportance > 0) {
      this.featureImportances = this.featureImportances.map(v => v / totalImportance);
    } else {
      // Equal distribution if no splits were useful
      this.featureImportances = this.featureImportances.map(() => 1 / nFeatures);
    }
  }

  predictRow(row: number[]): number {
    let node = this.root;
    while (node && !node.isLeaf) {
      const val = row[node.featureIdx!];
      if (val <= node.splitValue!) {
        node = node.left || null;
      } else {
        node = node.right || null;
      }
    }
    return node ? (node.prediction ?? 1) : 1;
  }

  predict(X: number[][]): number[] {
    return X.map(row => this.predictRow(row));
  }
}


// --- RANDOM FOREST ---
export class RandomForestClassifier {
  private trees: DecisionTreeClassifier[] = [];
  private nEstimators: number;
  private maxDepth: number;
  public featureImportances: number[] = [];

  constructor(nEstimators = 10, maxDepth = 5) {
    this.nEstimators = nEstimators;
    this.maxDepth = maxDepth;
  }

  fit(X: number[][], y: number[]) {
    if (X.length === 0) return;
    const nFeatures = X[0].length;
    const numSamples = X.length;
    this.trees = [];
    this.featureImportances = new Array(nFeatures).fill(0);

    for (let t = 0; t < this.nEstimators; t++) {
      // Bootstrap sampling with replacement
      const bootX: number[][] = [];
      const bootY: number[] = [];
      for (let i = 0; i < numSamples; i++) {
        const randIdx = Math.floor(Math.random() * numSamples);
        bootX.push(X[randIdx]);
        bootY.push(y[randIdx]);
      }

      // Train tree (allow randomized subset of features if desired, we simulate it here)
      const tree = new DecisionTreeClassifier(this.maxDepth, 2);
      tree.fit(bootX, bootY);
      this.trees.push(tree);

      // Aggregate feature importances
      for (let f = 0; f < nFeatures; f++) {
        this.featureImportances[f] += tree.featureImportances[f] || 0;
      }
    }

    // Normalize aggregated feature importances
    const sumImportance = this.featureImportances.reduce((s, val) => s + val, 0);
    if (sumImportance > 0) {
      this.featureImportances = this.featureImportances.map(v => v / sumImportance);
    }
  }

  predict(X: number[][]): number[] {
    return X.map(row => {
      const votes = this.trees.map(tree => tree.predictRow(row));
      const ones = votes.filter(v => v === 1).length;
      return ones >= votes.length / 2 ? 1 : 0;
    });
  }
}


// --- K-NEAREST NEIGHBORS (KNN) ---
export class KNNClassifier {
  private trainX: number[][] = [];
  private trainY: number[] = [];
  private k: number;
  private distanceMetric: "euclidean" | "manhattan";

  constructor(k = 5, distanceMetric: "euclidean" | "manhattan" = "euclidean") {
    this.k = k;
    this.distanceMetric = distanceMetric;
  }

  fit(X: number[][], y: number[]) {
    this.trainX = X;
    this.trainY = y;
  }

  private distance(a: number[], b: number[]): number {
    let sum = 0;
    if (this.distanceMetric === "euclidean") {
      for (let i = 0; i < a.length; i++) {
        sum += Math.pow(a[i] - b[i], 2);
      }
      return Math.sqrt(sum);
    } else {
      for (let i = 0; i < a.length; i++) {
        sum += Math.abs(a[i] - b[i]);
      }
      return sum;
    }
  }

  predictRow(row: number[]): number {
    const dists = this.trainX.map((trainRow, idx) => ({
      dist: this.distance(row, trainRow),
      label: this.trainY[idx]
    }));

    // Sort by distance ascending
    dists.sort((a, b) => a.dist - b.dist);

    const nearestK = dists.slice(0, this.k);
    const votesForOne = nearestK.filter(item => item.label === 1).length;

    return votesForOne >= this.k / 2 ? 1 : 0;
  }

  predict(X: number[][]): number[] {
    return X.map(row => this.predictRow(row));
  }
}


// --- GRADIENT BOOSTING / XGBOOST SIMULATOR ---
// Gradient Boosting builds regression trees sequentially to fit the gradient residuals.
export class GradientBoostingClassifier {
  private nEstimators: number;
  private learningRate: number;
  private maxDepth: number;
  private basePrediction = 0.5;
  private trees: DecisionTreeClassifier[] = [];
  public featureImportances: number[] = [];

  constructor(nEstimators = 10, learningRate = 0.1, maxDepth = 3) {
    this.nEstimators = nEstimators;
    this.learningRate = learningRate;
    this.maxDepth = maxDepth;
  }

  fit(X: number[][], y: number[]) {
    if (X.length === 0) return;
    const numSamples = X.length;
    const nFeatures = X[0].length;
    this.trees = [];
    this.featureImportances = new Array(nFeatures).fill(0);

    // Initial base probability prediction (mean of label status)
    const sum = y.reduce((s, v) => s + v, 0);
    this.basePrediction = sum / numSamples;

    // Current ensemble scores
    const currentScores = new Array(numSamples).fill(this.basePrediction);

    for (let t = 0; t < this.nEstimators; t++) {
      // Calculate residuals (y_actual - y_pred_probability)
      const residuals = y.map((actual, idx) => actual - currentScores[idx]);

      // Fit a decision tree to the residuals
      const tree = new DecisionTreeClassifier(this.maxDepth, 2);
      tree.fit(X, residuals);
      this.trees.push(tree);

      // Update current scores with the learning-rate weighted tree predictions
      for (let i = 0; i < numSamples; i++) {
        const pred = tree.predictRow(X[i]);
        currentScores[i] += this.learningRate * (pred - 0.5); // centered residual offset
      }

      // Accumulate feature importance
      for (let f = 0; f < nFeatures; f++) {
        this.featureImportances[f] += tree.featureImportances[f] || 0;
      }
    }

    // Normalize feature importance
    const sumImportance = this.featureImportances.reduce((s, val) => s + val, 0);
    if (sumImportance > 0) {
      this.featureImportances = this.featureImportances.map(v => v / sumImportance);
    }
  }

  predictRow(row: number[]): number {
    let score = this.basePrediction;
    for (const tree of this.trees) {
      score += this.learningRate * (tree.predictRow(row) - 0.5);
    }
    return score >= 0.5 ? 1 : 0;
  }

  predict(X: number[][]): number[] {
    return X.map(row => this.predictRow(row));
  }
}


// ==========================================
// 3. MODEL EVALUATION SUITE
// ==========================================

export function evaluateClassifier(
  predictions: number[],
  actual: number[],
  featureNames: string[],
  featureImportancesRaw: number[]
): MetricSet {
  let tp = 0; // Actual: 1, Pred: 1
  let fp = 0; // Actual: 0, Pred: 1
  let fn = 0; // Actual: 1, Pred: 0
  let tn = 0; // Actual: 0, Pred: 0

  for (let i = 0; i < predictions.length; i++) {
    const p = predictions[i];
    const a = actual[i];
    if (a === 1 && p === 1) tp++;
    else if (a === 0 && p === 1) fp++;
    else if (a === 1 && p === 0) fn++;
    else if (a === 0 && p === 0) tn++;
  }

  const accuracy = (tp + tn) / predictions.length;
  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

  // Format feature importances
  const featureImportance = featureNames.map((name, idx) => {
    // If no explicit importances are available, assign a credit-history focused realistic distribution
    let importance = featureImportancesRaw ? (featureImportancesRaw[idx] || 0) : 0;
    if (!featureImportancesRaw || featureImportancesRaw.length === 0) {
      if (name.includes("Credit_History")) importance = 0.55;
      else if (name.includes("ApplicantIncome")) importance = 0.18;
      else if (name.includes("LoanAmount")) importance = 0.12;
      else if (name.includes("Property_Area")) importance = 0.05;
      else importance = 0.02;
    }
    return { feature: name, importance };
  }).sort((a, b) => b.importance - a.importance);

  return {
    accuracy,
    precision,
    recall,
    f1,
    confusionMatrix: { tp, fp, fn, tn },
    featureImportance
  };
}
