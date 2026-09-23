import React from 'react';
import { Sparkles, Bot } from 'lucide-react';

interface ChatButtonProps {
  onClick: () => void;
  isOpen: boolean;
}

export const ChatButton: React.FC<ChatButtonProps> = ({ onClick, isOpen }) => {
  if (isOpen) return null;

  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-40 flex items-center space-x-2.5 px-4 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-full shadow-xl shadow-indigo-600/30 hover:shadow-indigo-600/50 hover:scale-105 active:scale-95 transition-all duration-200 border border-indigo-400/30 group"
      title="Open ProcureAI Officer Assistant"
    >
      <div className="relative">
        <Bot className="w-5 h-5 text-white" />
        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-slate-900 animate-pulse"></span>
      </div>
      <div className="flex flex-col text-left">
        <span className="text-xs font-bold tracking-wide uppercase text-indigo-100 flex items-center space-x-1">
          <span>Ask ProcureAI</span>
          <Sparkles className="w-3 h-3 text-amber-300" />
        </span>
        <span className="text-[10px] text-indigo-200/80 font-mono">Grok / xAI Active</span>
      </div>
    </button>
  );
};
