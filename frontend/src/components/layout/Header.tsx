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
    <header className="h-14 bg-[#0b0f19] border-b border-[#1e293b] px-6 flex items-center justify-between sticky top-0 z-30 shadow-md">
      <div className="flex items-center gap-4">
        {/* Tender Selector dropdown */}
        <div className="flex items-center gap-2.5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
            <span className="w-2 h-2 rounded bg-[#6366f1]"></span>
            Active Tender:
          </span>
          <select
            value={selectedTenderId ? String(selectedTenderId) : ''}
            onChange={(e) => onSelectTender?.(e.target.value)}
            className="bg-[#111827] border border-[#1e293b] hover:border-[#334155] text-slate-100 text-xs font-semibold rounded px-3 py-1.5 focus:outline-none focus:border-[#6366f1] max-w-[360px] truncate font-mono"
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
            className="flex items-center space-x-2 px-3 py-1.5 rounded bg-[#111827] hover:bg-[#1f2937] border border-[#334155] hover:border-[#6366f1] text-[#c0c1ff] text-xs font-medium transition-all shadow-sm group"
          >
            <Bot className="w-3.5 h-3.5 text-[#6366f1] group-hover:scale-110 transition-transform" />
            <span>Ask Grok AI</span>
            <Sparkles className="w-3 h-3 text-amber-400" />
          </button>
        )}

        <div className="h-5 w-px bg-[#1e293b]"></div>

        {/* Procurement Officer Profile badge */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded bg-[#1e293b] border border-[#334155] flex items-center justify-center text-[#6366f1] font-bold text-xs font-mono">
            PO
          </div>
          <div className="hidden sm:block">
            <div className="text-xs font-semibold text-slate-200 flex items-center gap-1">
              Procurement Officer
              <Shield className="w-3 h-3 text-[#10b981]" />
            </div>
            <div className="text-[10px] text-slate-500 font-mono uppercase">Auditing Tier 1</div>
          </div>
        </div>
      </div>
    </header>
  );
};
