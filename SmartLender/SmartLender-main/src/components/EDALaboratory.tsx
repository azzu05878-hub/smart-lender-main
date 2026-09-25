import { useState, useMemo } from "react";
import { LoanRecord } from "../types";
import { BarChart3, TrendingUp, ScatterChart, HelpCircle } from "lucide-react";

interface EDALaboratoryProps {
  dataset: LoanRecord[];
}

export default function EDALaboratory({ dataset }: EDALaboratoryProps) {
  const [activeChartTab, setActiveChartTab] = useState<"count" | "dist" | "bivariate" | "scatter">("count");
  const [countFeature, setCountFeature] = useState<"Gender" | "Married" | "Education" | "Property_Area" | "Credit_History">("Credit_History");
  const [hoveredPoint, setHoveredPoint] = useState<LoanRecord | null>(null);

  // Helper: Categorical distributions
  const countChartData = useMemo(() => {
    const distribution: { [val: string]: number } = {};
    dataset.forEach(r => {
      const val = String(r[countFeature] ?? "Missing");
      const label = val === "" ? "Missing" : val;
      distribution[label] = (distribution[label] || 0) + 1;
    });

    return Object.entries(distribution).map(([category, count]) => ({
      category,
      count,
      pct: (count / dataset.length) * 100
    })).sort((a, b) => b.count - a.count);
  }, [dataset, countFeature]);

  // Helper: Numerical distribution for Applicant Income (bins of $2000)
  const incomeHistogramData = useMemo(() => {
    const validIncomes = dataset
      .map(r => r.ApplicantIncome)
      .filter((v): v is number => v !== null);

    const maxIncome = Math.max(...validIncomes, 15000);
    const binSize = 1500;
    const numBins = Math.min(10, Math.ceil(maxIncome / binSize));
    const bins = new Array(numBins).fill(0).map((_, i) => ({
      rangeStart: i * binSize,
      rangeEnd: (i + 1) * binSize,
      count: 0
    }));

    validIncomes.forEach(inc => {
      const binIdx = Math.min(numBins - 1, Math.floor(inc / binSize));
      if (binIdx >= 0) {
        bins[binIdx].count++;
      }
    });

    return bins;
  }, [dataset]);

  // Helper: Bivariate analysis (Credit History or Education vs Loan Status)
  const bivariateData = useMemo(() => {
    const segments = ["Graduate", "Not Graduate"];
    const results = segments.map(seg => {
      const segRows = dataset.filter(r => r.Education === seg);
      const approved = segRows.filter(r => r.Loan_Status === "Y").length;
      const rejected = segRows.length - approved;
      return {
        label: seg,
        approved,
        rejected,
        total: segRows.length
      };
    });

    const creditSegs = ["Credit History: Clear (1.0)", "Credit History: Poor (0.0)", "Credit History: Missing"];
    const creditResults = creditSegs.map((label, idx) => {
      const segRows = dataset.filter(r => {
        if (idx === 0) return r.Credit_History === 1;
        if (idx === 1) return r.Credit_History === 0;
        return r.Credit_History === null;
      });
      const approved = segRows.filter(r => r.Loan_Status === "Y").length;
      const rejected = segRows.length - approved;
      return {
        label,
        approved,
        rejected,
        total: segRows.length
      };
    });

    return { education: results, credit: creditResults };
  }, [dataset]);

  // Helper: Scatter Plot Data (ApplicantIncome vs LoanAmount)
  const scatterPoints = useMemo(() => {
    return dataset
      .filter(r => r.ApplicantIncome !== null && r.LoanAmount !== null)
      .map(r => ({
        ...r,
        x: r.ApplicantIncome as number,
        y: r.LoanAmount as number
      }));
  }, [dataset]);

  const maxScatterX = Math.max(...scatterPoints.map(p => p.x), 15000);
  const maxScatterY = Math.max(...scatterPoints.map(p => p.y), 400);

  return (
    <div className="space-y-6" id="eda-laboratory-root">
      {/* Chart Tabs */}
      <div className="flex border-b border-slate-800 gap-1">
        <button
          onClick={() => setActiveChartTab("count")}
          className={`px-4 py-2.5 text-sm font-semibold flex items-center gap-2 transition-all border-b-2 -mb-px ${
            activeChartTab === "count"
              ? "border-indigo-500 text-indigo-400 bg-slate-900/35"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Categorical Counts
        </button>

        <button
          onClick={() => setActiveChartTab("dist")}
          className={`px-4 py-2.5 text-sm font-semibold flex items-center gap-2 transition-all border-b-2 -mb-px ${
            activeChartTab === "dist"
              ? "border-indigo-500 text-indigo-400 bg-slate-900/35"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Income Distribution
        </button>

        <button
          onClick={() => setActiveChartTab("bivariate")}
          className={`px-4 py-2.5 text-sm font-semibold flex items-center gap-2 transition-all border-b-2 -mb-px ${
            activeChartTab === "bivariate"
              ? "border-indigo-500 text-indigo-400 bg-slate-900/35"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Decision Crosstabs
        </button>

        <button
          onClick={() => setActiveChartTab("scatter")}
          className={`px-4 py-2.5 text-sm font-semibold flex items-center gap-2 transition-all border-b-2 -mb-px ${
            activeChartTab === "scatter"
              ? "border-indigo-500 text-indigo-400 bg-slate-900/35"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <ScatterChart className="w-4 h-4" />
          Incomes vs. Loan Scatter
        </button>
      </div>

      {/* Workspace Display */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 shadow-2xl">
        
        {/* TAB 1: CATEGORICAL COUNT PLOT */}
        {activeChartTab === "count" && (
          <div className="space-y-6" id="chart-tab-categorical">
            <div className="flex flex-wrap gap-4 items-center justify-between">
              <div>
                <h4 className="font-bold text-white text-base">Univariate Value Counts Plot</h4>
                <p className="text-slate-500 text-xs mt-0.5">Visualize sample frequency distribution across classes</p>
              </div>

              {/* Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Target Feature:</span>
                <select
                  value={countFeature}
                  onChange={e => setCountFeature(e.target.value as any)}
                  className="bg-slate-900 border border-slate-800 rounded-lg text-slate-300 text-xs px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 transition-all"
                >
                  <option value="Credit_History">Credit History</option>
                  <option value="Education">Education</option>
                  <option value="Property_Area">Property Area</option>
                  <option value="Gender">Gender</option>
                  <option value="Married">Married Status</option>
                </select>
              </div>
            </div>

            {/* SVG Horizontal Bar Chart */}
            <div className="space-y-5">
              {countChartData.map((item, idx) => (
                <div key={item.category} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200">
                      {item.category === "1" ? "Clear Credit (1.0)" : item.category === "0" ? "Poor Credit (0.0)" : item.category === "Missing" ? "Missing (NaN)" : item.category}
                    </span>
                    <span className="text-slate-400 font-mono">
                      {item.count} samples ({item.pct.toFixed(1)}%)
                    </span>
                  </div>
                  
                  <div className="w-full bg-slate-900 h-6 rounded-full overflow-hidden border border-slate-800 flex">
                    <div
                      style={{ width: `${item.pct}%` }}
                      className={`h-full rounded-full transition-all duration-1000 ${
                        idx === 0 
                          ? "bg-gradient-to-r from-indigo-600 to-indigo-500" 
                          : idx === 1 
                          ? "bg-gradient-to-r from-teal-600 to-teal-500" 
                          : "bg-slate-700"
                      }`}
                    ></div>
                  </div>
                </div>
              ))}
            </div>

            {/* Micro statistical Insight */}
            <div className="bg-slate-900/40 rounded-lg p-3.5 border border-slate-800 text-xs text-slate-400">
              <span className="font-semibold text-white">Observations on {countFeature}:</span>
              {countFeature === "Credit_History" && " Around 80% of applicants in this dataset have a documented positive credit history. The remaining ~10% have poor credit history, with 10% having missing entries. This creates high predictive weight."}
              {countFeature === "Education" && " Highly biased toward Graduates (approx 78%). It creates a useful attribute to study if graduates get higher loans."}
              {countFeature === "Property_Area" && " Well balanced across Semiurban, Urban, and Rural property sizes, serving as an optimal categorical anchor."}
              {countFeature === "Gender" && " Significantly unbalanced toward Male applicants (~80%), a standard consideration in algorithmic bias discussions."}
              {countFeature === "Married" && " Majority of applicants (~65%) are married, suggesting higher co-applicant contributions."}
            </div>
          </div>
        )}

        {/* TAB 2: APPLICANT INCOME HISTOGRAM */}
        {activeChartTab === "dist" && (
          <div className="space-y-6" id="chart-tab-distribution">
            <div>
              <h4 className="font-bold text-white text-base">Applicant Income Distribution Plot</h4>
              <p className="text-slate-500 text-xs mt-0.5">Frequency histogram of applicants segmented into monthly income brackets</p>
            </div>

            {/* Vertical Bar Grid Chart */}
            <div className="h-64 border-b border-l border-slate-800 relative mt-6 flex items-end justify-between px-2">
              {/* Y-axis Guides */}
              <div className="absolute left-1 top-2 text-[10px] text-slate-500 font-mono">35 samples</div>
              <div className="absolute left-1 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 font-mono">18 samples</div>
              <div className="absolute left-1 bottom-2 text-[10px] text-slate-500 font-mono">0</div>

              {incomeHistogramData.map((bin, idx) => {
                // Calculate height percentage relative to a max count of 35
                const heightPct = Math.min(100, (bin.count / 35) * 100);

                return (
                  <div key={idx} className="group relative flex-1 flex flex-col items-center mx-1">
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-2 bg-slate-900 border border-slate-700 text-[10px] text-white rounded px-2 py-1 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap text-center">
                      <span className="font-semibold block">${bin.rangeStart} - ${bin.rangeEnd}</span>
                      <span className="text-indigo-400 font-bold font-mono">{bin.count} applicants</span>
                    </div>

                    {/* Bar */}
                    <div
                      style={{ height: `${heightPct}%` }}
                      className="w-full bg-indigo-500/80 group-hover:bg-indigo-400 rounded-t border-t border-indigo-300/30 transition-all duration-700 flex items-end justify-center"
                    >
                      <span className="text-[10px] text-white font-bold mb-1 opacity-0 group-hover:opacity-100 transition-all font-mono">
                        {bin.count}
                      </span>
                    </div>

                    {/* Label */}
                    <div className="absolute top-full mt-2 text-[10px] text-slate-500 font-mono whitespace-nowrap rotate-12 origin-top-left md:rotate-0">
                      ${bin.rangeStart / 1000}k
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-4 flex justify-between items-center text-xs text-slate-500">
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-indigo-500 rounded"></span> Applicant Count</span>
              <span>Skewness: Highly positive / Right-tailed (typical of income statistics)</span>
            </div>
          </div>
        )}

        {/* TAB 3: BIVARIATE DECISION CROSSTABS */}
        {activeChartTab === "bivariate" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8" id="chart-tab-bivariate">
            
            {/* Credit History Crosstab */}
            <div className="space-y-4">
              <div>
                <h5 className="font-bold text-white text-sm">Credit History vs. Loan Eligibility</h5>
                <p className="text-slate-500 text-xs">Observe why models prioritize credit score records</p>
              </div>

              <div className="space-y-4 border border-slate-800 p-4 rounded-xl bg-slate-900/20">
                {bivariateData.credit.map(item => {
                  const approvedPct = item.total > 0 ? (item.approved / item.total) * 100 : 0;
                  const rejectedPct = item.total > 0 ? (item.rejected / item.total) * 100 : 0;

                  return (
                    <div key={item.label} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-300">{item.label}</span>
                        <span className="text-slate-400 font-mono text-[11px]">
                          Approved: {item.approved} ({approvedPct.toFixed(0)}%) / Rejected: {item.rejected}
                        </span>
                      </div>

                      <div className="w-full bg-slate-900 h-5 rounded overflow-hidden border border-slate-800 flex">
                        {item.approved > 0 && (
                          <div
                            style={{ width: `${approvedPct}%` }}
                            className="bg-emerald-500/80 h-full text-[10px] text-emerald-950 font-bold flex items-center justify-center"
                          >
                            {approvedPct > 15 && `Y`}
                          </div>
                        )}
                        {item.rejected > 0 && (
                          <div
                            style={{ width: `${rejectedPct}%` }}
                            className="bg-rose-500/80 h-full text-[10px] text-rose-950 font-bold flex items-center justify-center"
                          >
                            {rejectedPct > 15 && `N`}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Education level Crosstab */}
            <div className="space-y-4">
              <div>
                <h5 className="font-bold text-white text-sm">Education Level vs. Loan Eligibility</h5>
                <p className="text-slate-500 text-xs">Compare default rates between graduate profiles</p>
              </div>

              <div className="space-y-4 border border-slate-800 p-4 rounded-xl bg-slate-900/20">
                {bivariateData.education.map(item => {
                  const approvedPct = item.total > 0 ? (item.approved / item.total) * 100 : 0;
                  const rejectedPct = item.total > 0 ? (item.rejected / item.total) * 100 : 0;

                  return (
                    <div key={item.label} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-300">{item.label}</span>
                        <span className="text-slate-400 font-mono text-[11px]">
                          Approved: {item.approved} ({approvedPct.toFixed(0)}%) / Rejected: {item.rejected}
                        </span>
                      </div>

                      <div className="w-full bg-slate-900 h-5 rounded overflow-hidden border border-slate-800 flex">
                        {item.approved > 0 && (
                          <div
                            style={{ width: `${approvedPct}%` }}
                            className="bg-emerald-500/80 h-full text-[10px] text-emerald-950 font-bold flex items-center justify-center"
                          >
                            {approvedPct > 15 && `Y`}
                          </div>
                        )}
                        {item.rejected > 0 && (
                          <div
                            style={{ width: `${rejectedPct}%` }}
                            className="bg-rose-500/80 h-full text-[10px] text-rose-950 font-bold flex items-center justify-center"
                          >
                            {rejectedPct > 15 && `N`}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: SCATTER PLOT */}
        {activeChartTab === "scatter" && (
          <div className="space-y-6" id="chart-tab-scatter">
            <div className="flex flex-wrap gap-4 justify-between items-center">
              <div>
                <h4 className="font-bold text-white text-base">Applicant Income vs. Loan Amount</h4>
                <p className="text-slate-500 text-xs mt-0.5">Bivariate scatter comparison; hover over circles to inspect profiles</p>
              </div>

              <div className="flex items-center gap-4 text-xs font-semibold">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/40"></span> Approved (Y)</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-rose-500 shadow-sm shadow-rose-500/40"></span> Rejected (N)</span>
              </div>
            </div>

            <div className="relative">
              {/* Scatter Area Grid */}
              <div className="h-72 border-b border-l border-slate-800 relative mt-4">
                
                {/* Scatter Points Rendering */}
                {scatterPoints.map((pt, idx) => {
                  const leftPct = (pt.x / maxScatterX) * 100;
                  const bottomPct = (pt.y / maxScatterY) * 100;

                  return (
                    <button
                      key={idx}
                      onMouseEnter={() => setHoveredPoint(pt)}
                      onMouseLeave={() => setHoveredPoint(null)}
                      style={{
                        left: `${Math.min(96, Math.max(3, leftPct))}%`,
                        bottom: `${Math.min(94, Math.max(3, bottomPct))}%`
                      }}
                      className={`absolute -translate-x-1/2 translate-y-1/2 w-3.5 h-3.5 rounded-full border border-slate-900 transition-all duration-300 hover:scale-150 focus:outline-none focus:scale-150 ${
                        pt.Loan_Status === "Y"
                          ? "bg-emerald-500 hover:shadow-[0_0_12px_rgba(16,185,129,0.9)] bg-emerald-500"
                          : "bg-rose-500 hover:shadow-[0_0_12px_rgba(244,63,94,0.9)] bg-rose-500"
                      }`}
                    ></button>
                  );
                })}

                {/* Y-Axis Label */}
                <div className="absolute -left-12 top-1/2 -translate-y-1/2 -rotate-90 text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                  Loan Amt ($k)
                </div>
              </div>

              {/* X-Axis Label */}
              <div className="text-center text-[10px] text-slate-500 font-semibold uppercase tracking-wider mt-4">
                Applicant Monthly Income ($)
              </div>

              {/* Dynamic Interactive Tooltip Card */}
              <div className="min-h-16 mt-4 p-4 border border-slate-800 rounded-xl bg-slate-900/60 transition-all flex items-center justify-between text-xs">
                {hoveredPoint ? (
                  <>
                    <div className="space-y-0.5">
                      <div className="text-white font-semibold">
                        Applicant {hoveredPoint.Loan_ID} ({hoveredPoint.Gender || "N/A"}, {hoveredPoint.Education})
                      </div>
                      <div className="text-slate-400">
                        Income: <span className="text-white font-mono font-bold">${hoveredPoint.ApplicantIncome?.toLocaleString()}</span> | 
                        Loan Amt: <span className="text-white font-mono font-bold">${hoveredPoint.LoanAmount}k</span> | 
                        Coapplicant: <span className="text-slate-400 font-mono font-bold">${hoveredPoint.CoapplicantIncome || 0}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-slate-500 text-[10px] uppercase font-bold">Credit History</div>
                      <div className={`font-bold ${hoveredPoint.Credit_History === 1 ? "text-emerald-400" : "text-rose-400"}`}>
                        {hoveredPoint.Credit_History === 1 ? "Clear (1.0)" : hoveredPoint.Credit_History === 0 ? "Poor (0.0)" : "Missing"}
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-slate-500 italic text-center w-full">
                    💡 Hover over any data circle above to examine real applicant features.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
