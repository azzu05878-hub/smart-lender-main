import { useState, useMemo } from "react";
import { PreprocessConfig, LoanRecord } from "../types";
import { Sliders, RefreshCw, Layers, CheckCircle, ArrowRight, HelpCircle } from "lucide-react";
import { PreprocessedData } from "../utils/mlEngine";

interface PreprocessingSandboxProps {
  config: PreprocessConfig;
  onConfigChange: (newConfig: PreprocessConfig) => void;
  rawDataset: LoanRecord[];
  processedData: PreprocessedData;
  onExecutePipeline: () => void;
}

export default function PreprocessingSandbox({
  config,
  onConfigChange,
  rawDataset,
  processedData,
  onExecutePipeline
}: PreprocessingSandboxProps) {
  const [selectedInspectRow, setSelectedInspectRow] = useState<number>(1); // Index 1 as standard clear sample

  const updateConfig = (key: keyof PreprocessConfig, val: any) => {
    onConfigChange({
      ...config,
      [key]: val
    });
  };

  // Grab the specific original vs processed row for comparison
  const inspectionRowComparison = useMemo(() => {
    if (!processedData || !processedData.originalRecords || processedData.originalRecords.length <= selectedInspectRow) {
      return null;
    }

    const original = processedData.originalRecords[selectedInspectRow];
    const processedVec = processedData.allX[selectedInspectRow];
    const label = processedData.allY[selectedInspectRow];

    return {
      original,
      processedVec,
      label
    };
  }, [processedData, selectedInspectRow]);

  return (
    <div className="space-y-6" id="preprocessing-sandbox-root">
      
      {/* Parameters & Control Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Interactive Preprocessing Knobs */}
        <div className="lg:col-span-2 bg-slate-950 border border-slate-800 rounded-xl p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-white text-base">Pipeline Controls</h3>
              <p className="text-slate-500 text-xs">Configure the hyper-parameters of data extraction and cleaning</p>
            </div>

            <button
              onClick={onExecutePipeline}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 active:scale-95 transition-all"
              id="btn-run-preprocessing"
            >
              <RefreshCw className="w-3.5 h-3.5 animate-spin-hover" />
              Fit & Transform Data
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Numeric Imputer */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300">
                Numerical Missing Value Imputation
              </label>
              <select
                value={config.numericImputation}
                onChange={e => updateConfig("numericImputation", e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg text-slate-200 text-xs p-2.5 focus:outline-none focus:border-indigo-500"
              >
                <option value="mean">Mean (Fill with column average)</option>
                <option value="median">Median (Fill with absolute middle value)</option>
                <option value="mode">Mode (Fill with most frequent occurrence)</option>
                <option value="zero">Zero Imputation (Fill with constant 0)</option>
              </select>
              <p className="text-[11px] text-slate-500">
                Fills missing entries in continuous features like LoanAmount and ApplicantIncome.
              </p>
            </div>

            {/* Categorical Imputer */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300">
                Categorical Missing Value Imputation
              </label>
              <select
                value={config.categoricalImputation}
                onChange={e => updateConfig("categoricalImputation", e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg text-slate-200 text-xs p-2.5 focus:outline-none focus:border-indigo-500"
              >
                <option value="mode">Mode Imputation (Fill with dominant category)</option>
                <option value="missing_label">Label Imputation (Fill with "Missing" string)</option>
                <option value="drop">Drop Rows (Discard records with incomplete entries)</option>
              </select>
              <p className="text-[11px] text-slate-500">
                Fills missing items in categorical fields like Gender and Married.
              </p>
            </div>

            {/* Categorical Encoder */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300">
                Categorical Variable Encoding
              </label>
              <select
                value={config.encodingType}
                onChange={e => updateConfig("encodingType", e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg text-slate-200 text-xs p-2.5 focus:outline-none focus:border-indigo-500"
              >
                <option value="label">Label Encoding (Ordinal indices: 0, 1, 2, ...)</option>
                <option value="one_hot">One-Hot Encoding (Binary vector columns: [1, 0], [0, 1])</option>
              </select>
              <p className="text-[11px] text-slate-500 font-medium">
                Label Encoding is compact. One-Hot Encoding prevents ordinal ordering errors in models like KNN.
              </p>
            </div>

            {/* Feature Scaling (Standardization) */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300">
                Continuous Feature Scaling (Standardization)
              </label>
              <div className="flex items-center gap-4 py-2.5">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.scaling}
                    onChange={e => updateConfig("scaling", e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-300 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                  <span className="ml-3 text-xs text-slate-300">Enable Z-Score Scaling</span>
                </label>
              </div>
              <p className="text-[11px] text-slate-500">
                Transforms values: <code className="text-indigo-400 bg-slate-900 px-1 py-0.5 rounded font-mono">(x - μ) / σ</code> to prevent larger numbers from dominating classifier distance metrics.
              </p>
            </div>
          </div>

          {/* Train-Test Split Ratio */}
          <div className="border-t border-slate-800/80 pt-5 space-y-3">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-300">Train / Test Split Ratio</span>
              <span className="text-indigo-400 font-mono">
                Train: {(config.trainTestRatio * 100).toFixed(0)}% / Test: {((1 - config.trainTestRatio) * 100).toFixed(0)}%
              </span>
            </div>
            
            <input
              type="range"
              min="0.5"
              max="0.9"
              step="0.05"
              value={config.trainTestRatio}
              onChange={e => updateConfig("trainTestRatio", parseFloat(e.target.value))}
              className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>0.5 (Equal split)</span>
              <span>0.8 (Standard optimal partition)</span>
              <span>0.9 (Low evaluation set)</span>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Pipeline Status */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <h4 className="font-bold text-white text-sm flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              Pipeline Matrix Status
            </h4>

            <div className="space-y-3 pt-2 text-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span>Active Columns:</span>
                <span className="text-white font-mono font-bold">{processedData.headers.length}</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Training Matrix (trainX):</span>
                <span className="text-indigo-300 font-mono font-bold">
                  [{processedData.trainX.length}, {processedData.headers.length}]
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Testing Matrix (testX):</span>
                <span className="text-teal-300 font-mono font-bold">
                  [{processedData.testX.length}, {processedData.headers.length}]
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Total Samples:</span>
                <span className="text-white font-mono font-bold">
                  {processedData.allX.length} Rows
                </span>
              </div>
            </div>
          </div>

          <div className="p-3.5 bg-indigo-950/20 border border-indigo-800/40 rounded-xl space-y-1.5">
            <div className="text-[11px] font-bold text-indigo-400 flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" />
              PIPELINE SYNCHRONIZED
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Your modifications are actively re-mapping variables. Any model trained in the Classifier Arena tab will immediately run on these generated mathematical tensors.
            </p>
          </div>
        </div>

      </div>

      {/* Row Vector Transformation Visualizer */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-6">
        <div className="flex flex-wrap gap-4 items-center justify-between mb-5">
          <div>
            <h4 className="font-bold text-white text-base">Mathematical Vector Inspection</h4>
            <p className="text-slate-500 text-xs">Trace how a textual record is converted into clean float numbers</p>
          </div>

          {/* Row Picker */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Inspect Applicant:</span>
            <select
              value={selectedInspectRow}
              onChange={e => setSelectedInspectRow(Number(e.target.value))}
              className="bg-slate-900 border border-slate-800 rounded-lg text-slate-300 text-xs px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
            >
              {processedData.originalRecords.map((r, idx) => (
                <option key={r.Loan_ID} value={idx}>
                  {r.Loan_ID} ({idx === 0 ? "First sample" : `Index ${idx}`})
                </option>
              ))}
            </select>
          </div>
        </div>

        {inspectionRowComparison ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
            
            {/* Input Row View */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-3">
              <h5 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                1. Input Data Record (Textual & Categorical)
              </h5>
              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-950 p-4 rounded-xl border border-slate-800/50">
                <div>
                  <span className="text-slate-500 text-[10px] block uppercase font-mono">Loan ID</span>
                  <span className="text-slate-200 font-mono font-semibold">{inspectionRowComparison.original.Loan_ID}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block uppercase font-mono">Gender / Married</span>
                  <span className="text-slate-200 font-semibold">
                    {inspectionRowComparison.original.Gender || "Missing"} / {inspectionRowComparison.original.Married || "Missing"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block uppercase font-mono">Education level</span>
                  <span className="text-slate-200 font-semibold">{inspectionRowComparison.original.Education}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block uppercase font-mono">Self Employed</span>
                  <span className="text-slate-200 font-semibold">{inspectionRowComparison.original.Self_Employed || "Missing"}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block uppercase font-mono">Applicant Income</span>
                  <span className="text-white font-mono font-bold">${inspectionRowComparison.original.ApplicantIncome?.toLocaleString() || "Missing"}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block uppercase font-mono">Credit History</span>
                  <span className="text-white font-mono font-bold">
                    {inspectionRowComparison.original.Credit_History !== null ? inspectionRowComparison.original.Credit_History.toFixed(1) : "Missing"}
                  </span>
                </div>
              </div>
            </div>

            {/* Transform Arrow */}
            <div className="hidden lg:flex items-center justify-center absolute left-1/2 -translate-x-1/2 pointer-events-none">
              <div className="w-10 h-10 rounded-full bg-indigo-600 border border-indigo-400 flex items-center justify-center text-white shadow-xl">
                <ArrowRight className="w-5 h-5" />
              </div>
            </div>

            {/* Output Matrix Vector */}
            <div className="bg-indigo-950/10 border border-indigo-800/20 rounded-xl p-5 space-y-3">
              <h5 className="text-xs font-bold text-teal-400 uppercase tracking-wider">
                2. Output Preprocessed Tensor (Scaled Vector X)
              </h5>
              
              <div className="space-y-2 bg-slate-950 p-4 rounded-xl border border-slate-800/80 font-mono text-[11px]">
                <div className="text-slate-500 font-semibold uppercase tracking-wider text-[9px] border-b border-slate-800 pb-1 mb-2 flex justify-between">
                  <span>Feature Header</span>
                  <span>Encoded Float Value</span>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1">
                  {processedData.headers.map((h, cIdx) => (
                    <div key={h} className="flex justify-between items-center text-slate-300">
                      <span>{h}</span>
                      <span className="text-teal-300 font-bold font-mono">
                        {inspectionRowComparison.processedVec[cIdx]?.toFixed(4)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        ) : (
          <p className="text-slate-500 text-center py-4">Selecting valid inspect index...</p>
        )}
      </div>

      {/* Preprocessing Educational Banner */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-start gap-3">
        <HelpCircle className="w-5 h-5 text-indigo-400 mt-0.5 shrink-0" />
        <div className="text-xs text-slate-400 leading-relaxed">
          <p className="font-semibold text-slate-200 mb-1">💡 Machine Learning Preprocessing Concepts</p>
          Standard classification algorithms cannot digest text labels like <code className="text-teal-400 font-mono bg-slate-950 px-1 rounded">"Graduate"</code> or handle empty slots directly. Ordinal encoding maps text to sequential numbers (0, 1), whereas <span className="text-white font-semibold">One-Hot encoding</span> prevents numerical hierarchy issues by isolating classes into unique columns. Standardization shifts continuous curves so the mean is zero and variance is 1, which guarantees that high ApplicantIncomes don't overshadow shorter features.
        </div>
      </div>

    </div>
  );
}
