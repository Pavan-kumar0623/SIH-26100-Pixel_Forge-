import React, { useEffect, useState } from 'react';
import {
  Building2,
  FileCheck2,
  AlertTriangle,
  ArrowUpRight,
  ShieldAlert,
  CheckCircle2,
  Clock,
  ChevronRight,
  Sparkles,
  Bot,
  ExternalLink,
  ShieldCheck,
  FileText
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { getBidders, getTenderRisks, getTenderCompliance } from '../api/client';
import type { Bidder, RiskSignal } from '../types';

interface DashboardProps {
  tenderId: string;
}

export const Dashboard: React.FC<DashboardProps> = ({ tenderId }) => {
  const [bidders, setBidders] = useState<Bidder[]>([]);
  const [risks, setRisks] = useState<RiskSignal[]>([]);
  const [complianceList, setComplianceList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenderId) return;
    setLoading(true);
    Promise.all([
      getBidders(tenderId).catch(() => []),
      getTenderRisks(tenderId).catch(() => []),
      getTenderCompliance(tenderId).catch(() => []),
    ]).then(([bData, rData, cData]) => {
      setBidders(bData || []);

      const flattened: RiskSignal[] = [];
      if (Array.isArray(rData)) {
        rData.forEach((item: any) => {
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
      setComplianceList(Array.isArray(cData) ? cData : []);
      setLoading(false);
    });
  }, [tenderId]);

  // Aggregate compliance stats across all bidders
  let verifiedCount = 0;
  let reviewCount = 0;
  let missingCount = 0;
  let totalRequirementsEvaluated = 0;

  complianceList.forEach((item: any) => {
    if (item.summary) {
      verifiedCount += item.summary.verified || 0;
      reviewCount += item.summary.review || 0;
      missingCount += item.summary.missing || 0;
      totalRequirementsEvaluated += item.summary.total || 0;
    } else if (item.status) {
      if (item.status === 'VERIFIED') verifiedCount++;
      if (item.status === 'REVIEW') reviewCount++;
      if (item.status === 'MISSING') missingCount++;
      totalRequirementsEvaluated++;
    }
  });

  const highRisks = risks.filter((r) => r.severity === 'HIGH');
  const mediumRisks = risks.filter((r) => r.severity === 'MEDIUM');

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="bg-[#111827] rounded-md p-6 text-white border border-[#1e293b] shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-[#6366f1]/10 text-[#c0c1ff] text-[11px] font-mono font-semibold mb-3 border border-[#6366f1]/30 uppercase tracking-wide">
              <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse"></span>
              ProcureAI Vigilance Platform • Active Pipeline
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-100 font-display mb-1.5">
              Procurement Evaluation & Vigilance Center
            </h1>
            <p className="text-slate-400 text-xs leading-relaxed">
              Automated multi-tier verification of tender bids, OCR text extraction, regulatory compliance validation,
              and cross-bidder collusion risk detection.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              to={`/comparison?tenderId=${tenderId}`}
              className="px-3.5 py-2 bg-[#6366f1] hover:bg-[#4f46e5] text-white font-medium text-xs rounded transition shadow-md flex items-center gap-2"
            >
              <span>Bidder Comparison</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              to={`/risk-graph?tenderId=${tenderId}`}
              className="px-3.5 py-2 bg-[#1f2937] hover:bg-[#334155] text-slate-200 border border-[#334155] font-medium text-xs rounded transition flex items-center gap-2"
            >
              <span>Entity Network Graph</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#111827] rounded-md p-4 border border-[#1e293b] shadow-md hover:border-[#334155] transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Total Bidders</span>
            <div className="p-2 bg-[#6366f1]/10 text-[#6366f1] rounded border border-[#6366f1]/20">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-100 mb-0.5 font-mono">{bidders.length}</div>
          <p className="text-[11px] text-slate-400">Participating in active tender</p>
        </div>

        <div className="bg-[#111827] rounded-md p-4 border border-[#1e293b] shadow-md hover:border-[#334155] transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Verified Compliance</span>
            <div className="p-2 bg-[#10b981]/10 text-[#10b981] rounded border border-[#10b981]/20">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#10b981] mb-0.5 font-mono">{verifiedCount}</div>
          <p className="text-[11px] text-slate-400">Of {totalRequirementsEvaluated || (bidders.length * 6)} evaluation criteria</p>
        </div>

        <div className="bg-[#111827] rounded-md p-4 border border-[#1e293b] shadow-md hover:border-[#334155] transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">High Risk Flags</span>
            <div className="p-2 bg-[#ef4444]/10 text-[#ef4444] rounded border border-[#ef4444]/20">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#ef4444] mb-0.5 font-mono">{highRisks.length}</div>
          <p className="text-[11px] text-[#ef4444] font-mono">Requires committee review</p>
        </div>

        <div className="bg-[#111827] rounded-md p-4 border border-[#1e293b] shadow-md hover:border-[#334155] transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Pending Action Items</span>
            <div className="p-2 bg-[#f59e0b]/10 text-[#f59e0b] rounded border border-[#f59e0b]/20">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#f59e0b] mb-0.5 font-mono">{reviewCount + missingCount}</div>
          <p className="text-[11px] text-[#f59e0b] font-mono">{missingCount} missing docs, {reviewCount} under review</p>
        </div>
      </div>

      {/* Main Grid: Bidders Overview + Risk Signals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Bidders Summary */}
        <div className="lg:col-span-2 bg-[#111827] rounded-md border border-[#1e293b] p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#1e293b]">
            <div>
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2 font-display">
                <Building2 className="w-4 h-4 text-[#6366f1]" />
                Participating Bidder Dossiers
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">Live status of submitted documents & statutory compliance</p>
            </div>
            <Link
              to={`/bidders?tenderId=${tenderId}`}
              className="text-xs font-semibold text-[#6366f1] hover:text-[#c0c1ff] flex items-center gap-1 transition"
            >
              View All Bidders <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-[#1e293b]">
            {bidders.map((bidder) => {
              const bidderCompliance = complianceList.find((c) => String(c.bidder_id) === String(bidder.id));
              const score = bidderCompliance?.summary?.compliance_score ?? 100;
              const bRisks = risks.filter((r) => String(r.bidder_id) === String(bidder.id));
              const hasHigh = bRisks.some((r) => r.severity === 'HIGH');

              return (
                <div key={bidder.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#1f2937]/50 px-2 rounded transition">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-[#1e293b] text-[#c0c1ff] font-bold flex items-center justify-center text-xs border border-[#334155] font-mono flex-shrink-0">
                      {bidder.company_name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-xs font-semibold text-slate-100">{bidder.company_name}</h3>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5 font-mono">
                        <span className="bg-[#1e293b] px-1.5 py-0.5 rounded text-[10px] text-slate-300 border border-[#334155]">GST: {bidder.gstin || 'N/A'}</span>
                        <span className="bg-[#1e293b] px-1.5 py-0.5 rounded text-[10px] text-slate-300 border border-[#334155]">PAN: {bidder.pan || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block font-mono">
                      <div className="text-xs font-bold text-slate-200">{score}% COMPLIANCE</div>
                      <div className="text-[10px]">
                        {hasHigh ? (
                          <span className="text-[#ef4444] font-bold">FLAGGED RISKS</span>
                        ) : (
                          <span className="text-[#10b981] font-semibold">VERIFIED</span>
                        )}
                      </div>
                    </div>

                    <Link
                      to={`/bidders/${bidder.id}`}
                      className="px-3 py-1 bg-[#1f2937] hover:bg-[#6366f1] text-slate-200 hover:text-white rounded text-xs font-medium border border-[#334155] transition font-mono"
                    >
                      Dossier
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Col: High Priority Vigilance Risks */}
        <div className="bg-[#111827] rounded-md border border-[#1e293b] p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#1e293b]">
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2 font-display">
              <AlertTriangle className="w-4 h-4 text-[#f59e0b]" />
              Vigilance & Risk Flags
            </h2>
            <Link to={`/risk-signals?tenderId=${tenderId}`} className="text-xs font-semibold text-[#6366f1] hover:text-[#c0c1ff]">
              View All ({risks.length})
            </Link>
          </div>

          <div className="space-y-2.5">
            {risks.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 font-mono">No active risk signals detected.</div>
            ) : (
              risks.slice(0, 5).map((risk, idx) => (
                <div
                  key={risk.id || idx}
                  className={`p-3 rounded border text-xs ${
                    risk.severity === 'HIGH'
                      ? 'bg-[#ef4444]/10 border-[#ef4444]/40 text-slate-200'
                      : risk.severity === 'MEDIUM'
                      ? 'bg-[#f59e0b]/10 border-[#f59e0b]/40 text-slate-200'
                      : 'bg-[#1e293b] border-[#334155] text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold uppercase tracking-wider text-[10px] font-mono">
                      {risk.risk_type.replace(/_/g, ' ')}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono ${
                        risk.severity === 'HIGH'
                          ? 'bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/40'
                          : risk.severity === 'MEDIUM'
                          ? 'bg-[#f59e0b]/20 text-[#f59e0b] border border-[#f59e0b]/40'
                          : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {risk.severity}
                    </span>
                  </div>
                  <p className="leading-relaxed mb-1.5 opacity-90 text-[11px] font-normal">{risk.description}</p>
                  <div className="text-[10px] text-slate-400 font-mono uppercase">{risk.bidder_name || 'Participating Entity'}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
