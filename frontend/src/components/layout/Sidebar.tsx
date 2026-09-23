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
    <aside className="w-64 bg-slate-950 border-r border-slate-800 min-h-screen flex flex-col justify-between shadow-xl flex-shrink-0">
      <div>
        {/* App Logo & Header */}
        <div className="p-5 border-b border-slate-800/80 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-slate-100 text-lg tracking-tight font-display">ProcureAI</h1>
            <p className="text-xs text-indigo-400 font-medium tracking-wide">Enterprise Intelligence</p>
          </div>
        </div>

        {/* Navigation links */}
        <nav className="p-3 space-y-1">
          <div className="px-3 py-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Evaluation Modules
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-indigo-600/20 text-indigo-300 font-semibold border border-indigo-500/30 shadow-sm'
                      : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
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
      <div className="p-3 space-y-2 border-t border-slate-800/80">
        {onOpenChat && (
          <button
            onClick={onOpenChat}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-gradient-to-r from-indigo-900/40 to-violet-900/40 border border-indigo-500/30 hover:border-indigo-400/50 text-indigo-200 text-xs font-medium transition-all group"
          >
            <span className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-indigo-400 group-hover:animate-bounce" />
              <span>Grok Assistant</span>
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/30 text-indigo-300 font-mono">Ask AI</span>
          </button>
        )}

        <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 text-xs text-slate-400">
          <div className="flex items-center gap-2 font-medium text-slate-300 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>ProcureAI Core Online</span>
          </div>
          <p className="text-[11px] text-slate-400">Gemini 1.5 + Tesseract + Grok pipeline active.</p>
        </div>
      </div>
    </aside>
  );
};
