import { useState, useMemo } from "react";
import { ModelParams, MetricSet } from "../types";
import { Play, Settings, RefreshCw, BarChart2, Info, CheckCircle, HelpCircle } from "lucide-react";
import { PreprocessedData } from "../utils/mlEngine";

interface ClassifierArenaProps {
  processedData: PreprocessedData;
  modelParams: ModelParams;
  onParamsChange: (newParams: ModelParams) => void;
  metrics: { [key: string]: MetricSet };
  selectedModel: string;
  onSelectedModelChange: (model: string) => void;
  onTrainModels: () => void;
}

export default function ClassifierArena({
  processedData,
  modelParams,
  onParamsChange,
  metrics,
  selectedModel,
  onSelectedModelChange,
  onTrainModels
}: ClassifierArenaProps) {
  const [activeModelTab, setActiveModelTab] = useState<"decisionTree" | "randomForest" | "knn" | "xgboost">("decisionTree");
  const [leaderboardMetric, setLeaderboardMetric] = useState<"accuracy" | "f1" | "precision" | "recall">("accuracy");
  const [isTraining, setIsTraining] = useState(false);

  // Helper to handle training simulation with beautiful UI spinner feedback
  const handleTrainClick = () => {
    setIsTraining(true);
    setTimeout(() => {
      onTrainModels();
      setIsTraining(false);
    }, 600);
  };

  // Convert model keys to student friendly names
  const modelNames: { [key: string]: string } = {
    decisionTree: "Decision Tree Classifier",
    randomForest: "Random Forest Classifier",
    knn: "K-Nearest Neighbors (KNN)",
    xgboost: "XGBoost Simulator"
  };

  const selectedModelMetrics = useMemo(() => {
    return metrics[selectedModel] || null;
  }, [metrics, selectedModel]);

  // Leaders sorted by selected performance score
  const sortedLeaderboard = useMemo(() => {
    return Object.entries(metrics).map(([key, val]) => ({
      key,
      name: modelNames[key] || key,
      score: val[leaderboardMetric],
      accuracy: val.accuracy,
      f1: val.f1,
      precision: val.precision,
      recall: val.recall
    })).sort((a, b) => b.score - a.score);
  }, [metrics, leaderboardMetric]);

  const updateParam = (model: "decisionTree" | "randomForest" | "knn" | "xgboost", key: string, val: any) => {
    onParamsChange({
      ...modelParams,
      [model]: {
        ...modelParams[model],
        [key]: val
      }
    });
  };

  return (
    <div className="space-y-6" id="classifier-arena-root">
      
      {/* Hyperparameter Settings Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Tuning Knobs (2 columns) */}
        <div className="lg:col-span-2 bg-slate-950 border border-slate-800 rounded-xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
            <div>
              <h3 className="font-bold text-white text-base">Model Tuning & Hyper-parameters</h3>
              <p className="text-slate-500 text-xs mt-0.5">Adjust model settings before running fits to control bias and variance</p>
            </div>

            <button
              onClick={handleTrainClick}
              disabled={isTraining}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 active:scale-95 disabled:opacity-50 transition-all"
              id="btn-train-models"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTraining ? "animate-spin" : ""}`} />
              {isTraining ? "Fitting Models..." : "Train Classifiers"}
            </button>
          </div>

          {/* Model Algorithm Selector Tabs */}
          <div className="flex bg-slate-900/50 p-1 rounded-lg border border-slate-800 gap-1 text-xs">
            {Object.keys(modelNames).map(key => (
              <button
                key={key}
                onClick={() => setActiveModelTab(key as any)}
                className={`flex-1 py-1.5 rounded-md font-semibold transition-all ${
                  activeModelTab === key
                    ? "bg-indigo-600 text-white shadow"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {key === "decisionTree" ? "Decision Tree" : key === "randomForest" ? "Random Forest" : key === "knn" ? "KNN" : "XGBoost"}
              </button>
            ))}
          </div>

          {/* Tabular Hyperparameters */}
          <div className="space-y-4 pt-2">
            
            {activeModelTab === "decisionTree" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="tuning-decision-tree">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-300">Max Depth</span>
                    <span className="text-indigo-400 font-mono">{modelParams.decisionTree.maxDepth}</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="15"
                    step="1"
                    value={modelParams.decisionTree.maxDepth}
                    onChange={e => updateParam("decisionTree", "maxDepth", parseInt(e.target.value))}
                    className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                  />
                  <p className="text-[10px] text-slate-500 leading-normal">
                    Controls node splits. Lower depth prevents overfitting (High Bias). Larger depth risks memoization (High Variance).
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-300">Min Samples Split</span>
                    <span className="text-indigo-400 font-mono">{modelParams.decisionTree.minSamplesSplit}</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="10"
                    step="1"
                    value={modelParams.decisionTree.minSamplesSplit}
                    onChange={e => updateParam("decisionTree", "minSamplesSplit", parseInt(e.target.value))}
                    className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                  />
                  <p className="text-[10px] text-slate-500 leading-normal">
                    Minimum data rows required to split an internal branch. Higher limits prune unstable leaf clusters.
                  </p>
                </div>
              </div>
            )}

            {activeModelTab === "randomForest" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="tuning-random-forest">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-300">Number of Estimators (Trees)</span>
                    <span className="text-indigo-400 font-mono">{modelParams.randomForest.nEstimators} Trees</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="40"
                    step="5"
                    value={modelParams.randomForest.nEstimators}
                    onChange={e => updateParam("randomForest", "nEstimators", parseInt(e.target.value))}
                    className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                  />
                  <p className="text-[10px] text-slate-500 leading-normal">
                    The number of decision trees in the ensemble forest. Averaging more trees smooths classification boundary variances.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-300">Forest Max Depth</span>
                    <span className="text-indigo-400 font-mono">{modelParams.randomForest.maxDepth}</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="12"
                    step="1"
                    value={modelParams.randomForest.maxDepth}
                    onChange={e => updateParam("randomForest", "maxDepth", parseInt(e.target.value))}
                    className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                  />
                  <p className="text-[10px] text-slate-500 leading-normal">
                    Restricts individual trees from over-segmenting.
                  </p>
                </div>
              </div>
            )}

            {activeModelTab === "knn" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="tuning-knn">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-300">Neighbors K</span>
                    <span className="text-indigo-400 font-mono">K = {modelParams.knn.neighbors}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="15"
                    step="2" // Usually odd values to prevent ties
                    value={modelParams.knn.neighbors}
                    onChange={e => updateParam("knn", "neighbors", parseInt(e.target.value))}
                    className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                  />
                  <p className="text-[10px] text-slate-500 leading-normal">
                    Size of neighborhood consensus. Lower K creates sharp boundaries (overfit). High K creates majority-biased results.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-300">Distance Metric</label>
                  <select
                    value={modelParams.knn.distanceMetric}
                    onChange={e => updateParam("knn", "distanceMetric", e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg text-slate-200 text-xs p-2.5 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="euclidean">Euclidean Distance (Straight Line)</option>
                    <option value="manhattan">Manhattan Distance (Grid L1 block-wise)</option>
                  </select>
                  <p className="text-[10px] text-slate-500 leading-normal">
                    The distance calculus. Euclidean tracks direct spheres; Manhattan counts grid offsets.
                  </p>
                </div>
              </div>
            )}

            {activeModelTab === "xgboost" && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="tuning-xgboost">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-300">Learning Rate</span>
                    <span className="text-indigo-400 font-mono">{modelParams.xgboost.learningRate}</span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="0.4"
                    step="0.05"
                    value={modelParams.xgboost.learningRate}
                    onChange={e => updateParam("xgboost", "learningRate", parseFloat(e.target.value))}
                    className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                  />
                  <p className="text-[9px] text-slate-500 leading-normal">
                    Shrinkage scaling applied to sequential tree outputs. Smaller steps require more trees.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-300">Estimators</span>
                    <span className="text-indigo-400 font-mono">{modelParams.xgboost.nEstimators}</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="35"
                    step="5"
                    value={modelParams.xgboost.nEstimators}
                    onChange={e => updateParam("xgboost", "nEstimators", parseInt(e.target.value))}
                    className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                  />
                  <p className="text-[9px] text-slate-500 leading-normal">
                    Number of boosting steps (iterative gradient correction trees).
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-300">Max Depth</span>
                    <span className="text-indigo-400 font-mono">{modelParams.xgboost.maxDepth}</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="6"
                    step="1"
                    value={modelParams.xgboost.maxDepth}
                    onChange={e => updateParam("xgboost", "maxDepth", parseInt(e.target.value))}
                    className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                  />
                  <p className="text-[9px] text-slate-500 leading-normal">
                    Depth of the weak learners. Usually shallow (stumps) in boosting systems.
                  </p>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Right: Dynamic Model Selector & Focus (1 column) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div className="space-y-4">
            <h4 className="font-bold text-white text-sm flex items-center gap-2">
              <Settings className="w-4 h-4 text-indigo-400" />
              Primary Trained Model
            </h4>
            <p className="text-slate-400 text-xs leading-normal">
              Choose which trained classifier handles live application requests in the Smart Predictor tab:
            </p>

            <div className="space-y-2.5 pt-2">
              {Object.entries(modelNames).map(([key, name]) => (
                <button
                  key={key}
                  onClick={() => onSelectedModelChange(key)}
                  className={`w-full text-left p-3 rounded-lg border text-xs font-medium transition-all flex items-center justify-between ${
                    selectedModel === key
                      ? "bg-indigo-950/40 text-indigo-300 border-indigo-600 shadow-lg"
                      : "bg-slate-950 text-slate-400 border-slate-800/80 hover:text-slate-200"
                  }`}
                >
                  <span>{name}</span>
                  {selectedModel === key && (
                    <span className="text-[10px] font-bold uppercase bg-indigo-600 text-white px-2 py-0.5 rounded-full">
                      ACTIVE
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="p-3.5 bg-emerald-950/15 border border-emerald-800/30 rounded-xl mt-4 flex items-start gap-2.5">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-[10px] text-slate-400 leading-relaxed">
              <span className="font-bold text-slate-200 block">Classifier Status Ready</span>
              Current pipeline is locked. Preprocessed training data contains <strong className="text-emerald-400 font-mono">{processedData.trainX.length} vectors</strong> with high predictive integrity.
            </div>
          </div>
        </div>

      </div>

      {/* Model Performance metrics Dashboard */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6" id="dashboard-metric-section">
        
        {/* Metric Leaderboard Table (1 column) */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex flex-wrap gap-2 items-center justify-between">
            <h4 className="font-bold text-white text-sm">ML Model Leaderboard</h4>
            
            <select
              value={leaderboardMetric}
              onChange={e => setLeaderboardMetric(e.target.value as any)}
              className="bg-slate-900 border border-slate-800 rounded text-slate-400 text-[10px] px-1.5 py-1 focus:outline-none focus:border-indigo-500"
            >
              <option value="accuracy">Accuracy Score</option>
              <option value="f1">F1-Score Measure</option>
              <option value="precision">Precision Score</option>
              <option value="recall">Recall (Sensitivity)</option>
            </select>
          </div>

          <div className="space-y-3">
            {sortedLeaderboard.map((item, idx) => (
              <div
                key={item.key}
                onClick={() => onSelectedModelChange(item.key)}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedModel === item.key
                    ? "bg-slate-900 border-indigo-500"
                    : "bg-slate-900/40 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-500 font-mono">#{idx+1}</span>
                    {item.name}
                  </span>
                  <span className="text-white font-mono font-bold">
                    {(item.score * 100).toFixed(1)}%
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-950 h-2 mt-2 rounded overflow-hidden">
                  <div
                    style={{ width: `${item.score * 100}%` }}
                    className={`h-full rounded transition-all duration-700 ${
                      idx === 0 ? "bg-emerald-500" : idx === 1 ? "bg-indigo-500" : "bg-slate-600"
                    }`}
                  ></div>
                </div>

                {/* mini grid of secondary values */}
                <div className="grid grid-cols-3 gap-1 text-[9px] text-slate-500 font-mono mt-2 pt-1 border-t border-slate-800/60">
                  <span>ACC: {(item.accuracy * 100).toFixed(0)}%</span>
                  <span>F1: {item.f1.toFixed(2)}</span>
                  <span>REC: {(item.recall * 100).toFixed(0)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Confusion Matrix (1 column) */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 space-y-4">
          <div>
            <h4 className="font-bold text-white text-sm">Confusion Matrix Grid</h4>
            <p className="text-slate-500 text-xs">Test set predictions comparison for {modelNames[selectedModel]}</p>
          </div>

          {selectedModelMetrics ? (
            <div className="space-y-4">
              {/* Matrix Table */}
              <div className="grid grid-cols-2 gap-2 text-center text-xs relative pt-4 pl-4 font-mono">
                {/* Labels */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 text-[9px] uppercase font-bold tracking-wider text-indigo-400">
                  Predicted Class
                </div>
                <div className="absolute left-0 top-1/2 -translate-y-1/2 -rotate-90 text-[9px] uppercase font-bold tracking-wider text-indigo-400">
                  Actual Class
                </div>

                {/* True Negatives (TN) */}
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-3.5 group relative">
                  <span className="text-[10px] block text-slate-500 font-sans">True Negatives (TN)</span>
                  <span className="text-lg font-bold text-white mt-1 block">
                    {selectedModelMetrics.confusionMatrix.tn}
                  </span>
                  <div className="absolute bottom-full mb-2 bg-slate-900 border border-slate-700 text-[10px] text-white rounded p-2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-10 w-44 whitespace-normal leading-relaxed">
                    <strong>Predicted Reject, Actually Rejected.</strong> Optimal risk screening. Prevents capital loss.
                  </div>
                </div>

                {/* False Positives (FP) */}
                <div className="bg-rose-950/20 border border-rose-900/40 rounded-lg p-3.5 group relative text-rose-300">
                  <span className="text-[10px] block text-rose-500 font-sans">False Positives (FP)</span>
                  <span className="text-lg font-bold mt-1 block">
                    {selectedModelMetrics.confusionMatrix.fp}
                  </span>
                  <div className="absolute bottom-full mb-2 bg-slate-900 border border-slate-700 text-[10px] text-white rounded p-2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-10 w-44 whitespace-normal leading-relaxed">
                    <strong>Predicted Approve, Actually Rejected.</strong> Dangerous default error! The applicant got a loan they cannot pay back. High cost to bank.
                  </div>
                </div>

                {/* False Negatives (FN) */}
                <div className="bg-yellow-950/20 border border-yellow-900/40 rounded-lg p-3.5 group relative text-yellow-300">
                  <span className="text-[10px] block text-yellow-500 font-sans">False Negatives (FN)</span>
                  <span className="text-lg font-bold mt-1 block">
                    {selectedModelMetrics.confusionMatrix.fn}
                  </span>
                  <div className="absolute bottom-full mb-2 bg-slate-900 border border-slate-700 text-[10px] text-white rounded p-2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-10 w-44 whitespace-normal leading-relaxed">
                    <strong>Predicted Reject, Actually Approved.</strong> Lost opportunity cost. Rejected a stable client.
                  </div>
                </div>

                {/* True Positives (TP) */}
                <div className="bg-emerald-950/20 border border-emerald-900/40 rounded-lg p-3.5 group relative text-emerald-300">
                  <span className="text-[10px] block text-emerald-500 font-sans">True Positives (TP)</span>
                  <span className="text-lg font-bold mt-1 block">
                    {selectedModelMetrics.confusionMatrix.tp}
                  </span>
                  <div className="absolute bottom-full mb-2 bg-slate-900 border border-slate-700 text-[10px] text-white rounded p-2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-10 w-44 whitespace-normal leading-relaxed">
                    <strong>Predicted Approve, Actually Approved.</strong> Successful transactions earning standard interest.
                  </div>
                </div>
              </div>

              {/* Explanatory subtitle */}
              <p className="text-[10px] text-slate-500 text-center italic">
                💡 Hover over cells to see the business impact of classification mistakes.
              </p>
            </div>
          ) : (
            <div className="text-xs text-slate-500 text-center py-10">Click "Train Classifiers" above to generate matrix stats.</div>
          )}
        </div>

        {/* Feature Importance SVG Bar Chart (1 column) */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 space-y-4">
          <div>
            <h4 className="font-bold text-white text-sm">Feature Importances</h4>
            <p className="text-slate-500 text-xs">Relative split weight contribution (Gini impurity decrease) for features</p>
          </div>

          {selectedModelMetrics && selectedModelMetrics.featureImportance ? (
            <div className="space-y-3 max-h-56 overflow-y-auto">
              {selectedModelMetrics.featureImportance.slice(0, 6).map((item, idx) => {
                const widthPct = Math.min(100, Math.max(8, item.importance * 100));

                return (
                  <div key={item.feature} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-medium text-slate-300 truncate w-32">{item.feature}</span>
                      <span className="text-slate-400 font-mono text-[10px]">
                        {(item.importance * 100).toFixed(0)}% weight
                      </span>
                    </div>

                    <div className="w-full bg-slate-900 h-2.5 rounded overflow-hidden">
                      <div
                        style={{ width: `${widthPct}%` }}
                        className={`h-full rounded transition-all duration-1000 ${
                          idx === 0 
                            ? "bg-gradient-to-r from-indigo-500 to-indigo-400" 
                            : idx === 1 
                            ? "bg-gradient-to-r from-teal-500 to-teal-400" 
                            : "bg-slate-700"
                        }`}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-xs text-slate-500 text-center py-10">Feature importances generate immediately on training.</div>
          )}
        </div>

      </div>

      {/* Educational guidance */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-start gap-3">
        <HelpCircle className="w-5 h-5 text-indigo-400 mt-0.5 shrink-0" />
        <div className="text-xs text-slate-400 leading-relaxed">
          <p className="font-semibold text-slate-200 mb-1">💡 What do these metrics represent?</p>
          <ul className="list-disc pl-4 space-y-1">
            <li><strong>Accuracy</strong> represents total correct guesses divided by total test records.</li>
            <li><strong>Precision (Pos Predictive Value)</strong>: Out of all approved predictions, how many were actually safe? High precision avoids risky loan defaults.</li>
            <li><strong>Recall (Sensitivity)</strong>: Out of all safe applicants, how many did the model identify? High recall means you don't turn away good customers.</li>
            <li><strong>F1-Score</strong> is the harmonic mean of Precision and Recall, representing the overall balance of the classifier.</li>
          </ul>
        </div>
      </div>

    </div>
  );
}
