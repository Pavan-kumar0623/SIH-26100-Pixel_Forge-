import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Building2,
  ShieldAlert,
  History,
  FileText,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Upload,
  Bot,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { getBidderIntelligence } from '../api/client';

export const BidderProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getBidderIntelligence(id)
      .then((res) => setData(res))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="p-16 text-slate-400 text-center text-sm">
        <span className="inline-block w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-2"></span>
        <p>Loading Bidder Intelligence Dossier...</p>
      </div>
    );
  }

  if (!data || !data.bidder) {
    return (
      <div className="p-16 text-rose-400 text-center text-sm">
        Bidder Profile Not Found.
      </div>
    );
  }

  const { bidder, documents = [], compliance = [], risks = [], history = [] } = data;

  return (
    <div className="space-y-7 max-w-7xl mx-auto">
      <Link
        to="/bidders"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-200 transition"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Bidder Registry
      </Link>

      {/* Header Profile Card */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-7 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600/30 text-indigo-300 font-bold flex items-center justify-center text-2xl font-mono border border-indigo-500/40 shadow-inner">
              {bidder.company_name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-100 font-display">{bidder.company_name}</h1>
              <p className="text-xs text-slate-400 mt-1 max-w-xl">
                {bidder.registered_address || 'No registered address disclosed'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to={`/verification?bidderId=${bidder.id}`}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Document</span>
            </Link>
          </div>
        </div>

        {/* Structured Legal Credentials */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-950/60 rounded-xl border border-slate-800/80 text-xs">
          <div>
            <span className="text-slate-400 block mb-0.5 font-medium">GSTIN</span>
            <span className="font-mono font-bold text-indigo-300">{bidder.gstin || 'Not Provided'}</span>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5 font-medium">PAN</span>
            <span className="font-mono font-bold text-slate-200">{bidder.pan || 'N/A'}</span>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5 font-medium">CIN</span>
            <span className="font-mono font-bold text-slate-200 text-[11px] truncate block">{bidder.cin || 'N/A'}</span>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5 font-medium">Udyam/MSME</span>
            <span className="font-mono font-bold text-slate-200 text-[11px]">{bidder.udyam_number || 'N/A'}</span>
          </div>
        </div>
      </div>

      {/* 2-Column Grid: Compliance Status (Left) & Risk Signals (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-7">
        {/* Compliance Results */}
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Clause Compliance Breakdown
            </h2>
            <span className="text-xs text-slate-400 font-mono">{compliance.length} Rules</span>
          </div>

          <div className="space-y-2.5">
            {compliance.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">No compliance evaluations recorded yet.</div>
            ) : (
              compliance.map((c: any) => (
                <div
                  key={c.id}
                  className="p-3 bg-slate-950/50 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs"
                >
                  <div className="pr-3">
                    <div className="font-semibold text-slate-200">{c.requirement_name || 'Requirement'}</div>
                    <div className="text-slate-400 text-[11px] mt-0.5 line-clamp-1">{c.reason || 'Verification logic'}</div>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] flex-shrink-0 ${
                      c.status === 'VERIFIED'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : c.status === 'REVIEW'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    {c.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Risk Signals */}
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              Vigilance Risk Signals
            </h2>
            <span className="text-xs text-slate-400 font-mono">{risks.length} Signals</span>
          </div>

          <div className="space-y-2.5">
            {risks.length === 0 ? (
              <div className="py-8 text-center text-xs text-emerald-400">
                ✓ No active vigilance risk flags detected for this entity.
              </div>
            ) : (
              risks.map((r: any) => (
                <div
                  key={r.id}
                  className={`p-3 rounded-xl border text-xs ${
                    r.severity === 'HIGH'
                      ? 'bg-rose-950/20 border-rose-800/40 text-rose-200'
                      : r.severity === 'MEDIUM'
                      ? 'bg-amber-950/20 border-amber-800/40 text-amber-200'
                      : 'bg-slate-800/50 border-slate-700/60 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold uppercase tracking-wider text-[11px]">{r.risk_type.replace(/_/g, ' ')}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        r.severity === 'HIGH'
                          ? 'bg-rose-500/20 text-rose-300'
                          : r.severity === 'MEDIUM'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {r.severity}
                    </span>
                  </div>
                  <p className="leading-relaxed opacity-90">{r.description}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Uploaded Documents & Procurement History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-7">
        {/* Documents */}
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 shadow-xl space-y-4">
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2 pb-3 border-b border-slate-800">
            <FileText className="w-4 h-4 text-indigo-400" />
            Uploaded Documents ({documents.length})
          </h2>

          <div className="space-y-2">
            {documents.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500">No documents uploaded yet.</div>
            ) : (
              documents.map((d: any) => (
                <div key={d.id} className="p-3 bg-slate-950/50 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-slate-200">{d.file_name}</div>
                    <div className="text-[10px] text-indigo-300 font-mono uppercase mt-0.5">{d.document_type}</div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                    {d.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* History */}
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 shadow-xl space-y-4">
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2 pb-3 border-b border-slate-800">
            <History className="w-4 h-4 text-indigo-400" />
            Past Procurement Track Record
          </h2>

          <div className="space-y-2.5">
            {history.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500">No past procurement track record on file.</div>
            ) : (
              history.map((h: any) => (
                <div key={h.id} className="p-3 bg-slate-950/50 rounded-xl border border-slate-800 text-xs">
                  <div className="flex items-center justify-between font-semibold text-slate-200 mb-1">
                    <span>{h.tender_title || `Tender Ref #${h.tender_id}`}</span>
                    <span className="text-indigo-400 font-mono text-[11px]">{h.outcome}</span>
                  </div>
                  <p className="text-slate-400 text-[11px]">{h.notes}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
