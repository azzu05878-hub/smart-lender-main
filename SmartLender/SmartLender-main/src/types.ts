export interface LoanRecord {
  Loan_ID: string;
  Gender: string; // Male, Female, or missing
  Married: string; // Yes, No, or missing
  Dependents: string; // 0, 1, 2, 3+, or missing
  Education: string; // Graduate, Not Graduate
  Self_Employed: string; // Yes, No, or missing
  ApplicantIncome: number | null; // null if missing
  CoapplicantIncome: number | null;
  LoanAmount: number | null; // In thousands
  Loan_Amount_Term: number | null;
  Credit_History: number | null; // 1.0, 0.0, or null
  Property_Area: string; // Urban, Semiurban, Rural
  Loan_Status: "Y" | "N";
}

export type PreprocessNumericStrategy = "mean" | "median" | "mode" | "zero";
export type PreprocessCategoricalStrategy = "mode" | "missing_label" | "drop";

export interface PreprocessConfig {
  numericImputation: PreprocessNumericStrategy;
  categoricalImputation: PreprocessCategoricalStrategy;
  encodingType: "label" | "one_hot";
  scaling: boolean;
  trainTestRatio: number; // e.g. 0.8
}

export interface ModelParams {
  decisionTree: {
    maxDepth: number;
    minSamplesSplit: number;
  };
  randomForest: {
    nEstimators: number;
    maxDepth: number;
  };
  knn: {
    neighbors: number;
    distanceMetric: "euclidean" | "manhattan";
  };
  xgboost: {
    learningRate: number;
    maxDepth: number;
    nEstimators: number;
  };
}

export interface MetricSet {
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  confusionMatrix: {
    tp: number; // Predicted Yes, Actual Yes
    fp: number; // Predicted Yes, Actual No
    fn: number; // Predicted No, Actual Yes
    tn: number; // Predicted No, Actual No
  };
  featureImportance: { feature: string; importance: number }[];
}

export interface PredictionInput {
  Gender: string;
  Married: string;
  Dependents: string;
  Education: string;
  Self_Employed: string;
  ApplicantIncome: number;
  CoapplicantIncome: number;
  LoanAmount: number;
  Loan_Amount_Term: number;
  Credit_History: number;
  Property_Area: string;
}
