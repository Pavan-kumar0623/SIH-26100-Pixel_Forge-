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
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/80 rounded-2xl p-7 text-white border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-5 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-300 text-xs font-semibold mb-3 border border-indigo-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              ProcureAI Core Online • Gemini 1.5 + Tesseract + Grok
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-100 font-display mb-2">
              Procurement Evaluation & Vigilance Center
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed">
              Automated multi-tier verification of tender bids, OCR text extraction, regulatory compliance validation,
              and cross-bidder collusion risk detection.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to={`/comparison?tenderId=${tenderId}`}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm rounded-xl transition shadow-lg shadow-indigo-600/20 flex items-center gap-2"
            >
              <span>Bidder Comparison</span>
              <ArrowUpRight className="w-4 h-4" />
            </Link>
            <Link
              to={`/risk-graph?tenderId=${tenderId}`}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-sm rounded-xl transition flex items-center gap-2"
            >
              <span>Entity Graph</span>
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-slate-900/90 rounded-2xl p-5 border border-slate-800 shadow-lg hover:border-slate-700 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Bidders</span>
            <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-100 mb-1 font-display">{bidders.length}</div>
          <p className="text-xs text-slate-400">Participating in active tender</p>
        </div>

        <div className="bg-slate-900/90 rounded-2xl p-5 border border-slate-800 shadow-lg hover:border-slate-700 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Verified Compliance</span>
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-bold text-emerald-400 mb-1 font-display">{verifiedCount}</div>
          <p className="text-xs text-slate-400">Of {totalRequirementsEvaluated || (bidders.length * 6)} evaluation criteria</p>
        </div>

        <div className="bg-slate-900/90 rounded-2xl p-5 border border-slate-800 shadow-lg hover:border-slate-700 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">High Risk Flags</span>
            <div className="p-2.5 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-bold text-rose-400 mb-1 font-display">{highRisks.length}</div>
          <p className="text-xs text-rose-400/80 font-medium">Requires immediate committee review</p>
        </div>

        <div className="bg-slate-900/90 rounded-2xl p-5 border border-slate-800 shadow-lg hover:border-slate-700 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pending Action Items</span>
            <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-bold text-amber-400 mb-1 font-display">{reviewCount + missingCount}</div>
          <p className="text-xs text-amber-300/80 font-medium">{missingCount} missing docs, {reviewCount} under review</p>
        </div>
      </div>

      {/* Main Grid: Bidders Overview + Risk Signals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Col: Bidders Summary */}
        <div className="lg:col-span-2 bg-slate-900/90 rounded-2xl border border-slate-800 p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-400" />
                Participating Bidder Dossiers
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Live status of submitted documents & compliance</p>
            </div>
            <Link
              to={`/bidders?tenderId=${tenderId}`}
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition"
            >
              View All Bidders <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-slate-800/80">
            {bidders.map((bidder) => {
              const bidderCompliance = complianceList.find((c) => String(c.bidder_id) === String(bidder.id));
              const score = bidderCompliance?.summary?.compliance_score ?? 100;
              const bRisks = risks.filter((r) => String(r.bidder_id) === String(bidder.id));
              const hasHigh = bRisks.some((r) => r.severity === 'HIGH');

              return (
                <div key={bidder.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-800/40 px-3 rounded-xl transition">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 text-indigo-300 font-bold flex items-center justify-center text-sm border border-slate-700 font-mono flex-shrink-0">
                      {bidder.company_name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-100">{bidder.company_name}</h3>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5 font-mono">
                        <span>GST: {bidder.gstin || 'Not Disclosed'}</span>
                        <span>•</span>
                        <span>PAN: {bidder.pan || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                      <div className="text-xs font-semibold text-slate-200">{score}% Compliance</div>
                      <div className="text-[11px] text-slate-400">
                        {hasHigh ? (
                          <span className="text-rose-400 font-medium">Flagged Risks</span>
                        ) : (
                          <span className="text-emerald-400">Verified</span>
                        )}
                      </div>
                    </div>

                    <Link
                      to={`/bidders/${bidder.id}`}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white rounded-lg text-xs font-semibold border border-slate-700 hover:border-indigo-500 transition"
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
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Vigilance & Risk Flags
            </h2>
            <Link to={`/risk-signals?tenderId=${tenderId}`} className="text-xs font-semibold text-indigo-400 hover:text-indigo-300">
              View All ({risks.length})
            </Link>
          </div>

          <div className="space-y-3">
            {risks.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">No active risk signals detected.</div>
            ) : (
              risks.slice(0, 5).map((risk, idx) => (
                <div
                  key={risk.id || idx}
                  className={`p-3.5 rounded-xl border text-xs ${
                    risk.severity === 'HIGH'
                      ? 'bg-rose-950/30 border-rose-800/50 text-rose-200'
                      : risk.severity === 'MEDIUM'
                      ? 'bg-amber-950/30 border-amber-800/50 text-amber-200'
                      : 'bg-slate-800/60 border-slate-700/60 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold uppercase tracking-wider text-[11px]">
                      {risk.risk_type.replace(/_/g, ' ')}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        risk.severity === 'HIGH'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : risk.severity === 'MEDIUM'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {risk.severity}
                    </span>
                  </div>
                  <p className="leading-relaxed mb-2 font-normal opacity-90">{risk.description}</p>
                  <div className="text-[10px] opacity-75 font-mono">{risk.bidder_name || 'Participating Entity'}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
