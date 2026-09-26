import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  ListCheck,
  Building2,
  FileSearch,
  CheckCircle2,
  AlertTriangle,
  Network,
  Columns3,
  Download,
  ShieldCheck,
  Bot
} from 'lucide-react';

interface SidebarProps {
  currentTenderId?: string | number;
  onOpenChat?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTenderId, onOpenChat }) => {
  const tenderParam = currentTenderId ? `?tenderId=${currentTenderId}` : '';

  const navItems = [
    { to: '/', label: 'Overview Dashboard', icon: LayoutDashboard },
    { to: '/tenders', label: 'Tender Registry', icon: FileText },
    { to: `/requirements${tenderParam}`, label: 'Requirements Matrix', icon: ListCheck },
    { to: `/bidders${tenderParam}`, label: 'Bidder Dossiers', icon: Building2 },
    { to: `/verification${tenderParam}`, label: 'Document & Evidence OCR', icon: FileSearch },
    { to: `/compliance${tenderParam}`, label: 'Compliance Audit', icon: CheckCircle2 },
    { to: `/risk-signals${tenderParam}`, label: 'Vigilance & Risks', icon: AlertTriangle },
    { to: `/risk-graph${tenderParam}`, label: 'Entity Network Graph', icon: Network },
    { to: `/comparison${tenderParam}`, label: 'Bidder Comparison', icon: Columns3 },
    { to: `/export${tenderParam}`, label: 'Audit Reports & Export', icon: Download },
  ];

  return (
    <aside className="w-64 bg-[#0b0f19] border-r border-[#1e293b] min-h-screen flex flex-col justify-between shadow-xl flex-shrink-0">
      <div>
        {/* App Logo & Header */}
        <div className="p-4 border-b border-[#1e293b] flex items-center gap-3">
          <div className="w-9 h-9 rounded bg-[#6366f1] flex items-center justify-center text-white shadow-md shadow-indigo-600/30 flex-shrink-0">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-slate-100 text-base tracking-tight font-display">ProcureAI</h1>
            <p className="text-[11px] text-[#6366f1] font-mono font-medium tracking-wide uppercase">Enterprise Intelligence</p>
          </div>
        </div>

        {/* Navigation links */}
        <nav className="p-3 space-y-1">
          <div className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">
            Evaluation Modules
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded text-xs font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-[#6366f1]/15 text-[#c0c1ff] font-semibold border border-[#6366f1]/40 shadow-sm'
                      : 'text-slate-400 hover:bg-[#111827] hover:text-slate-200'
                  }`
                }
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Assistant Quick Trigger + System Health */}
      <div className="p-3 space-y-2 border-t border-[#1e293b]">
        {onOpenChat && (
          <button
            onClick={onOpenChat}
            className="w-full flex items-center justify-between px-3 py-2 rounded bg-[#111827] border border-[#334155] hover:border-[#6366f1] text-slate-200 text-xs font-medium transition-all group"
          >
            <span className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-[#6366f1] group-hover:scale-110 transition-transform" />
              <span>Grok Assistant</span>
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#6366f1]/20 text-[#c0c1ff] font-mono uppercase font-bold">Ask AI</span>
          </button>
        )}

        <div className="p-3 bg-[#111827] rounded border border-[#1e293b] text-xs text-slate-400">
          <div className="flex items-center gap-2 font-medium text-slate-300 mb-1">
            <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse"></span>
            <span className="font-mono text-[11px] font-semibold">PROCUREAI CORE ONLINE</span>
          </div>
          <p className="text-[11px] text-slate-500 font-mono">Gemini 1.5 + Tesseract + Grok active</p>
        </div>
      </div>
    </aside>
  );
};
