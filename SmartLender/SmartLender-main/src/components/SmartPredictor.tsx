import { useState } from "react";
import { PredictionInput, LoanRecord, MetricSet, PreprocessConfig } from "../types";
import { Users, Sparkles, CheckCircle, XCircle, FileText, Download, HelpCircle, Loader2 } from "lucide-react";
import { PreprocessedData, preprocessSingleInput } from "../utils/mlEngine";

interface SmartPredictorProps {
  processedData: PreprocessedData;
  activeModelKey: string;
  activeModelName: string;
  activeModelInstance: any; // DT, RF, KNN or GB
  config: PreprocessConfig;
  metrics: MetricSet | null;
}

// Student Personas
const presets = [
  {
    name: "The High-Income Graduate",
    icon: "🎓",
    description: "Stable professional profile, clear credit score, low debt ratio.",
    data: {
      Gender: "Male",
      Married: "Yes",
      Dependents: "1",
      Education: "Graduate",
      Self_Employed: "No",
      ApplicantIncome: 6500,
      CoapplicantIncome: 2000,
      LoanAmount: 130,
      Loan_Amount_Term: 360,
      Credit_History: 1,
      Property_Area: "Semiurban"
    }
  },
  {
    name: "Wealthy Entrepreneur (No Credit)",
    icon: "💼",
    description: "High cashflow but has no credit history. Often strictly rejected by default rules.",
    data: {
      Gender: "Male",
      Married: "No",
      Dependents: "0",
      Education: "Graduate",
      Self_Employed: "Yes",
      ApplicantIncome: 14500,
      CoapplicantIncome: 0,
      LoanAmount: 280,
      Loan_Amount_Term: 360,
      Credit_History: 0,
      Property_Area: "Urban"
    }
  },
  {
    name: "Low-Income/High-Debt Profile",
    icon: "⚠️",
    description: "Low monthly wage asking for a massive loan, stretching limits.",
    data: {
      Gender: "Female",
      Married: "No",
      Dependents: "2",
      Education: "Not Graduate",
      Self_Employed: "No",
      ApplicantIncome: 2100,
      CoapplicantIncome: 0,
      LoanAmount: 190,
      Loan_Amount_Term: 360,
      Credit_History: 1,
      Property_Area: "Rural"
    }
  },
  {
    name: "Stable Middle Class",
    icon: "🏡",
    description: "Average stable profile seeking a modest suburban mortgage.",
    data: {
      Gender: "Female",
      Married: "Yes",
      Dependents: "0",
      Education: "Graduate",
      Self_Employed: "No",
      ApplicantIncome: 4100,
      CoapplicantIncome: 1500,
      LoanAmount: 110,
      Loan_Amount_Term: 360,
      Credit_History: 1,
      Property_Area: "Semiurban"
    }
  }
];

export default function SmartPredictor({
  processedData,
  activeModelKey,
  activeModelName,
  activeModelInstance,
  config,
  metrics
}: SmartPredictorProps) {
  // Setup default state
  const [formData, setFormData] = useState<PredictionInput>({
    Gender: "Male",
    Married: "Yes",
    Dependents: "0",
    Education: "Graduate",
    Self_Employed: "No",
    ApplicantIncome: 5000,
    CoapplicantIncome: 1500,
    LoanAmount: 120,
    Loan_Amount_Term: 360,
    Credit_History: 1,
    Property_Area: "Semiurban"
  });

  const [predictionResult, setPredictionResult] = useState<"Y" | "N" | null>(null);
  const [explanationText, setExplanationText] = useState<string>("");
  const [isExplaining, setIsExplaining] = useState<boolean>(false);

  const applyPreset = (presetData: PredictionInput) => {
    setFormData(presetData);
    setPredictionResult(null);
    setExplanationText("");
  };

  const handleInputChange = (field: keyof PredictionInput, value: any) => {
    setFormData({
      ...formData,
      [field]: value
    });
    setPredictionResult(null);
    setExplanationText("");
  };

  const handlePredict = () => {
    if (!activeModelInstance) return;

    // Convert formData to standard LoanRecord structure for processing
    const record: LoanRecord = {
      Loan_ID: "LP_TEMP",
      Gender: formData.Gender,
      Married: formData.Married,
      Dependents: formData.Dependents,
      Education: formData.Education,
      Self_Employed: formData.Self_Employed,
      ApplicantIncome: formData.ApplicantIncome,
      CoapplicantIncome: formData.CoapplicantIncome,
      LoanAmount: formData.LoanAmount,
      Loan_Amount_Term: formData.Loan_Amount_Term,
      Credit_History: formData.Credit_History,
      Property_Area: formData.Property_Area,
      Loan_Status: "Y" // Placeholder
    };

    // Preprocess single input row based on parent stats
    const processedVector = preprocessSingleInput(
      record,
      processedData.headers,
      config,
      processedData
    );

    // Predict using selected model
    let outputY = 1;
    if (typeof activeModelInstance.predictRow === "function") {
      outputY = activeModelInstance.predictRow(processedVector);
    } else {
      // Fallback batch predict
      const batch = activeModelInstance.predict([processedVector]);
      outputY = batch[0] ?? 1;
    }

    setPredictionResult(outputY === 1 ? "Y" : "N");
    setExplanationText("");
  };

  const fetchAIExplanation = async () => {
    setIsExplaining(true);
    try {
      const response = await fetch("/api/gemini/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicantData: formData,
          decision: predictionResult,
          confidence: 0.85, // Simulation metric
          modelName: activeModelName,
          metrics: metrics
        })
      });
      const data = await response.json();
      if (data.explanation) {
        setExplanationText(data.explanation);
      } else {
        setExplanationText("Failed to retrieve report explanation.");
      }
    } catch (err: any) {
      console.error(err);
      setExplanationText("Network or server API Error occurred while explaining prediction.");
    } finally {
      setIsExplaining(false);
    }
  };

  return (
    <div className="space-y-6" id="smart-predictor-root">
      
      {/* Persona Presets */}
      <div className="space-y-3">
        <div className="flex items-center gap-1.5">
          <Users className="w-4 h-4 text-indigo-400" />
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Load Student Persona Presets</h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {presets.map(p => (
            <button
              key={p.name}
              onClick={() => applyPreset(p.data)}
              className="bg-slate-900/60 hover:bg-slate-900 border border-slate-800 rounded-xl p-3 text-left transition-all hover:border-slate-700 active:scale-95 group focus:outline-none"
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">{p.icon}</span>
                <span className="text-xs font-bold text-white group-hover:text-indigo-400 transition-colors truncate">
                  {p.name}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                {p.description}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Main Form + Prediction Result Display */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Input Form (2 columns) */}
        <div className="lg:col-span-2 bg-slate-950 border border-slate-800 rounded-xl p-6 space-y-6">
          <div>
            <h3 className="font-bold text-white text-base">Applicant Metrics Questionnaire</h3>
            <p className="text-slate-500 text-xs mt-0.5">Edit credit properties to run prediction simulations on {activeModelName}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* Gender */}
            <div className="space-y-1">
              <label className="text-slate-400 font-semibold">Applicant Gender</label>
              <select
                value={formData.Gender}
                onChange={e => handleInputChange("Gender", e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="">Missing (NaN)</option>
              </select>
            </div>

            {/* Married */}
            <div className="space-y-1">
              <label className="text-slate-400 font-semibold">Married Status</label>
              <select
                value={formData.Married}
                onChange={e => handleInputChange("Married", e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="Yes">Yes</option>
                <option value="No">No</option>
                <option value="">Missing (NaN)</option>
              </select>
            </div>

            {/* Dependents */}
            <div className="space-y-1">
              <label className="text-slate-400 font-semibold">Dependents Count</label>
              <select
                value={formData.Dependents}
                onChange={e => handleInputChange("Dependents", e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="0">None (0)</option>
                <option value="1">1 Dependent</option>
                <option value="2">2 Dependents</option>
                <option value="3+">3 or More (3+)</option>
                <option value="">Missing (NaN)</option>
              </select>
            </div>

            {/* Education */}
            <div className="space-y-1">
              <label className="text-slate-400 font-semibold">Education Level</label>
              <select
                value={formData.Education}
                onChange={e => handleInputChange("Education", e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="Graduate">Graduate (University)</option>
                <option value="Not Graduate">Not Graduate</option>
              </select>
            </div>

            {/* Self Employed */}
            <div className="space-y-1">
              <label className="text-slate-400 font-semibold">Self Employed</label>
              <select
                value={formData.Self_Employed}
                onChange={e => handleInputChange("Self_Employed", e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="No">No (Salaried Employee)</option>
                <option value="Yes">Yes (Freelance/Business)</option>
                <option value="">Missing (NaN)</option>
              </select>
            </div>

            {/* Credit History */}
            <div className="space-y-1">
              <label className="text-slate-400 font-semibold">Credit History Score</label>
              <select
                value={formData.Credit_History}
                onChange={e => handleInputChange("Credit_History", Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value={1}>Clear (1.0)</option>
                <option value={0}>Poor/Default (0.0)</option>
                <option value={-1}>Missing (NaN)</option>
              </select>
            </div>

            {/* Applicant Income */}
            <div className="space-y-1">
              <label className="text-slate-400 font-semibold">Applicant Income ($/mo)</label>
              <input
                type="number"
                min="0"
                value={formData.ApplicantIncome}
                onChange={e => handleInputChange("ApplicantIncome", Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            {/* Coapplicant Income */}
            <div className="space-y-1">
              <label className="text-slate-400 font-semibold">Coapplicant Income ($/mo)</label>
              <input
                type="number"
                min="0"
                value={formData.CoapplicantIncome}
                onChange={e => handleInputChange("CoapplicantIncome", Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            {/* Loan Amount */}
            <div className="space-y-1">
              <label className="text-slate-400 font-semibold">Loan Amount ($ in thousands)</label>
              <input
                type="number"
                min="0"
                value={formData.LoanAmount}
                onChange={e => handleInputChange("LoanAmount", Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            {/* Loan Term */}
            <div className="space-y-1">
              <label className="text-slate-400 font-semibold">Loan Term (Days)</label>
              <select
                value={formData.Loan_Amount_Term}
                onChange={e => handleInputChange("Loan_Amount_Term", Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
              >
                <option value={360}>360 Days (Standard 1 Year)</option>
                <option value={180}>180 Days (6 Months)</option>
                <option value={120}>120 Days (4 Months)</option>
                <option value={60}>60 Days (Short term)</option>
              </select>
            </div>

            {/* Property Area */}
            <div className="space-y-1">
              <label className="text-slate-400 font-semibold">Property Area Type</label>
              <select
                value={formData.Property_Area}
                onChange={e => handleInputChange("Property_Area", e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="Urban">Urban City Core</option>
                <option value="Semiurban">Semiurban Suburbs</option>
                <option value="Rural">Rural Countryside</option>
              </select>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={handlePredict}
              className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold py-3 rounded-lg text-xs shadow-xl active:scale-95 transition-all"
              id="btn-run-prediction"
            >
              Generate Prediction Analysis
            </button>
          </div>
        </div>

        {/* Right: Real-time Output Deck (1 column) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-4">
          
          <div className="space-y-4">
            <h4 className="font-bold text-white text-sm">Classification Result</h4>
            <p className="text-slate-400 text-xs">Prediction processed on {activeModelName}</p>

            {predictionResult !== null ? (
              <div
                className={`p-5 rounded-xl border flex flex-col items-center justify-center text-center space-y-3 transition-all duration-500 animate-fade-in ${
                  predictionResult === "Y"
                    ? "bg-emerald-950/20 border-emerald-800/40 text-emerald-400"
                    : "bg-rose-950/20 border-rose-800/40 text-rose-400"
                }`}
                id="prediction-result-box"
              >
                {predictionResult === "Y" ? (
                  <>
                    <CheckCircle className="w-12 h-12 text-emerald-400 animate-bounce-slow" />
                    <div>
                      <span className="text-xl font-black block tracking-wider uppercase">LOAN APPROVED</span>
                      <span className="text-[10px] text-slate-400 mt-1 block">Low Risk. Strong credit factors.</span>
                    </div>
                  </>
                ) : (
                  <>
                    <XCircle className="w-12 h-12 text-rose-400 animate-pulse-slow" />
                    <div>
                      <span className="text-xl font-black block tracking-wider uppercase font-mono">LOAN REJECTED</span>
                      <span className="text-[10px] text-slate-400 mt-1 block">High risk criteria flags triggered.</span>
                    </div>
                  </>
                )}

                {/* Score Confidence simulation indicator */}
                <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden mt-2">
                  <div className={`h-full ${predictionResult === "Y" ? "bg-emerald-500" : "bg-rose-500"}`} style={{ width: "85%" }}></div>
                </div>
              </div>
            ) : (
              <div className="border border-dashed border-slate-800 rounded-xl p-8 text-center text-slate-500 text-xs">
                Fill out the questionnaire left or choose a preset, then click Predict above to observe classifier inference.
              </div>
            )}
          </div>

          {predictionResult !== null && (
            <button
              onClick={fetchAIExplanation}
              disabled={isExplaining}
              className="w-full bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-indigo-400 hover:text-indigo-300 font-bold py-2.5 rounded-lg text-xs shadow transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
              id="btn-gemini-explain"
            >
              {isExplaining ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                  Generating Report...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  Explain Decision with AI
                </>
              )}
            </button>
          )}

        </div>

      </div>

      {/* Gemini Explanation Markdown Viewer */}
      {explanationText && (
        <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl animate-fade-in" id="gemini-explanation-report">
          <div className="p-4 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
            <h4 className="font-bold text-white text-sm flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-400" />
              Smart Lender AI Risk Analysis Report
            </h4>

            <button
              onClick={() => {
                const el = document.createElement("a");
                const file = new Blob([explanationText], { type: "text/plain" });
                el.href = URL.createObjectURL(file);
                el.download = `SmartLender_Analysis_${formData.ApplicantIncome}.txt`;
                el.click();
              }}
              className="bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white text-[10px] font-bold px-2.5 py-1.5 rounded border border-slate-800 hover:border-slate-700 flex items-center gap-1.5 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              Download Report
            </button>
          </div>

          <div className="p-6 text-xs text-slate-300 leading-relaxed max-h-96 overflow-y-auto font-sans prose prose-invert select-text space-y-4">
            {explanationText.split("\n").map((line, idx) => {
              if (line.startsWith("### ")) {
                return <h4 key={idx} className="text-sm font-bold text-white border-b border-slate-800 pb-1.5 mt-4">{line.replace("### ", "")}</h4>;
              }
              if (line.startsWith("#### ")) {
                return <h5 key={idx} className="text-xs font-bold text-indigo-400 mt-2">{line.replace("#### ", "")}</h5>;
              }
              if (line.startsWith("**")) {
                return <p key={idx} className="text-slate-200 mt-1">{line}</p>;
              }
              if (line.startsWith("- ")) {
                return <li key={idx} className="ml-4 list-disc text-slate-300">{line.replace("- ", "")}</li>;
              }
              return <p key={idx} className="text-slate-400">{line}</p>;
            })}
          </div>
        </div>
      )}

      {/* Simple tip */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-start gap-3">
        <HelpCircle className="w-5 h-5 text-indigo-400 mt-0.5 shrink-0" />
        <div className="text-xs text-slate-400 leading-relaxed">
          <p className="font-semibold text-slate-200 mb-1">💡 Real-World Scenario: Testing the Credit History Bias</p>
          Load the <strong className="text-indigo-400">Wealthy Entrepreneur (No Credit) preset</strong> and press predict. Notice how despite their high income ($14,500/mo), standard mathematical models reject them because of <code className="text-rose-400 bg-slate-950 px-1 rounded">Credit_History = 0.0</code>. Click "Explain Decision with AI" to read Gemini's financial critique of this classic modeling constraint.
        </div>
      </div>

    </div>
  );
}
