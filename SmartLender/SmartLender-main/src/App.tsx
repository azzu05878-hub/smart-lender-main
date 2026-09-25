import { useState, useEffect, useMemo } from "react";
import { rawLoanDataset } from "./data/loanDataset";
import { PreprocessConfig, ModelParams, MetricSet } from "./types";
import {
  preprocessDataset,
  DecisionTreeClassifier,
  RandomForestClassifier,
  KNNClassifier,
  GradientBoostingClassifier,
  evaluateClassifier,
  PreprocessedData
} from "./utils/mlEngine";

import DatasetExplorer from "./components/DatasetExplorer";
import EDALaboratory from "./components/EDALaboratory";
import PreprocessingSandbox from "./components/PreprocessingSandbox";
import ClassifierArena from "./components/ClassifierArena";
import SmartPredictor from "./components/SmartPredictor";
import MLTutorChat from "./components/MLTutorChat";

import {
  BookOpen,
  Database,
  BarChart3,
  Sliders,
  Settings,
  Brain,
  HelpCircle,
  GraduationCap,
  Sparkles,
  ArrowRight,
  ChevronRight
} from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState<"intro" | "data" | "eda" | "preprocess" | "models" | "predictor" | "chat">("intro");

  // Pipeline configuration
  const [preprocessConfig, setPreprocessConfig] = useState<PreprocessConfig>({
    numericImputation: "mean",
    categoricalImputation: "mode",
    encodingType: "one_hot",
    scaling: true,
    trainTestRatio: 0.8
  });

  // Hyper-parameters
  const [modelParams, setModelParams] = useState<ModelParams>({
    decisionTree: {
      maxDepth: 5,
      minSamplesSplit: 2
    },
    randomForest: {
      nEstimators: 15,
      maxDepth: 6
    },
    knn: {
      neighbors: 5,
      distanceMetric: "euclidean"
    },
    xgboost: {
      learningRate: 0.1,
      maxDepth: 3,
      nEstimators: 15
    }
  });

  // ML State
  const [processedData, setProcessedData] = useState<PreprocessedData>(() =>
    preprocessDataset(rawLoanDataset, {
      numericImputation: "mean",
      categoricalImputation: "mode",
      encodingType: "one_hot",
      scaling: true,
      trainTestRatio: 0.8
    })
  );

  const [metrics, setMetrics] = useState<{ [key: string]: MetricSet }>({});
  const [trainedModels, setTrainedModels] = useState<{ [key: string]: any }>({});
  const [selectedModel, setSelectedModel] = useState<string>("randomForest");

  // Run the full training pipeline across all classifiers
  const handleTrainAllModels = () => {
    const resultsMetrics: { [key: string]: MetricSet } = {};
    const resultsModels: { [key: string]: any } = {};

    // 1. Train Decision Tree
    const dt = new DecisionTreeClassifier(modelParams.decisionTree.maxDepth, modelParams.decisionTree.minSamplesSplit);
    dt.fit(processedData.trainX, processedData.trainY);
    const dtPreds = dt.predict(processedData.testX);
    resultsMetrics["decisionTree"] = evaluateClassifier(
      dtPreds,
      processedData.testY,
      processedData.headers,
      dt.featureImportances
    );
    resultsModels["decisionTree"] = dt;

    // 2. Train Random Forest
    const rf = new RandomForestClassifier(modelParams.randomForest.nEstimators, modelParams.randomForest.maxDepth);
    rf.fit(processedData.trainX, processedData.trainY);
    const rfPreds = rf.predict(processedData.testX);
    resultsMetrics["randomForest"] = evaluateClassifier(
      rfPreds,
      processedData.testY,
      processedData.headers,
      rf.featureImportances
    );
    resultsModels["randomForest"] = rf;

    // 3. Train KNN
    const knn = new KNNClassifier(modelParams.knn.neighbors, modelParams.knn.distanceMetric);
    knn.fit(processedData.trainX, processedData.trainY);
    const knnPreds = knn.predict(processedData.testX);
    resultsMetrics["knn"] = evaluateClassifier(
      knnPreds,
      processedData.testY,
      processedData.headers,
      [] // No feature importances for simple KNN
    );
    resultsModels["knn"] = knn;

    // 4. Train XGBoost Gradient Boosting
    const gb = new GradientBoostingClassifier(
      modelParams.xgboost.nEstimators,
      modelParams.xgboost.learningRate,
      modelParams.xgboost.maxDepth
    );
    gb.fit(processedData.trainX, processedData.trainY);
    const gbPreds = gb.predict(processedData.testX);
    resultsMetrics["xgboost"] = evaluateClassifier(
      gbPreds,
      processedData.testY,
      processedData.headers,
      gb.featureImportances
    );
    resultsModels["xgboost"] = gb;

    setMetrics(resultsMetrics);
    setTrainedModels(resultsModels);
  };

  // Re-run preprocessing pipeline
  const handleRunPreprocessing = () => {
    const updated = preprocessDataset(rawLoanDataset, preprocessConfig);
    setProcessedData(updated);
  };

  // Auto-run preprocessing & initial training on load and when processedData updates
  useEffect(() => {
    handleTrainAllModels();
  }, [processedData, modelParams]);

  const activeModelName = useMemo(() => {
    const names: { [key: string]: string } = {
      decisionTree: "Decision Tree Classifier",
      randomForest: "Random Forest Classifier",
      knn: "K-Nearest Neighbors (KNN)",
      xgboost: "XGBoost Simulator"
    };
    return names[selectedModel] || selectedModel;
  }, [selectedModel]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans" id="app-container">
      
      {/* Top Banner Navigation Header */}
      <header className="border-b border-slate-900 bg-slate-950/85 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-extrabold text-white text-sm tracking-wide flex items-center gap-1.5">
                Smart Lender
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase tracking-widest font-mono">
                  Hands-On ML Project
                </span>
              </h1>
              <p className="text-[10px] text-slate-500">Loan Eligibility Prediction, Imputation, & Modeling Lab</p>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-400 font-medium">
            <span className="bg-slate-900 px-2.5 py-1 rounded-md border border-slate-800">
              Python / Flask Curriculum
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-700" />
            <span className="bg-slate-900 px-2.5 py-1 rounded-md border border-slate-800">
              Scikit-Learn Algorithms
            </span>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col lg:flex-row gap-6">
        
        {/* Left: Sidebar Navigation Index */}
        <aside className="w-full lg:w-60 shrink-0 flex flex-col gap-4">
          
          <div className="bg-slate-950 border border-slate-900 rounded-xl p-4 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider px-3.5 block mb-2">
              Learning Sections
            </span>

            {/* Tab 1: Course Intro */}
            <button
              onClick={() => setActiveTab("intro")}
              className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-3 transition-all ${
                activeTab === "intro"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
              }`}
            >
              <BookOpen className="w-4 h-4" />
              1. Project Overview
            </button>

            {/* Tab 2: Dataset */}
            <button
              onClick={() => setActiveTab("data")}
              className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-3 transition-all ${
                activeTab === "data"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
              }`}
            >
              <Database className="w-4 h-4" />
              2. Dataset Explorer
            </button>

            {/* Tab 3: EDA */}
            <button
              onClick={() => setActiveTab("eda")}
              className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-3 transition-all ${
                activeTab === "eda"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              3. Visual EDA Lab
            </button>

            {/* Tab 4: Preprocessing */}
            <button
              onClick={() => setActiveTab("preprocess")}
              className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-3 transition-all ${
                activeTab === "preprocess"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
              }`}
            >
              <Sliders className="w-4 h-4" />
              4. Feature Sandbox
            </button>

            {/* Tab 5: Modeling */}
            <button
              onClick={() => setActiveTab("models")}
              className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-3 transition-all ${
                activeTab === "models"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
              }`}
            >
              <Settings className="w-4 h-4" />
              5. Classifier Arena
            </button>

            {/* Tab 6: Predictor */}
            <button
              onClick={() => setActiveTab("predictor")}
              className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-3 transition-all ${
                activeTab === "predictor"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
              }`}
            >
              <Brain className="w-4 h-4" />
              6. Smart Predictor
            </button>

            {/* Tab 7: AI Chat Tutor */}
            <button
              onClick={() => setActiveTab("chat")}
              className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-3 transition-all ${
                activeTab === "chat"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
              }`}
            >
              <Brain className="w-4 h-4 text-indigo-400 group-hover:text-white" />
              Interactive AI Tutor
            </button>
          </div>

          {/* Quick Stats sidebar footer */}
          <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-4 space-y-2.5 hidden lg:block text-[11px] text-slate-500 leading-relaxed">
            <span className="font-bold text-slate-300 block">Workspace Health</span>
            <div className="flex justify-between">
              <span>Database Rows:</span>
              <span className="text-slate-300 font-mono">100 (Sample)</span>
            </div>
            <div className="flex justify-between">
              <span>Active Model:</span>
              <span className="text-indigo-400 truncate w-24 text-right">{activeModelName}</span>
            </div>
            <div className="flex justify-between">
              <span>Test accuracy:</span>
              <span className="text-emerald-400 font-mono font-bold">
                {metrics[selectedModel] ? `${(metrics[selectedModel].accuracy * 100).toFixed(0)}%` : "N/A"}
              </span>
            </div>
          </div>
        </aside>

        {/* Main Workspace Stage */}
        <main className="flex-1 flex flex-col min-w-0">
          
          {/* INTRODUCTORY SLIDE VIEW */}
          {activeTab === "intro" && (
            <div className="space-y-6" id="view-intro">
              
              {/* Hero Deck */}
              <div className="bg-gradient-to-br from-indigo-950/40 to-slate-950 border border-indigo-900/30 rounded-2xl p-6 lg:p-8 space-y-4 shadow-xl">
                <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
                  Data Science Project Workspace
                </span>
                <h2 className="text-2xl lg:text-3xl font-extrabold text-white leading-tight">
                  Predicting Loan Approval with Classification Models
                </h2>
                <p className="text-slate-300 text-sm leading-relaxed max-w-3xl">
                  Welcome, Learners! This interactive web laboratory is modeled after the classic machine learning exercise. Here, we build and deploy financial classification systems to forecast loan eligibility from applicant profiles containing features such as Married status, Education level, Applicant Income, and Credit History.
                </p>

                <div className="pt-2 flex flex-wrap gap-4">
                  <button
                    onClick={() => setActiveTab("data")}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 active:scale-95 transition-all"
                  >
                    Begin Data Exploration
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setActiveTab("chat")}
                    className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-indigo-400 hover:text-indigo-300 font-bold text-xs px-5 py-3 rounded-xl transition-all"
                  >
                    Consult Interactive AI Tutor
                  </button>
                </div>
              </div>

              {/* Course Curriculum Roadmap */}
              <div className="space-y-4">
                <h3 className="font-extrabold text-white text-base">Interactive Learning Milestones</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Milestone 1 */}
                  <div className="bg-slate-950 border border-slate-850 p-5 rounded-xl space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold font-mono text-xs border border-indigo-500/20">
                        1
                      </span>
                      <h4 className="font-bold text-white text-sm">Exploratory Data Analysis (EDA)</h4>
                    </div>
                    <p className="text-slate-400 text-xs leading-relaxed">
                      Study dataset parameters. Discover high correlations between positive credit scoring histories and successful approval outcomes. Generate count histograms and bivariate scatter graphs.
                    </p>
                  </div>

                  {/* Milestone 2 */}
                  <div className="bg-slate-950 border border-slate-850 p-5 rounded-xl space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold font-mono text-xs border border-indigo-500/20">
                        2
                      </span>
                      <h4 className="font-bold text-white text-sm">Missing Value Imputation</h4>
                    </div>
                    <p className="text-slate-400 text-xs leading-relaxed">
                      Handle real-world missing data points. Experiment filling numeric blanks using Mean or Median strategies, and categorical blanks using Mode values or labels.
                    </p>
                  </div>

                  {/* Milestone 3 */}
                  <div className="bg-slate-950 border border-slate-850 p-5 rounded-xl space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold font-mono text-xs border border-indigo-500/20">
                        3
                      </span>
                      <h4 className="font-bold text-white text-sm">Feature Standardization & Encoding</h4>
                    </div>
                    <p className="text-slate-400 text-xs leading-relaxed">
                      Scale extreme salaries using standard normal standardization (<code className="text-teal-400 font-mono">Z-Score</code>) and encode categories via label maps or One-Hot vectors.
                    </p>
                  </div>

                  {/* Milestone 4 */}
                  <div className="bg-slate-950 border border-slate-850 p-5 rounded-xl space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold font-mono text-xs border border-indigo-500/20">
                        4
                      </span>
                      <h4 className="font-bold text-white text-sm">Classifier Training & Hyperparameters</h4>
                    </div>
                    <p className="text-slate-400 text-xs leading-relaxed">
                      Fit Decision Trees, Random Forests, K-Nearest Neighbors, and Gradient Boosting algorithms. Tune tree-depths, K-neighborhood sizes, and observe validation accuracies instantly.
                    </p>
                  </div>

                </div>
              </div>

            </div>
          )}

          {/* DATA TAB */}
          {activeTab === "data" && (
            <DatasetExplorer dataset={rawLoanDataset} />
          )}

          {/* EDA TAB */}
          {activeTab === "eda" && (
            <EDALaboratory dataset={rawLoanDataset} />
          )}

          {/* PREPROCESSING TAB */}
          {activeTab === "preprocess" && (
            <PreprocessingSandbox
              config={preprocessConfig}
              onConfigChange={setPreprocessConfig}
              rawDataset={rawLoanDataset}
              processedData={processedData}
              onExecutePipeline={handleRunPreprocessing}
            />
          )}

          {/* CLASSIFIERS TAB */}
          {activeTab === "models" && (
            <ClassifierArena
              processedData={processedData}
              modelParams={modelParams}
              onParamsChange={setModelParams}
              metrics={metrics}
              selectedModel={selectedModel}
              onSelectedModelChange={setSelectedModel}
              onTrainModels={handleTrainAllModels}
            />
          )}

          {/* PREDICTOR TAB */}
          {activeTab === "predictor" && (
            <SmartPredictor
              processedData={processedData}
              activeModelKey={selectedModel}
              activeModelName={activeModelName}
              activeModelInstance={trainedModels[selectedModel]}
              config={preprocessConfig}
              metrics={metrics[selectedModel] || null}
            />
          )}

          {/* TUTOR CHAT TAB */}
          {activeTab === "chat" && (
            <MLTutorChat />
          )}

        </main>
      </div>

      {/* Footer credits */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-[11px] text-slate-500 shrink-0">
        <div className="max-w-7xl mx-auto px-4">
          <p>© 2026 Smart Lender Educational Framework. Inspired by classic Python, Scikit-Learn, & Flask data curricula.</p>
        </div>
      </footer>

    </div>
  );
}
