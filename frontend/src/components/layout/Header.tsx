import React from 'react';
import { Search, Bot, Shield, Sparkles } from 'lucide-react';
import type { Tender } from '../../types';

interface HeaderProps {
  tenders?: Tender[];
  selectedTenderId?: string | number;
  onSelectTender?: (id: string) => void;
  onOpenChat?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  tenders = [],
  selectedTenderId,
  onSelectTender,
  onOpenChat,
}) => {
  return (
    <header className="h-16 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 px-6 flex items-center justify-between sticky top-0 z-30 shadow-md">
      <div className="flex items-center gap-4">
        {/* Tender Selector dropdown */}
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
            Active Tender:
          </span>
          <select
            value={selectedTenderId ? String(selectedTenderId) : ''}
            onChange={(e) => onSelectTender?.(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-slate-100 text-sm font-medium rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 max-w-[340px] truncate"
          >
            {tenders.length === 0 && <option value="">Loading Tenders...</option>}
            {tenders.map((t) => (
              <option key={t.id} value={String(t.id)}>
                {t.tender_id} — {t.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3">
        {onOpenChat && (
          <button
            onClick={onOpenChat}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 text-xs font-medium transition-all shadow-sm group"
          >
            <Bot className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform" />
            <span>Ask Grok AI</span>
            <Sparkles className="w-3 h-3 text-amber-400" />
          </button>
        )}

        <div className="h-6 w-px bg-slate-800"></div>

        {/* Procurement Officer Profile badge */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-indigo-400 font-semibold text-xs font-mono shadow-inner">
            PO
          </div>
          <div className="hidden sm:block">
            <div className="text-xs font-semibold text-slate-200 flex items-center gap-1">
              Procurement Officer
              <Shield className="w-3 h-3 text-emerald-400" />
            </div>
            <div className="text-[11px] text-slate-400 font-mono">Evaluation & Vigilance</div>
          </div>
        </div>
      </div>
    </header>
  );
};
