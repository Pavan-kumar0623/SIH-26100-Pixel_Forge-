import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Filter,
  Building2,
  FileText,
  Clock,
  Check
} from 'lucide-react';
import { getTenderRisks, updateRiskStatus } from '../api/client';
import type { RiskSignal } from '../types';

interface RiskSignalsProps {
  tenderId: string;
}

export const RiskSignals: React.FC<RiskSignalsProps> = ({ tenderId }) => {
  const [risks, setRisks] = useState<RiskSignal[]>([]);
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);

  const loadRisks = async () => {
    if (!tenderId) return;
    setLoading(true);
    try {
      const data = await getTenderRisks(tenderId);
      const flattened: RiskSignal[] = [];
      if (Array.isArray(data)) {
        data.forEach((item: any) => {
          if (item.risks && Array.isArray(item.risks)) {
            item.risks.forEach((r: any) => {
              flattened.push({
                ...r,
                bidder_name: item.company_name,
              });
            });
          } else if (item.risk_type) {
            flattened.push(item);
          }
        });
      }
      setRisks(flattened);
    } catch (err) {
      console.error('Failed to load risk signals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRisks();
  }, [tenderId]);

  const handleStatusChange = async (riskId: string | number, status: string) => {
    try {
      await updateRiskStatus(riskId, status);
      loadRisks();
    } catch (err) {
      console.error('Failed to update risk status:', err);
    }
  };

  const filtered = risks.filter((r) => {
    if (severityFilter === 'ALL') return true;
    return r.severity === severityFilter;
  });

  const highCount = risks.filter((r) => r.severity === 'HIGH').length;
  const medCount = risks.filter((r) => r.severity === 'MEDIUM').length;
  const lowCount = risks.filter((r) => r.severity === 'LOW').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 font-display flex items-center gap-2.5">
            <ShieldAlert className="w-6 h-6 text-rose-400" />
            Vigilance & Procurement Risk Signals
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Deterministic risk detectors flagging cross-bidder collusion, shell entity indicators, shared DINs, and address overlaps.
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-900/90 p-4 rounded-xl border border-slate-800 shadow-md gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-400 font-medium mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-indigo-400" /> Severity:
          </span>
          {[
            { id: 'ALL', label: `All (${risks.length})` },
            { id: 'HIGH', label: `High (${highCount})` },
            { id: 'MEDIUM', label: `Medium (${medCount})` },
            { id: 'LOW', label: `Low (${lowCount})` },
          ].map((sev) => (
            <button
              key={sev.id}
              onClick={() => setSeverityFilter(sev.id)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                severityFilter === sev.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
              }`}
            >
              {sev.label}
            </button>
          ))}
        </div>
        <span className="text-xs font-semibold text-slate-400 font-mono">
          {filtered.length} Detected Signals
        </span>
      </div>

      {/* Signals List */}
      {loading ? (
        <div className="p-16 text-center text-slate-400 text-sm">
          <span className="inline-block w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-2"></span>
          <p>Running vigilance detector engines across all submissions...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-16 text-center text-slate-400 text-sm bg-slate-900/50 rounded-2xl border border-slate-800">
          No risk signals found for the selected severity.
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((risk) => {
            const isHigh = risk.severity === 'HIGH';
            const isMed = risk.severity === 'MEDIUM';

            return (
              <div
                key={risk.id}
                className={`p-6 rounded-2xl border bg-slate-900/90 shadow-xl space-y-4 transition ${
                  isHigh
                    ? 'border-rose-900/50 hover:border-rose-700/60'
                    : isMed
                    ? 'border-amber-900/50 hover:border-amber-700/60'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider font-mono ${
                        isHigh
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : isMed
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}
                    >
                      {risk.severity} SEVERITY
                    </span>
                    <h3 className="font-bold text-slate-100 text-sm tracking-wide uppercase font-mono">
                      {risk.risk_type.replace(/_/g, ' ')}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400 font-mono mr-1">Status:</span>
                    <select
                      value={risk.status || 'OPEN'}
                      onChange={(e) => handleStatusChange(risk.id, e.target.value)}
                      className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:border-indigo-500 font-medium"
                    >
                      <option value="OPEN">OPEN</option>
                      <option value="REVIEWED">REVIEWED</option>
                      <option value="RESOLVED">RESOLVED</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-slate-200 text-xs sm:text-sm leading-relaxed">{risk.description}</p>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1 font-mono">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="text-slate-300 font-medium">{risk.bidder_name || 'Flagged Entity'}</span>
                    </div>
                    {risk.source && (
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-slate-500" />
                        <span>Source: {risk.source}</span>
                      </div>
                    )}
                  </div>
                </div>

                {risk.evidence && (
                  <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 text-xs font-mono text-slate-300">
                    <span className="text-slate-500 block mb-1 uppercase text-[10px] font-bold tracking-wider">
                      Audit Evidence Trace:
                    </span>
                    <p className="leading-relaxed text-indigo-200/90">{risk.evidence}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
