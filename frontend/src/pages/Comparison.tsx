import React, { useEffect, useState } from 'react';
import {
  Columns3,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Download,
  Building2,
  FileCheck2,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { getBidders, compareBidders, exportCsvUrl, exportExcelUrl } from '../api/client';
import type { Bidder } from '../types';

interface ComparisonProps {
  tenderId: string;
}

export const Comparison: React.FC<ComparisonProps> = ({ tenderId }) => {
  const [bidders, setBidders] = useState<Bidder[]>([]);
  const [selectedBidderIds, setSelectedBidderIds] = useState<(string | number)[]>([]);
  const [comparisonResult, setComparisonResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!tenderId) return;
    getBidders(tenderId).then((data) => {
      setBidders(data || []);
      const ids = (data || []).map((b: any) => b.id);
      setSelectedBidderIds(ids);
    });
  }, [tenderId]);

  const fetchComparison = async () => {
    if (!tenderId || selectedBidderIds.length < 2) {
      setComparisonResult(null);
      return;
    }
    setLoading(true);
    try {
      const data = await compareBidders(tenderId, selectedBidderIds);
      setComparisonResult(data);
    } catch (err) {
      console.error('Failed to generate comparison:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComparison();
  }, [selectedBidderIds, tenderId]);

  const toggleBidderSelect = (id: string | number) => {
    setSelectedBidderIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const comparedBidders: any[] = comparisonResult?.bidders || [];
  const matrix: any[] = comparisonResult?.comparison_matrix || [];

  return (
    <div className="space-y-7 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 font-display flex items-center gap-2.5">
            <Columns3 className="w-6 h-6 text-indigo-400" />
            Comparative Bidder Evaluation Matrix
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Side-by-side technical evaluation, compliance verification, and vigilance risk analysis.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href={exportCsvUrl(tenderId)}
            target="_blank"
            rel="noreferrer"
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-xs rounded-xl transition inline-flex items-center gap-1.5 shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" /> CSV Export
          </a>
          <a
            href={exportExcelUrl(tenderId)}
            target="_blank"
            rel="noreferrer"
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs rounded-xl transition inline-flex items-center gap-1.5 shadow-lg shadow-emerald-600/20"
          >
            <Download className="w-3.5 h-3.5" /> Full Excel Audit
          </a>
        </div>
      </div>

      {/* Bidder Selection Filter Chips */}
      <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 space-y-2 shadow-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Select Participating Bidders to Compare ({selectedBidderIds.length} of {bidders.length}):
          </span>
          {selectedBidderIds.length < 2 && (
            <span className="text-xs text-amber-400 font-medium">Select at least 2 bidders</span>
          )}
        </div>
        <div className="flex flex-wrap gap-2.5 pt-1">
          {bidders.map((b) => {
            const isSelected = selectedBidderIds.includes(b.id);
            return (
              <button
                key={b.id}
                onClick={() => toggleBidderSelect(b.id)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all flex items-center gap-2 ${
                  isSelected
                    ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-200 shadow-sm'
                    : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-indigo-400' : 'bg-slate-600'}`}></span>
                <span>{b.company_name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400 bg-slate-900/50 rounded-2xl border border-slate-800">
          <span className="inline-block w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-2"></span>
          <p className="text-sm">Generating real-time multi-bidder comparison from database...</p>
        </div>
      ) : comparedBidders.length === 0 ? (
        <div className="p-12 text-center text-slate-400 bg-slate-900/50 rounded-2xl border border-slate-800">
          <p className="text-sm">Select at least 2 bidders above to view the comparative matrix.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary KPI Table */}
          <div className="bg-slate-900/90 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/50">
              <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                1. Executive Summary & Risk Standing
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300 border-collapse">
                <thead>
                  <tr className="bg-slate-950/70 border-b border-slate-800 text-slate-400 font-semibold uppercase">
                    <th className="px-6 py-3.5 min-w-[200px] border-r border-slate-800">Metric / Criterion</th>
                    {comparedBidders.map((b) => (
                      <th key={b.bidder_id} className="px-6 py-3.5 min-w-[200px] text-slate-100 border-r border-slate-800 font-bold text-sm">
                        {b.company_name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 font-normal">
                  <tr>
                    <td className="px-6 py-3.5 bg-slate-950/30 font-semibold text-slate-300 border-r border-slate-800">
                      Overall Category
                    </td>
                    {comparedBidders.map((b) => (
                      <td key={b.bidder_id} className="px-6 py-3.5 border-r border-slate-800">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            b.category === 'CRITICAL_ATTENTION'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : b.category === 'REQUIRES_REVIEW'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {b.category?.replace(/_/g, ' ')}
                        </span>
                      </td>
                    ))}
                  </tr>

                  <tr>
                    <td className="px-6 py-3.5 bg-slate-950/30 font-semibold text-slate-300 border-r border-slate-800">
                      Compliance Score
                    </td>
                    {comparedBidders.map((b) => (
                      <td key={b.bidder_id} className="px-6 py-3.5 border-r border-slate-800 font-bold text-slate-100">
                        <span className="text-sm font-mono">{b.compliance_score}%</span>
                        <span className="text-[11px] text-slate-400 ml-1.5 font-normal">
                          ({b.verified_count} verified)
                        </span>
                      </td>
                    ))}
                  </tr>

                  <tr>
                    <td className="px-6 py-3.5 bg-slate-950/30 font-semibold text-slate-300 border-r border-slate-800">
                      GSTIN & PAN
                    </td>
                    {comparedBidders.map((b) => (
                      <td key={b.bidder_id} className="px-6 py-3.5 border-r border-slate-800 font-mono text-slate-300">
                        <div>GST: {b.gstin || 'N/A'}</div>
                        <div className="text-slate-400 text-[11px]">PAN: {b.pan || 'N/A'}</div>
                      </td>
                    ))}
                  </tr>

                  <tr>
                    <td className="px-6 py-3.5 bg-slate-950/30 font-semibold text-slate-300 border-r border-slate-800">
                      High Vigilance Risks
                    </td>
                    {comparedBidders.map((b) => (
                      <td key={b.bidder_id} className="px-6 py-3.5 border-r border-slate-800">
                        {b.high_risks > 0 ? (
                          <span className="px-2 py-0.5 rounded bg-rose-950/50 text-rose-300 border border-rose-800/60 font-bold text-xs">
                            {b.high_risks} HIGH RISK
                          </span>
                        ) : (
                          <span className="text-emerald-400 font-medium">None Flagged</span>
                        )}
                      </td>
                    ))}
                  </tr>

                  <tr>
                    <td className="px-6 py-3.5 bg-slate-950/30 font-semibold text-slate-300 border-r border-slate-800">
                      Submitted Documents
                    </td>
                    {comparedBidders.map((b) => (
                      <td key={b.bidder_id} className="px-6 py-3.5 border-r border-slate-800 font-medium text-slate-300">
                        {b.documents_uploaded} files ({b.documents_processed} processed)
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Line-by-Line Requirement Compliance Matrix */}
          {matrix.length > 0 && (
            <div className="bg-slate-900/90 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/50 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                  2. Detailed Requirements Verification Matrix
                </h2>
                <span className="text-xs text-slate-400 font-mono">{matrix.length} Requirements Tested</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300 border-collapse">
                  <thead>
                    <tr className="bg-slate-950/70 border-b border-slate-800 text-slate-400 font-semibold uppercase">
                      <th className="px-6 py-3.5 min-w-[240px] border-r border-slate-800">Tender Requirement</th>
                      {comparedBidders.map((b) => (
                        <th key={b.bidder_id} className="px-6 py-3.5 min-w-[200px] text-slate-100 border-r border-slate-800 font-bold">
                          {b.company_name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 font-normal">
                    {matrix.map((row) => (
                      <tr key={row.requirement_id}>
                        <td className="px-6 py-3.5 bg-slate-950/30 border-r border-slate-800">
                          <div className="font-semibold text-slate-200">{row.requirement_name}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {row.mandatory ? (
                              <span className="text-rose-400 font-medium">Mandatory</span>
                            ) : (
                              <span className="text-slate-500">Optional</span>
                            )}
                            {row.expected_document_type && ` • ${row.expected_document_type}`}
                          </div>
                        </td>
                        {comparedBidders.map((b) => {
                          const res = row.bidder_results?.[b.bidder_id] || row.bidder_results?.[String(b.bidder_id)];
                          const status = res?.status || 'MISSING';
                          return (
                            <td key={b.bidder_id} className="px-6 py-3.5 border-r border-slate-800">
                              <div className="flex items-center gap-1.5 mb-1">
                                {status === 'VERIFIED' && (
                                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold text-[10px]">
                                    VERIFIED
                                  </span>
                                )}
                                {status === 'REVIEW' && (
                                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold text-[10px]">
                                    REVIEW
                                  </span>
                                )}
                                {status === 'MISSING' && (
                                  <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold text-[10px]">
                                    MISSING
                                  </span>
                                )}
                              </div>
                              {res?.reason && (
                                <p className="text-[11px] text-slate-400 line-clamp-2">{res.reason}</p>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
