import React from 'react';
import { Download, FileSpreadsheet, FileText, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';
import { exportCsvUrl, exportExcelUrl } from '../api/client';

interface ExportProps {
  tenderId: string;
}

export const Export: React.FC<ExportProps> = ({ tenderId }) => {
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
                <span>Direct tabular download</span>
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
    </div>
  );
};
