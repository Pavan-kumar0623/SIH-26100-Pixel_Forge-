import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Send,
  RotateCcw,
  Sparkles,
  Bot,
  User,
  ShieldAlert,
  FileText,
  Building,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  MessageSquare
} from 'lucide-react';
import { sendChatMessage, getQuickActions, clearChatSession } from '../../api/client';
import type { ChatMessage, ChatSource, QuickAction } from '../../types';

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  activeTenderId?: number | null;
  activeBidderId?: number | null;
  activeTenderTitle?: string;
  activeBidderName?: string;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  isOpen,
  onClose,
  activeTenderId,
  activeBidderId,
  activeTenderTitle,
  activeBidderName,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [quickActions, setQuickActions] = useState<QuickAction[]>([]);
  const [showSourcesForMsg, setShowSourcesForMsg] = useState<Record<string, boolean>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Initialize session ID and quick actions
  useEffect(() => {
    if (!sessionId) {
      setSessionId(`session-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`);
    }

    getQuickActions()
      .then((actions) => setQuickActions(actions))
      .catch(() => {
        setQuickActions([
          { id: '1', label: 'Summarize Tender', prompt: 'Summarize active tender evaluation and compliance', category: 'Overview' },
          { id: '2', label: 'Check High Risks', prompt: 'Which bidders have HIGH severity risk signals?', category: 'Risk' },
          { id: '3', label: 'Audit Compliance Gaps', prompt: 'What mandatory requirements are unfulfilled?', category: 'Compliance' },
        ]);
      });
  }, []);

  // Initial welcome message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: `**Welcome to ProcureAI Assistant**\n\nI am your conversational intelligence advisor powered by **Grok (xAI)**. I can cross-examine tender requirements, review submitted bidder documents, analyze vigilance risks, and verify compliance matrices.\n\n*How may I assist your tender evaluation today?*`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          model_used: 'Grok Procurement Intelligence',
        },
      ]);
    }
  }, [messages.length]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || input;
    if (!textToSend.trim() || loading) return;

    const userMsgId = `user-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!messageText) setInput('');
    setLoading(true);

    try {
      const response = await sendChatMessage(
        textToSend.trim(),
        activeTenderId || null,
        activeBidderId || null,
        sessionId
      );

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sources: response.sources || [],
        model_used: response.model_used,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `⚠️ **ProcureAI Error**: Could not complete query. ${err?.message || 'Server error'}. Please verify backend status.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        model_used: 'System Fallback',
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleResetSession = async () => {
    if (sessionId) {
      try {
        await clearChatSession(sessionId);
      } catch (e) {
        // ignore
      }
    }
    const newSession = `session-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    setSessionId(newSession);
    setMessages([
      {
        id: 'reset-welcome',
        role: 'assistant',
        content: `Conversation reset. Memory cleared for new inquiry.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        model_used: 'Grok Procurement Intelligence',
      },
    ]);
  };

  const toggleSources = (msgId: string) => {
    setShowSourcesForMsg((prev) => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  const getSourceIcon = (type: string) => {
    switch (type) {
      case 'risk':
        return <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />;
      case 'document':
        return <FileText className="w-3.5 h-3.5 text-sky-400" />;
      case 'bidder':
        return <Building className="w-3.5 h-3.5 text-indigo-400" />;
      case 'compliance':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
      default:
        return <ExternalLink className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] lg:w-[540px] bg-slate-900 border-l border-slate-700 shadow-2xl flex flex-col transform transition-transform duration-300">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/70 backdrop-blur-sm flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="font-semibold text-slate-100 tracking-tight">ProcureAI Assistant</h2>
              <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Grok / xAI
              </span>
            </div>
            <p className="text-xs text-slate-400">Verifiable Procurement & Vigilance AI</p>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={handleResetSession}
            title="Reset Conversation Memory"
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-md transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            title="Close Assistant"
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Active Context Bar */}
      <div className="px-5 py-2 bg-slate-950/40 border-b border-slate-800/80 text-xs flex items-center justify-between text-slate-400">
        <div className="flex items-center space-x-2 overflow-hidden truncate">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="font-medium text-slate-300">Context:</span>
          {activeBidderName ? (
            <span className="truncate text-indigo-300 font-medium">Bidder: {activeBidderName}</span>
          ) : activeTenderTitle ? (
            <span className="truncate text-slate-300">Tender: {activeTenderTitle}</span>
          ) : (
            <span className="text-slate-500 italic">Global Tender Database</span>
          )}
        </div>
      </div>

      {/* Quick Action Chips */}
      <div className="px-4 py-2 border-b border-slate-800/60 bg-slate-900/50 flex items-center space-x-2 overflow-x-auto no-scrollbar">
        {quickActions.map((qa) => (
          <button
            key={qa.id}
            onClick={() => handleSend(qa.prompt)}
            disabled={loading}
            className="whitespace-nowrap text-xs px-2.5 py-1 rounded-full bg-slate-800/80 hover:bg-indigo-900/40 text-slate-300 hover:text-indigo-200 border border-slate-700 hover:border-indigo-500/50 transition-all flex items-center space-x-1"
          >
            <span>{qa.label}</span>
          </button>
        ))}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className="flex items-center space-x-2 mb-1 px-1">
              {msg.role === 'assistant' ? (
                <>
                  <Bot className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-[11px] font-medium text-slate-400">
                    {msg.model_used || 'ProcureAI'}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-[11px] font-medium text-slate-400">Officer</span>
                  <User className="w-3.5 h-3.5 text-slate-400" />
                </>
              )}
              <span className="text-[10px] text-slate-500">{msg.timestamp}</span>
            </div>

            <div
              className={`max-w-[92%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'bg-slate-800/90 text-slate-200 border border-slate-700/80 shadow-md'
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>

              {/* Source Citations */}
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-slate-700/60">
                  <button
                    onClick={() => toggleSources(msg.id)}
                    className="flex items-center justify-between w-full text-xs font-medium text-indigo-300 hover:text-indigo-200 transition-colors"
                  >
                    <span className="flex items-center space-x-1.5">
                      <FileText className="w-3.5 h-3.5" />
                      <span>Verifiable Sources ({msg.sources.length})</span>
                    </span>
                    {showSourcesForMsg[msg.id] ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {showSourcesForMsg[msg.id] && (
                    <div className="mt-2 space-y-1.5">
                      {msg.sources.map((src, i) => (
                        <div
                          key={i}
                          className="p-2 rounded bg-slate-900/80 border border-slate-700/60 text-xs flex items-start space-x-2"
                        >
                          <div className="mt-0.5">{getSourceIcon(src.type)}</div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-200 truncate">{src.label}</p>
                            {src.snippet && (
                              <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">
                                {src.snippet}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-start space-x-3">
            <div className="w-7 h-7 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300">
              <Bot className="w-4 h-4 animate-spin" />
            </div>
            <div className="bg-slate-800 rounded-xl px-4 py-3 border border-slate-700 text-xs text-slate-400 flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping"></span>
              <span>Grounding query with live procurement records...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/80 backdrop-blur-sm">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="relative flex items-center"
        >
          <textarea
            ref={inputRef}
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask Grok about compliance gaps, bidder risks, cartelization..."
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none pr-12"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white transition-colors shadow-md"
            title="Send query"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
          <span>Press Enter to send, Shift+Enter for new line</span>
          <span>xAI Grok Grounded Evaluation</span>
        </div>
      </div>
    </div>
  );
};
