import React, { useEffect, useState } from 'react';
import {
  Plus,
  FileText,
  Calendar,
  Building2,
  ListCheck,
  Trash2,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { getTenders, createTender, deleteTender } from '../api/client';
import type { Tender } from '../types';

interface TendersProps {
  onSelectTender?: (id: string) => void;
}

export const Tenders: React.FC<TendersProps> = ({ onSelectTender }) => {
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    category: 'Railway & Infrastructure',
    description: '',
    submission_deadline: '',
  });

  const loadTenders = async () => {
    setLoading(true);
    try {
      const data = await getTenders();
      setTenders(data || []);
    } catch (err) {
      console.error('Failed to load tenders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTenders();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createTender(formData);
      setShowModal(false);
      setFormData({
        title: '',
        category: 'Railway & Infrastructure',
        description: '',
        submission_deadline: '',
      });
      loadTenders();
    } catch (err) {
      console.error('Create tender failed:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string | number) => {
    if (confirm('Are you sure you want to delete this tender and all attached requirements/bidders?')) {
      await deleteTender(id);
      loadTenders();
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 font-display flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-indigo-400" />
            Tender Registry & Scope
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Create, configure, and inspect public and enterprise procurement tenders.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-xl transition shadow-md shadow-indigo-600/20 flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Publish New Tender</span>
        </button>
      </div>

      {/* Tender List Cards */}
      {loading ? (
        <div className="p-16 text-center text-slate-400 text-sm">
          <span className="inline-block w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-2"></span>
          <p>Loading registered tenders...</p>
        </div>
      ) : tenders.length === 0 ? (
        <div className="p-16 text-center text-slate-400 text-sm bg-slate-900/50 rounded-2xl border border-slate-800">
          No procurement tenders registered yet. Click Publish New Tender to begin.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tenders.map((tender) => (
            <div
              key={tender.id}
              className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 shadow-xl hover:border-slate-700 transition flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2.5 py-1 bg-indigo-500/20 text-indigo-300 font-mono text-xs font-semibold rounded-md border border-indigo-500/30">
                    {tender.tender_id}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold uppercase tracking-wider">
                    {tender.status || 'ACTIVE'}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-100 mb-2 font-display">{tender.title}</h3>
                <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed mb-4">
                  {tender.description || 'No description provided.'}
                </p>

                <div className="space-y-1.5 text-xs text-slate-400 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <Calendar className="w-3.5 h-3.5 text-indigo-400" /> Deadline:
                    </span>
                    <span className="font-mono text-slate-300">{tender.submission_deadline || 'Open'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <ListCheck className="w-3.5 h-3.5 text-indigo-400" /> Category:
                    </span>
                    <span className="text-slate-300">{tender.category || 'General'}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-slate-800">
                <button
                  onClick={() => onSelectTender?.(String(tender.id))}
                  className="flex-1 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5"
                >
                  <span>Select Active</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(tender.id)}
                  className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg border border-transparent hover:border-rose-800/40 transition"
                  title="Delete Tender"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Tender Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-400" />
              Publish New Tender
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Tender Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Modernization of Signaling Infrastructure"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Category</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Submission Deadline</label>
                  <input
                    type="date"
                    value={formData.submission_deadline}
                    onChange={(e) => setFormData({ ...formData, submission_deadline: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Description / Scope of Work</label>
                <textarea
                  rows={3}
                  placeholder="Outline technical requirements, scope, and qualification clauses..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-700 rounded-lg text-slate-300 font-semibold text-xs hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold text-xs shadow-md transition"
                >
                  {submitting ? 'Creating...' : 'Publish Tender'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
