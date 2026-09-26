import React, { useEffect, useState } from 'react';
import { Download, FileSpreadsheet, FileText, CheckCircle2, Building2, Sparkles } from 'lucide-react';
import { exportCsvUrl, exportExcelUrl, getBidders } from '../api/client';
import type { Bidder } from '../types';

interface ExportProps {
  tenderId: string;
}

export const Export: React.FC<ExportProps> = ({ tenderId }) => {
  const [bidders, setBidders] = useState<Bidder[]>([]);

  useEffect(() => {
    if (!tenderId) return;
    getBidders(tenderId).then((data) => setBidders(data || [])).catch(() => {});
  }, [tenderId]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="pb-4 border-b border-slate-800">
        <h1 className="text-2xl font-bold text-slate-100 font-display flex items-center gap-2.5">
          <Download className="w-6 h-6 text-indigo-400" />
          Export Audit Dossiers & Spreadsheets
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Generate audit-ready spreadsheets, compliance matrix workbooks, and structured CSV reports for the evaluation committee.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CSV Export Card */}
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-7 shadow-xl hover:border-slate-700 transition space-y-5 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-lg font-display">CSV Bidder Summary</h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Flat tabular data containing company registration profiles, verified GSTIN/PAN/CIN credentials, compliance counts, and open risk signal summaries.
              </p>
            </div>

            <ul className="text-xs text-slate-400 space-y-1.5 pt-2">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Compatible with ERP and spreadsheet systems</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Direct tabular download ({bidders.length} bidders included)</span>
              </li>
            </ul>
          </div>

          <a
            href={exportCsvUrl(tenderId)}
            target="_blank"
            rel="noreferrer"
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 font-semibold text-xs rounded-xl transition text-center flex items-center justify-center gap-2 shadow-sm"
          >
            <Download className="w-4 h-4 text-indigo-400" />
            <span>Download Summary (.csv)</span>
          </a>
        </div>

        {/* Excel Export Card */}
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-7 shadow-xl hover:border-slate-700 transition space-y-5 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-lg font-display">Multi-Sheet Excel Audit Workbook</h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Complete, formatted OpenPyXL workbook containing 4 dedicated sheets: Bidders Overview, Extracted Fields, Compliance Matrix, and Vigilance Risk Signals.
              </p>
            </div>

            <ul className="text-xs text-slate-400 space-y-1.5 pt-2">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Styled headers and automated columns</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Comprehensive 4-sheet evaluation dossier</span>
              </li>
            </ul>
          </div>

          <a
            href={exportExcelUrl(tenderId)}
            target="_blank"
            rel="noreferrer"
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl transition text-center flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
          >
            <Download className="w-4 h-4" />
            <span>Download Multi-Sheet Excel (.xlsx)</span>
          </a>
        </div>
      </div>

      {/* Live Roster of Included Entities */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 space-y-3 shadow-lg">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-100 font-mono">
            <Building2 className="w-4 h-4 text-indigo-400" />
            <span>ENTITIES INCLUDED IN EXPORT ({bidders.length})</span>
          </div>
          <span className="text-[10px] text-emerald-400 font-mono font-semibold">● Live Database Sync</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
          {bidders.map((b) => {
            let isNewlyAdded = false;
            try {
              const stored = JSON.parse(localStorage.getItem('newly_added_bidders') || '[]');
              isNewlyAdded = stored.includes(b.id);
            } catch (e) {}

            return (
              <div
                key={b.id}
                className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-2"
              >
                <div className="overflow-hidden">
                  <div className="text-xs font-semibold text-slate-200 truncate">{b.company_name}</div>
                  <div className="text-[10px] text-slate-500 font-mono">ID #{b.id} • {b.gstin || 'No GST'}</div>
                </div>
                {isNewlyAdded && (
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-mono font-bold flex-shrink-0 animate-pulse">
                    ✨ NEW
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
