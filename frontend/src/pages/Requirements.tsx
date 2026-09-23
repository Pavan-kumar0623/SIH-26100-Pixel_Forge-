import React, { useEffect, useState } from 'react';
import { Plus, ListCheck, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react';
import { getRequirements, createRequirement, deleteRequirement } from '../api/client';
import type { Requirement } from '../types';

interface RequirementsProps {
  tenderId: string;
}

export const Requirements: React.FC<RequirementsProps> = ({ tenderId }) => {
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    mandatory: true,
    expected_document_type: 'GST_CERTIFICATE',
    validation_rule: '',
  });

  const loadRequirements = async () => {
    if (!tenderId) return;
    try {
      const data = await getRequirements(tenderId);
      setRequirements(data || []);
    } catch (err) {
      console.error('Failed to load requirements:', err);
    }
  };

  useEffect(() => {
    loadRequirements();
  }, [tenderId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenderId) return;
    setSubmitting(true);
    try {
      const numTenderId = parseInt(tenderId, 10);
      await createRequirement({ ...formData, tender_id: numTenderId });
      setShowModal(false);
      setFormData({
        name: '',
        description: '',
        mandatory: true,
        expected_document_type: 'GST_CERTIFICATE',
        validation_rule: '',
      });
      loadRequirements();
    } catch (err) {
      console.error('Failed to create requirement:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string | number) => {
    if (confirm('Delete this tender requirement?')) {
      await deleteRequirement(id);
      loadRequirements();
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 font-display flex items-center gap-2.5">
            <ListCheck className="w-6 h-6 text-indigo-400" />
            Tender Requirements Matrix
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Specify mandatory and optional compliance clauses, expected document types, and verification rules.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-xl transition shadow-md shadow-indigo-600/20 flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Requirement Clause</span>
        </button>
      </div>

      {/* Requirements Table */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
        {requirements.length === 0 ? (
          <div className="p-16 text-center text-slate-400 text-sm">
            No requirement clauses configured for this tender yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300 border-collapse">
              <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 font-semibold uppercase">
                <tr>
                  <th className="px-5 py-3.5">Code / Clause</th>
                  <th className="px-5 py-3.5">Requirement Name</th>
                  <th className="px-5 py-3.5">Mandatory</th>
                  <th className="px-5 py-3.5">Expected Document</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-normal">
                {requirements.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-5 py-3.5 font-mono text-indigo-300 font-bold">
                      {req.code || `REQ-${req.id}`}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-slate-100">{req.name}</div>
                      {req.description && (
                        <p className="text-[11px] text-slate-400 mt-0.5 max-w-md">{req.description}</p>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      {req.mandatory ? (
                        <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold text-[10px]">
                          MANDATORY
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-medium text-[10px]">
                          OPTIONAL
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="px-2.5 py-1 rounded bg-slate-950/60 text-slate-300 font-mono text-[11px] border border-slate-800">
                        {req.expected_document_type}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => handleDelete(req.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition"
                        title="Delete Requirement"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Requirement Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-400" />
              Define Requirement Clause
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Clause Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Valid GSTIN Registration Certificate"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Expected Document Type</label>
                  <select
                    value={formData.expected_document_type}
                    onChange={(e) => setFormData({ ...formData, expected_document_type: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200"
                  >
                    <option value="GST_CERTIFICATE">GST Certificate</option>
                    <option value="PAN_CARD">PAN Card</option>
                    <option value="UDYAM_CERTIFICATE">Udyam Registration</option>
                    <option value="INCORPORATION_CERTIFICATE">Certificate of Incorporation</option>
                    <option value="EXPERIENCE_CERTIFICATE">Experience Certificate</option>
                    <option value="OEM_AUTHORIZATION">OEM Authorization Letter</option>
                    <option value="TECHNICAL_DOCUMENT">Technical Specification</option>
                    <option value="FINANCIAL_DOCUMENT">Audited Financials</option>
                  </select>
                </div>

                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300 font-semibold">
                    <input
                      type="checkbox"
                      checked={formData.mandatory}
                      onChange={(e) => setFormData({ ...formData, mandatory: e.target.checked })}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-950 border-slate-700"
                    />
                    <span>Strictly Mandatory</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Clause Description / Guidance</label>
                <textarea
                  rows={2}
                  placeholder="Specify verification rules (e.g. Must be active within last 3 years)..."
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
                  {submitting ? 'Adding...' : 'Add Requirement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
