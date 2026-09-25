import { useState, useMemo } from "react";
import { LoanRecord } from "../types";
import { Search, Filter, AlertTriangle, Database, HelpCircle } from "lucide-react";

interface DatasetExplorerProps {
  dataset: LoanRecord[];
}

export default function DatasetExplorer({ dataset }: DatasetExplorerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "Y" | "N">("ALL");
  const [missingFilter, setMissingFilter] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  // Calculate high-level metrics
  const stats = useMemo(() => {
    const total = dataset.length;
    let missingCells = 0;
    let approved = 0;
    let totalIncome = 0;
    let validIncomeCount = 0;

    dataset.forEach(r => {
      if (r.Loan_Status === "Y") approved++;
      if (r.ApplicantIncome !== null) {
        totalIncome += r.ApplicantIncome;
        validIncomeCount++;
      }
      
      // Count missing categorical or numerical fields
      if (!r.Gender) missingCells++;
      if (!r.Married) missingCells++;
      if (!r.Dependents) missingCells++;
      if (!r.Self_Employed) missingCells++;
      if (r.ApplicantIncome === null) missingCells++;
      if (r.LoanAmount === null) missingCells++;
      if (r.Loan_Amount_Term === null) missingCells++;
      if (r.Credit_History === null) missingCells++;
    });

    return {
      total,
      approvedRate: total > 0 ? (approved / total) * 100 : 0,
      avgIncome: validIncomeCount > 0 ? totalIncome / validIncomeCount : 0,
      missingCells,
    };
  }, [dataset]);

  // Filter dataset
  const filteredDataset = useMemo(() => {
    return dataset.filter(r => {
      const matchesSearch = 
        r.Loan_ID.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.Education.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.Property_Area.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === "ALL" || r.Loan_Status === statusFilter;

      const hasMissing = 
        !r.Gender || !r.Married || !r.Dependents || !r.Self_Employed ||
        r.ApplicantIncome === null || r.LoanAmount === null || 
        r.Loan_Amount_Term === null || r.Credit_History === null;

      const matchesMissing = !missingFilter || hasMissing;

      return matchesSearch && matchesStatus && matchesMissing;
    });
  }, [dataset, searchTerm, statusFilter, missingFilter]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredDataset.length / rowsPerPage));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredDataset.slice(start, start + rowsPerPage);
  }, [filteredDataset, currentPage]);

  const goToPage = (p: number) => {
    if (p >= 1 && p <= totalPages) {
      setCurrentPage(p);
    }
  };

  return (
    <div className="space-y-6" id="dataset-explorer-root">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5" id="metric-total-rows">
          <div className="text-slate-400 text-sm font-medium flex items-center gap-2">
            <Database className="w-4 h-4 text-indigo-400" />
            Total Dataset Size
          </div>
          <div className="text-3xl font-bold text-white mt-1">{stats.total} Rows</div>
          <p className="text-slate-500 text-xs mt-1">Authentic loan applications</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5" id="metric-approval-rate">
          <div className="text-slate-400 text-sm font-medium flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            Overall Approval Rate
          </div>
          <div className="text-3xl font-bold text-emerald-400 mt-1">
            {stats.approvedRate.toFixed(1)}%
          </div>
          <p className="text-slate-500 text-xs mt-1">Class distribution bias (Y / N)</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5" id="metric-avg-income">
          <div className="text-slate-400 text-sm font-medium flex items-center gap-2">
            <span className="text-indigo-400 font-bold text-xs">$</span>
            Mean Applicant Income
          </div>
          <div className="text-3xl font-bold text-white mt-1">
            ${Math.round(stats.avgIncome).toLocaleString()}/mo
          </div>
          <p className="text-slate-500 text-xs mt-1">Average monthly wage</p>
        </div>

        <div className="bg-slate-900 border border-yellow-800/40 rounded-xl p-5 bg-yellow-950/10" id="metric-missing-cells">
          <div className="text-slate-400 text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
            Missing Data Points
          </div>
          <div className="text-3xl font-bold text-yellow-400 mt-1">{stats.missingCells} Values</div>
          <p className="text-slate-500 text-xs mt-1">Requires imputation cleaning</p>
        </div>
      </div>

      {/* Interactive Controls & Table */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 bg-slate-900/40 flex flex-wrap gap-4 items-center justify-between">
          <h3 className="font-semibold text-white flex items-center gap-2 text-base">
            <span>Raw Dataset Registry</span>
            <span className="text-xs font-normal text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
              Showing {filteredDataset.length} of {dataset.length} records
            </span>
          </h3>

          <div className="flex flex-wrap gap-3 items-center">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search Loan ID, Area..."
                value={searchTerm}
                onChange={e => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-slate-900 border border-slate-800 rounded-lg text-slate-300 text-xs pl-9 pr-3 py-1.5 focus:outline-none focus:border-indigo-500 w-44 transition-all"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={e => {
                setStatusFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="bg-slate-900 border border-slate-800 rounded-lg text-slate-300 text-xs px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 transition-all"
            >
              <option value="ALL">All Statuses</option>
              <option value="Y">Approved Only (Y)</option>
              <option value="N">Rejected Only (N)</option>
            </select>

            {/* Filter Missing */}
            <button
              onClick={() => {
                setMissingFilter(!missingFilter);
                setCurrentPage(1);
              }}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 ${
                missingFilter
                  ? "bg-yellow-950/30 text-yellow-400 border-yellow-700/50"
                  : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              {missingFilter ? "Filtering Missing" : "Show Missing Only"}
            </button>
          </div>
        </div>

        {/* Data Grid Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-xs font-semibold bg-slate-900/60">
                <th className="p-3.5">Loan ID</th>
                <th className="p-3.5">Gender</th>
                <th className="p-3.5">Married</th>
                <th className="p-3.5">Dependents</th>
                <th className="p-3.5">Education</th>
                <th className="p-3.5">Self Employed</th>
                <th className="p-3.5 text-right">Applicant Income</th>
                <th className="p-3.5 text-right">Co-Applicant</th>
                <th className="p-3.5 text-right">Amount ($k)</th>
                <th className="p-3.5 text-center">Credit History</th>
                <th className="p-3.5">Property Area</th>
                <th className="p-3.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="text-slate-300 text-xs divide-y divide-slate-800/55">
              {paginatedData.length > 0 ? (
                paginatedData.map(r => (
                  <tr key={r.Loan_ID} className="hover:bg-slate-900/30 transition-colors">
                    <td className="p-3.5 font-mono text-slate-400">{r.Loan_ID}</td>
                    
                    {/* Gender */}
                    <td className="p-3.5">
                      {r.Gender ? (
                        r.Gender
                      ) : (
                        <span className="text-yellow-500 font-semibold bg-yellow-500/10 px-1.5 py-0.5 rounded text-[10px]">
                          NaN
                        </span>
                      )}
                    </td>

                    {/* Married */}
                    <td className="p-3.5">
                      {r.Married ? (
                        r.Married
                      ) : (
                        <span className="text-yellow-500 font-semibold bg-yellow-500/10 px-1.5 py-0.5 rounded text-[10px]">
                          NaN
                        </span>
                      )}
                    </td>

                    {/* Dependents */}
                    <td className="p-3.5">
                      {r.Dependents ? (
                        r.Dependents
                      ) : (
                        <span className="text-yellow-500 font-semibold bg-yellow-500/10 px-1.5 py-0.5 rounded text-[10px]">
                          NaN
                        </span>
                      )}
                    </td>

                    <td className="p-3.5">{r.Education}</td>

                    {/* Self Employed */}
                    <td className="p-3.5">
                      {r.Self_Employed ? (
                        r.Self_Employed
                      ) : (
                        <span className="text-yellow-500 font-semibold bg-yellow-500/10 px-1.5 py-0.5 rounded text-[10px]">
                          NaN
                        </span>
                      )}
                    </td>

                    {/* Income */}
                    <td className="p-3.5 text-right font-medium">
                      {r.ApplicantIncome !== null ? (
                        `$${r.ApplicantIncome.toLocaleString()}`
                      ) : (
                        <span className="text-yellow-500 font-semibold bg-yellow-500/10 px-1.5 py-0.5 rounded text-[10px]">
                          NaN
                        </span>
                      )}
                    </td>

                    {/* Coapplicant */}
                    <td className="p-3.5 text-right font-medium text-slate-400">
                      {r.CoapplicantIncome !== null ? (
                        `$${r.CoapplicantIncome.toLocaleString()}`
                      ) : (
                        <span className="text-yellow-500 font-semibold bg-yellow-500/10 px-1.5 py-0.5 rounded text-[10px]">
                          NaN
                        </span>
                      )}
                    </td>

                    {/* LoanAmount */}
                    <td className="p-3.5 text-right font-bold text-white">
                      {r.LoanAmount !== null ? (
                        `$${r.LoanAmount}k`
                      ) : (
                        <span className="text-yellow-500 font-semibold bg-yellow-500/10 px-1.5 py-0.5 rounded text-[10px]">
                          NaN
                        </span>
                      )}
                    </td>

                    {/* Credit History */}
                    <td className="p-3.5 text-center">
                      {r.Credit_History !== null ? (
                        <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                          r.Credit_History === 1 
                            ? "bg-emerald-500/10 text-emerald-400" 
                            : "bg-rose-500/10 text-rose-400"
                        }`}>
                          {r.Credit_History.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-yellow-500 font-semibold bg-yellow-500/10 px-1.5 py-0.5 rounded text-[10px]">
                          NaN
                        </span>
                      )}
                    </td>

                    <td className="p-3.5 text-slate-400">{r.Property_Area}</td>

                    {/* Loan Status */}
                    <td className="p-3.5 text-center">
                      <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold inline-block w-6 text-center ${
                        r.Loan_Status === "Y"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-rose-500/10 text-rose-400"
                      }`}>
                        {r.Loan_Status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={12} className="p-8 text-center text-slate-500">
                    No loan applications matching current filters found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {filteredDataset.length > 0 && (
          <div className="p-4 border-t border-slate-800 bg-slate-900/30 flex items-center justify-between text-xs text-slate-400">
            <div>
              Showing <span className="text-slate-200">{Math.min(filteredDataset.length, (currentPage - 1) * rowsPerPage + 1)}-{Math.min(filteredDataset.length, currentPage * rowsPerPage)}</span> of <span className="text-slate-200">{filteredDataset.length}</span> entries
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-2.5 py-1.5 rounded bg-slate-900 border border-slate-800 hover:text-white disabled:opacity-40 disabled:hover:text-slate-400 disabled:cursor-not-allowed font-medium transition-all"
              >
                Previous
              </button>
              
              <div className="flex items-center gap-1 font-mono text-xs">
                {Array.from({ length: totalPages }, (_, idx) => idx + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                  .map((p, idx, arr) => {
                    const prev = arr[idx - 1];
                    const showEllipsis = prev && p - prev > 1;

                    return (
                      <div key={p} className="flex items-center gap-1">
                        {showEllipsis && <span className="text-slate-600">...</span>}
                        <button
                          onClick={() => goToPage(p)}
                          className={`w-7 h-7 rounded flex items-center justify-center font-bold transition-all ${
                            currentPage === p
                              ? "bg-indigo-600 text-white"
                              : "bg-slate-900 border border-slate-800 hover:text-white"
                          }`}
                        >
                          {p}
                        </button>
                      </div>
                    );
                  })}
              </div>

              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1.5 rounded bg-slate-900 border border-slate-800 hover:text-white disabled:opacity-40 disabled:hover:text-slate-400 disabled:cursor-not-allowed font-medium transition-all"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Dataset Guidance Banner */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-start gap-3">
        <HelpCircle className="w-5 h-5 text-indigo-400 mt-0.5 shrink-0" />
        <div className="text-xs text-slate-400 leading-relaxed">
          <p className="font-semibold text-slate-200 mb-1">💡 Learning Tip: Understanding Loan Eligibility Features</p>
          This is the standard financial research dataset. Look closely at the records: applicants with no <span className="text-indigo-300 font-bold">Credit_History (0.0)</span> are almost universally rejected regardless of their high <span className="text-indigo-300 font-bold">ApplicantIncome</span>, simulating standard conservative risk modeling. In contrast, lower income applicants with clear credit history have high approval statistics.
        </div>
      </div>
    </div>
  );
}
