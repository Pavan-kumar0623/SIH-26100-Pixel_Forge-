import React, { useEffect, useState } from 'react';
import {
  Plus,
  Building2,
  ShieldAlert,
  CheckCircle2,
  ChevronRight,
  Upload,
  Search,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { getBidders, createBidder } from '../api/client';
import type { Bidder } from '../types';

interface BiddersProps {
  tenderId: string;
}

export const Bidders: React.FC<BiddersProps> = ({ tenderId }) => {
  const [bidders, setBidders] = useState<Bidder[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    company_name: '',
    cin: '',
    gstin: '',
    pan: '',
    udyam_number: '',
    registered_address: '',
    industry: 'Electrical Equipment',
  });

  const loadBidders = async () => {
    if (!tenderId) return;
    try {
      const data = await getBidders(tenderId);
      setBidders(data || []);
    } catch (err) {
      console.error('Failed to load bidders:', err);
    }
  };

  useEffect(() => {
    loadBidders();
  }, [tenderId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenderId) return;
    setSubmitting(true);
    try {
      const numTenderId = parseInt(tenderId, 10);
      await createBidder({ ...formData, tender_id: numTenderId });
      setShowModal(false);
      setFormData({
        company_name: '',
        cin: '',
        gstin: '',
        pan: '',
        udyam_number: '',
        registered_address: '',
        industry: 'Electrical Equipment',
      });
      loadBidders();
    } catch (err) {
      console.error('Failed to create bidder:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredBidders = bidders.filter((b) =>
    b.company_name.toLowerCase().includes(search.toLowerCase()) ||
    (b.gstin && b.gstin.toLowerCase().includes(search.toLowerCase())) ||
    (b.pan && b.pan.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 font-display flex items-center gap-2.5">
            <Building2 className="w-6 h-6 text-indigo-400" />
            Bidder Management & Registry
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Enrolled procurement bidders, legal identifiers (GSTIN/PAN/CIN), and company intelligence dossiers.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-xl transition shadow-md shadow-indigo-600/20 flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Bidder</span>
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex items-center justify-between bg-slate-900/90 p-4 rounded-xl border border-slate-800 shadow-md">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by company name, GSTIN, PAN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-slate-950/80 border border-slate-700 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
        <span className="text-xs font-semibold text-slate-400 font-mono hidden sm:inline">
          {filteredBidders.length} Bidders Enrolled
        </span>
      </div>

      {/* Grid of Bidders */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBidders.map((bidder) => {
          let isNewlyAdded = false;
          try {
            const stored = JSON.parse(localStorage.getItem('newly_added_bidders') || '[]');
            isNewlyAdded = stored.includes(bidder.id);
          } catch (e) {}

          return (
          <div
            key={bidder.id}
            className={`bg-slate-900/90 rounded-2xl border ${isNewlyAdded ? 'border-indigo-500/60 shadow-indigo-500/10' : 'border-slate-800'} p-6 shadow-xl hover:border-slate-700 transition flex flex-col justify-between space-y-4`}
          >
            <div>
              <div className="flex items-center gap-3.5 mb-4">
                <div className="w-12 h-12 rounded-xl bg-slate-800 text-indigo-400 font-bold flex items-center justify-center text-lg border border-slate-700 font-mono shadow-inner">
                  {bidder.company_name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-slate-100 text-base">{bidder.company_name}</h3>
                    {isNewlyAdded && (
                      <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 rounded-full text-[10px] font-bold font-mono animate-pulse">
                        ✨ NEW
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-indigo-400/80 font-medium">{bidder.industry || 'Railway / General Supplier'}</span>
                </div>
              </div>

              <div className="space-y-2 text-xs text-slate-300 bg-slate-950/50 p-3.5 rounded-xl border border-slate-800/80 mb-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">GSTIN:</span>
                  <span className="font-mono font-semibold text-slate-200">{bidder.gstin || '<Not Provided>'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">PAN:</span>
                  <span className="font-mono font-semibold text-slate-200">{bidder.pan || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">CIN:</span>
                  <span className="font-mono text-slate-300 text-[11px] truncate max-w-[170px]">{bidder.cin || 'N/A'}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2 border-t border-slate-800 pt-4">
              <Link
                to={`/bidders/${bidder.id}`}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition text-center flex items-center justify-center gap-1.5 shadow-sm"
              >
                <span>Bidder Dossier</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
              <Link
                to={`/verification?bidderId=${bidder.id}`}
                className="w-full py-2 bg-indigo-950/40 hover:bg-indigo-900/40 text-indigo-300 border border-indigo-800/40 rounded-lg text-xs font-semibold transition text-center flex items-center justify-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Documents</span>
              </Link>
            </div>
          </div>
          );
        })}
      </div>

      {/* Add Bidder Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-400" />
              Enroll New Bidder
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Company Legal Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Rail Tech Systems Pvt Ltd"
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">GSTIN</label>
                  <input
                    type="text"
                    placeholder="07AABCT1234F1Z5"
                    value={formData.gstin}
                    onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg font-mono text-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">PAN Number</label>
                  <input
                    type="text"
                    placeholder="AABCT1234F"
                    value={formData.pan}
                    onChange={(e) => setFormData({ ...formData, pan: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg font-mono text-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">CIN (Company ID)</label>
                  <input
                    type="text"
                    placeholder="U74999DL2018PTC123456"
                    value={formData.cin}
                    onChange={(e) => setFormData({ ...formData, cin: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg font-mono text-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Udyam Registration</label>
                  <input
                    type="text"
                    placeholder="UDYAM-DL-01-0012345"
                    value={formData.udyam_number}
                    onChange={(e) => setFormData({ ...formData, udyam_number: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg font-mono text-slate-200 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Registered Address</label>
                <input
                  type="text"
                  placeholder="Plot 12, Industrial Area, Okhla, New Delhi"
                  value={formData.registered_address}
                  onChange={(e) => setFormData({ ...formData, registered_address: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200"
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
                  {submitting ? 'Enrolling...' : 'Register Bidder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
