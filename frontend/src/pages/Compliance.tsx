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
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 font-display flex items-center gap-2.5">
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            Regulatory Compliance Verification Matrix
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Deterministic rule evaluation matching submitted bidder documents against mandatory tender clauses.
          </p>
        </div>

        <button
          onClick={loadAllCompliance}
          disabled={loading}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-xl transition shadow-md shadow-indigo-600/20 flex items-center gap-2 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Compliance Matrix</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Status Pills */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-400 font-medium mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-indigo-400" /> Filter:
          </span>
          {[
            { id: 'ALL', label: `All (${complianceItems.length})` },
            { id: 'VERIFIED', label: `Verified (${verifiedCount})` },
            { id: 'REVIEW', label: `Requires Review (${reviewCount})` },
            { id: 'MISSING', label: `Missing (${missingCount})` },
          ].map((status) => (
            <button
              key={status.id}
              onClick={() => setFilterStatus(status.id)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                filterStatus === status.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
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
            placeholder="Search by company or clause..."
            className="pl-8 pr-3 py-1.5 bg-slate-950/80 border border-slate-700 text-xs text-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 w-full sm:w-64"
          />
        </div>
      </div>

      {/* Main Compliance Table */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-slate-400 text-sm">
            <span className="inline-block w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-2"></span>
            <p>Evaluating compliance rules across all participating bidder documents...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center text-slate-400 text-sm">
            No compliance evaluation items match your filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300 border-collapse">
              <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 font-semibold uppercase">
                <tr>
                  <th className="px-5 py-3.5">Bidder Company</th>
                  <th className="px-5 py-3.5">Tender Requirement Clause</th>
                  <th className="px-5 py-3.5">Evaluation Status</th>
                  <th className="px-5 py-3.5">Reason & Extraction Logic</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-normal">
                {filtered.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-slate-800/40 transition">
                    <td className="px-5 py-3.5 font-semibold text-slate-100 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                        <span>{item.company_name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-slate-200">{item.requirement_name}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {item.mandatory ? (
                          <span className="text-rose-400 font-medium">Mandatory</span>
                        ) : (
                          <span className="text-slate-500">Optional</span>
                        )}
                        {item.expected_document_type && ` • ${item.expected_document_type}`}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      {item.status === 'VERIFIED' && (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold text-[10px] inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> VERIFIED
                        </span>
                      )}
                      {item.status === 'REVIEW' && (
                        <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold text-[10px] inline-flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> REQUIRES REVIEW
                        </span>
                      )}
                      {item.status === 'MISSING' && (
                        <span className="px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold text-[10px] inline-flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> MISSING
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-slate-300 max-w-md">
                      <p className="line-clamp-2 leading-relaxed">{item.reason}</p>
                    </td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        {item.evidence && (
                          <button
                            onClick={() => setEvidenceModal(item)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-md font-medium text-[11px] inline-flex items-center gap-1 transition"
                            title="View extracted evidence"
                          >
                            <Eye className="w-3 h-3 text-indigo-400" /> Evidence
                          </button>
                        )}
                        <button
                          onClick={() => handleRecheckBidder(item.bidder_id)}
                          disabled={recheckingBidderId === item.bidder_id}
                          className="px-2.5 py-1 bg-indigo-950/60 hover:bg-indigo-900/60 text-indigo-200 border border-indigo-800/60 rounded-md font-medium text-[11px] inline-flex items-center gap-1 transition disabled:opacity-40"
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
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Compliance Evidence Verification
            </h3>
            <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 text-xs space-y-2">
              <div>
                <span className="text-slate-400 block mb-0.5">Bidder Entity:</span>
                <span className="font-bold text-slate-200">{evidenceModal.company_name}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Clause:</span>
                <span className="font-semibold text-slate-200">{evidenceModal.requirement_name}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Status Evaluation:</span>
                <span className="font-bold text-emerald-400 font-mono">{evidenceModal.status}</span>
              </div>
            </div>
            <div className="p-3.5 bg-indigo-950/30 rounded-xl border border-indigo-800/40 text-xs text-indigo-200 font-mono leading-relaxed">
              "{evidenceModal.evidence || 'No raw evidence snippet attached.'}"
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setEvidenceModal(null)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-xl transition shadow-md"
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
