import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Filter,
  Eye,
  Building2,
  ShieldCheck,
  FileText,
  Search
} from 'lucide-react';
import { getBidders, getBidderCompliance, recheckCompliance } from '../api/client';
import type { Bidder, ComplianceItem } from '../types';

interface ComplianceProps {
  tenderId: string;
}

interface EnrichedComplianceItem extends ComplianceItem {
  bidder_id: number | string;
  company_name: string;
}

export const Compliance: React.FC<ComplianceProps> = ({ tenderId }) => {
  const [bidders, setBidders] = useState<Bidder[]>([]);
  const [complianceItems, setComplianceItems] = useState<EnrichedComplianceItem[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [recheckingBidderId, setRecheckingBidderId] = useState<string | number | null>(null);
  const [evidenceModal, setEvidenceModal] = useState<EnrichedComplianceItem | null>(null);

  const loadAllCompliance = async () => {
    if (!tenderId) return;
    setLoading(true);
    try {
      const bidderList = await getBidders(tenderId);
      setBidders(bidderList || []);

      const detailedEvaluations = await Promise.all(
        (bidderList || []).map(async (b) => {
          try {
            const data = await getBidderCompliance(b.id);
            const results = data.results || [];
            return results.map((r: any) => ({
              ...r,
              bidder_id: b.id,
              company_name: b.company_name,
            }));
          } catch (e) {
            return [];
          }
        })
      );

      const flattened = detailedEvaluations.flat();
      setComplianceItems(flattened);
    } catch (err) {
      console.error('Failed to load compliance evaluations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllCompliance();
  }, [tenderId]);

  const handleRecheckBidder = async (bidderId: string | number) => {
    setRecheckingBidderId(bidderId);
    try {
      await recheckCompliance(bidderId);
      await loadAllCompliance();
    } catch (err) {
      console.error('Recheck failed:', err);
    } finally {
      setRecheckingBidderId(null);
    }
  };

  const filtered = complianceItems.filter((item) => {
    const matchesStatus = filterStatus === 'ALL' || item.status === filterStatus;
    const matchesSearch =
      !searchQuery ||
      item.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.requirement_name && item.requirement_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.reason && item.reason.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const verifiedCount = complianceItems.filter((c) => c.status === 'VERIFIED').length;
  const reviewCount = complianceItems.filter((c) => c.status === 'REVIEW').length;
  const missingCount = complianceItems.filter((c) => c.status === 'MISSING').length;

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#1e293b]">
        <div>
          <h1 className="text-xl font-bold text-slate-100 font-display flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-[#10b981]" />
            Regulatory Compliance Verification Matrix
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Deterministic rule evaluation matching submitted bidder documents against mandatory tender clauses.
          </p>
        </div>

        <button
          onClick={loadAllCompliance}
          disabled={loading}
          className="px-3.5 py-1.5 bg-[#6366f1] hover:bg-[#4f46e5] text-white font-medium text-xs rounded transition shadow flex items-center gap-2 self-start sm:self-auto font-mono"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Compliance Matrix</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#111827] p-3.5 rounded border border-[#1e293b] shadow flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Status Pills */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <span className="text-slate-400 font-semibold mr-1 flex items-center gap-1 uppercase text-[10px]">
            <Filter className="w-3.5 h-3.5 text-[#6366f1]" /> Filter:
          </span>
          {[
            { id: 'ALL', label: `ALL (${complianceItems.length})` },
            { id: 'VERIFIED', label: `VERIFIED (${verifiedCount})` },
            { id: 'REVIEW', label: `REVIEW (${reviewCount})` },
            { id: 'MISSING', label: `MISSING (${missingCount})` },
          ].map((status) => (
            <button
              key={status.id}
              onClick={() => setFilterStatus(status.id)}
              className={`px-2.5 py-1 rounded font-bold transition-all text-[10px] ${
                filterStatus === status.id
                  ? 'bg-[#6366f1] text-white shadow-sm'
                  : 'bg-[#1e293b] text-slate-400 hover:bg-[#334155] hover:text-slate-200'
              }`}
            >
              {status.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search company or clause..."
            className="pl-8 pr-3 py-1.5 bg-[#0b0f19] border border-[#1e293b] text-xs text-slate-200 rounded focus:outline-none focus:border-[#6366f1] w-full sm:w-64 font-mono"
          />
        </div>
      </div>

      {/* Main Compliance Table */}
      <div className="bg-[#111827] rounded border border-[#1e293b] shadow-lg overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-slate-400 text-xs font-mono">
            <span className="inline-block w-4 h-4 border-2 border-[#6366f1] border-t-transparent rounded-full animate-spin mb-2"></span>
            <p>Evaluating compliance rules across all participating bidder documents...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center text-slate-400 text-xs font-mono">
            No compliance evaluation items match your filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300 border-collapse">
              <thead className="bg-[#0f172a] border-b border-[#1e293b] text-slate-400 font-mono text-[10px] uppercase tracking-widest">
                <tr>
                  <th className="px-4 py-3">Bidder Company</th>
                  <th className="px-4 py-3">Tender Requirement Clause</th>
                  <th className="px-4 py-3">Evaluation Status</th>
                  <th className="px-4 py-3">Reason & Extraction Logic</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e293b] font-normal">
                {filtered.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-[#1e293b]/50 transition">
                    <td className="px-4 py-3 font-semibold text-slate-100 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5 text-[#6366f1] flex-shrink-0" />
                        <span>{item.company_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-200">{item.requirement_name}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {item.mandatory ? (
                          <span className="text-[#ef4444] font-bold uppercase">Mandatory</span>
                        ) : (
                          <span className="text-slate-500 uppercase">Optional</span>
                        )}
                        {item.expected_document_type && ` • ${item.expected_document_type}`}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-mono">
                      {item.status === 'VERIFIED' && (
                        <span className="px-2 py-0.5 rounded bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/40 font-bold text-[10px] inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> VERIFIED
                        </span>
                      )}
                      {item.status === 'REVIEW' && (
                        <span className="px-2 py-0.5 rounded bg-[#f59e0b]/20 text-[#f59e0b] border border-[#f59e0b]/40 font-bold text-[10px] inline-flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> REQUIRES REVIEW
                        </span>
                      )}
                      {item.status === 'MISSING' && (
                        <span className="px-2 py-0.5 rounded bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/40 font-bold text-[10px] inline-flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> MISSING
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-300 max-w-md">
                      <p className="line-clamp-2 leading-relaxed text-[11px] font-normal">{item.reason}</p>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2 font-mono">
                        {item.evidence && (
                          <button
                            onClick={() => setEvidenceModal(item)}
                            className="px-2 py-1 bg-[#1f2937] hover:bg-[#334155] text-slate-200 border border-[#334155] rounded text-[10px] font-medium inline-flex items-center gap-1 transition cursor-pointer"
                            title="View extracted evidence"
                          >
                            <Eye className="w-3 h-3 text-[#6366f1]" /> Evidence
                          </button>
                        )}
                        <button
                          onClick={() => handleRecheckBidder(item.bidder_id)}
                          disabled={recheckingBidderId === item.bidder_id}
                          className="px-2 py-1 bg-[#6366f1]/20 hover:bg-[#6366f1]/30 text-[#c0c1ff] border border-[#6366f1]/40 rounded text-[10px] font-medium inline-flex items-center gap-1 transition disabled:opacity-40 cursor-pointer"
                          title="Re-run compliance for this bidder"
                        >
                          <RefreshCw className={`w-3 h-3 ${recheckingBidderId === item.bidder_id ? 'animate-spin' : ''}`} />
                          Recheck
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Evidence Trace Modal */}
      {evidenceModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#111827] border border-[#334155] rounded max-w-lg w-full p-5 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 font-display">
              <ShieldCheck className="w-4 h-4 text-[#10b981]" />
              Compliance Evidence Verification Trace
            </h3>
            <div className="p-3 bg-[#0b0f19] rounded border border-[#1e293b] text-xs space-y-2 font-mono">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Bidder Entity:</span>
                <span className="font-bold text-slate-200">{evidenceModal.company_name}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Clause:</span>
                <span className="font-semibold text-slate-200">{evidenceModal.requirement_name}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Status Evaluation:</span>
                <span className="font-bold text-[#10b981]">{evidenceModal.status}</span>
              </div>
            </div>
            <div className="p-3 bg-[#1e293b]/60 rounded border border-[#334155] text-xs text-[#c0c1ff] font-mono leading-relaxed">
              "{evidenceModal.evidence || 'No raw evidence snippet attached.'}"
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setEvidenceModal(null)}
                className="px-3.5 py-1.5 bg-[#6366f1] hover:bg-[#4f46e5] text-white font-medium text-xs rounded transition font-mono"
              >
                Close Audit Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
