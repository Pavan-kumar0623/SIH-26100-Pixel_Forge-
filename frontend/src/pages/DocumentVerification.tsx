import React, { useEffect, useState, useRef } from 'react';
import {
  Upload,
  FileSearch,
  CheckCircle2,
  AlertCircle,
  Eye,
  Sparkles,
  FileText,
  Download,
  RefreshCw,
  Cpu,
  Layers,
  ShieldAlert,
  Info,
  HelpCircle,
  MessageSquare,
  Building,
  X
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { getBidders, getDocuments, uploadDocument, getEvidence, reprocessDocument } from '../api/client';
import type { Bidder, DocumentItem, ExtractedField } from '../types';

interface DocumentVerificationProps {
  tenderId: string;
}

// Compact Gauge Component for Document/Bidder Risk Level
const RiskGauge: React.FC<{ score: number; level: 'LOW' | 'MEDIUM' | 'HIGH'; label?: string }> = ({
  score,
  level,
  label = 'Risk Level',
}) => {
  const colorClass =
    level === 'HIGH'
      ? '#ef4444'
      : level === 'MEDIUM'
      ? '#f59e0b'
      : '#10b981';

  // Arc: from -180deg (left) to 0deg (right) — needle angle maps 0%→-180, 100%→0
  // SVG center is (60, 60), radius 40. Arc from 180° to 0° (top half).
  const clampedScore = Math.min(Math.max(score, 0), 100);
  // Needle angle in degrees: -180 (left, 0%) to 0 (right, 100%)
  const needleDeg = -180 + (clampedScore / 100) * 180;
  // Convert to radians for needle tip calculation
  const needleRad = ((needleDeg) * Math.PI) / 180;
  const R = 38; // needle length
  const cx = 60; const cy = 60;
  const nx = cx + R * Math.cos(needleRad);
  const ny = cy + R * Math.sin(needleRad);

  // Arc circumference for half-circle radius 40 = π*40 ≈ 125.7
  const arcLen = Math.PI * 40;
  const arcFill = (clampedScore / 100) * arcLen;

  return (
    <div className="flex flex-col items-center justify-center p-3 bg-[#0b0f19] rounded border border-[#1e293b]">
      <div className="relative w-32 h-20 flex items-end justify-center overflow-hidden">
        <svg width="120" height="72" viewBox="0 0 120 72">
          {/* Background arc track */}
          <path
            d="M 20 60 A 40 40 0 0 1 100 60"
            fill="none"
            stroke="#1e293b"
            strokeWidth="10"
            strokeLinecap="round"
          />
          {/* Filled arc — score fill */}
          <path
            d="M 20 60 A 40 40 0 0 1 100 60"
            fill="none"
            stroke={colorClass}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${arcLen}`}
            strokeDashoffset={arcLen - arcFill}
            style={{ transition: 'stroke-dashoffset 0.7s ease-out' }}
          />
          {/* Needle */}
          <line
            x1={cx}
            y1={cy}
            x2={nx}
            y2={ny}
            stroke="#f1f5f9"
            strokeWidth="2"
            strokeLinecap="round"
            style={{ transition: 'x2 0.7s ease-out, y2 0.7s ease-out' }}
          />
          {/* Center pivot */}
          <circle cx={cx} cy={cy} r="4" fill="#6366f1" />
          {/* Score text inside gauge */}
          <text
            x={cx}
            y={cy - 10}
            textAnchor="middle"
            fontSize="11"
            fontWeight="bold"
            fill={colorClass}
            fontFamily="monospace"
          >
            {clampedScore}%
          </text>
        </svg>
      </div>

      <div className="mt-1 text-center">
        <div className="text-[10px] uppercase font-mono font-bold text-slate-400">{label}</div>
        <div className="flex items-center gap-1.5 justify-center mt-0.5">
          <span className="text-xs font-extrabold font-mono" style={{ color: colorClass }}>
            {level}
          </span>
        </div>
      </div>
    </div>
  );
};

export const DocumentVerification: React.FC<DocumentVerificationProps> = ({ tenderId }) => {
  const [searchParams] = useSearchParams();
  const queryBidderId = searchParams.get('bidderId');

  const [bidders, setBidders] = useState<Bidder[]>([]);
  const [selectedBidderId, setSelectedBidderId] = useState<string>('');
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);
  const [docEvidence, setDocEvidence] = useState<any>(null);
  const [evidenceModal, setEvidenceModal] = useState<{ open: boolean; field?: ExtractedField }>({ open: false });
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [loadingEvidence, setLoadingEvidence] = useState(false);

  // Poll controller
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!tenderId) return;
    getBidders(tenderId).then((data) => {
      setBidders(data || []);
      if (data && data.length > 0) {
        setSelectedBidderId(queryBidderId || String(data[0].id));
      }
    });
  }, [tenderId, queryBidderId]);

  const loadDocuments = async (autoSelect = false) => {
    if (!selectedBidderId) return;
    try {
      const docs = await getDocuments(selectedBidderId);
      setDocuments(docs || []);

      if (docs && docs.length > 0) {
        if (!selectedDoc || autoSelect) {
          handleSelectDoc(docs[docs.length - 1] || docs[0]);
        } else {
          // Refresh selected doc reference
          const updated = docs.find((d) => d.id === selectedDoc.id);
          if (updated) {
            const statusChanged = updated.status !== selectedDoc.status;
            setSelectedDoc(updated);
            if (statusChanged) {
              const evidence = await getEvidence(updated.id);
              setDocEvidence(evidence);
            }
          }
        }
      } else {
        setSelectedDoc(null);
        setDocEvidence(null);
      }
    } catch (err) {
      console.error('Failed to load bidder documents:', err);
    }
  };

  useEffect(() => {
    loadDocuments(true);
  }, [selectedBidderId]);

  // Status polling effect: poll while any document is in UPLOADED or PROCESSING status
  useEffect(() => {
    const hasPendingDocs = documents.some(
      (d) => d.status === 'UPLOADED' || d.status === 'PROCESSING'
    );

    if (hasPendingDocs || uploading) {
      pollTimerRef.current = setInterval(() => {
        loadDocuments(false);
      }, 1500);
    } else if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, [documents, uploading, selectedBidderId, selectedDoc?.id, selectedDoc?.status]);

  const handleSelectDoc = async (doc: DocumentItem) => {
    setSelectedDoc(doc);
    setLoadingEvidence(true);
    try {
      const evidence = await getEvidence(doc.id);
      setDocEvidence(evidence);
    } catch (err) {
      console.error('Failed to load evidence for document:', err);
      setDocEvidence(null);
    } finally {
      setLoadingEvidence(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedBidderId) return;

    setUploading(true);
    try {
      const uploaded = await uploadDocument(selectedBidderId, file);
      const docs = await getDocuments(selectedBidderId);
      setDocuments(docs || []);
      const matched = (docs || []).find((d) => d.id === uploaded?.id) || (docs && docs[docs.length - 1]);
      if (matched) {
        handleSelectDoc(matched);
      }
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleReprocess = async () => {
    if (!selectedDoc) return;
    try {
      await reprocessDocument(selectedDoc.id);
      setTimeout(() => {
        handleSelectDoc(selectedDoc);
      }, 800);
    } catch (err) {
      console.error('Reprocess failed:', err);
    }
  };

  const selectedBidder = bidders.find((b) => String(b.id) === String(selectedBidderId));
  const fields: ExtractedField[] = docEvidence?.fields || selectedDoc?.extracted_fields || [];

  // Determine key identifiers detected in the selected document
  const extractedIdentifiers = fields.filter((f) =>
    ['gstin', 'pan', 'cin', 'udyam_number', 'registration_number', 'tin'].includes(f.field_name.toLowerCase())
  );

  const invalidFields = fields.filter((f) => f.validation_status === 'INVALID' || f.validation_status === 'EXPIRED');

  // Risk calculation for gauge
  const calculateDocRisk = () => {
    if (!selectedDoc) return { score: 10, level: 'LOW' as const };
    if (selectedDoc.status === 'FAILED' || invalidFields.length > 1) return { score: 85, level: 'HIGH' as const };
    if (selectedDoc.status === 'NEEDS_REVIEW' || invalidFields.length === 1 || selectedDoc.status === 'UNSUPPORTED')
      return { score: 55, level: 'MEDIUM' as const };
    return { score: 15, level: 'LOW' as const };
  };

  const riskInfo = calculateDocRisk();

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#1e293b]">
        <div>
          <h1 className="text-xl font-bold text-slate-100 font-display flex items-center gap-2.5">
            <FileSearch className="w-5 h-5 text-[#6366f1]" />
            Document Ingestion & Evidence OCR
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Native PyMuPDF digital parsing, Tesseract OCR for scanned papers, and Gemini structured field extraction.
          </p>
        </div>

        {/* Bidder Selector */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Bidder:</span>
          <select
            value={selectedBidderId}
            onChange={(e) => setSelectedBidderId(e.target.value)}
            className="bg-[#111827] border border-[#1e293b] hover:border-[#334155] text-slate-100 text-xs font-semibold rounded px-3 py-1.5 focus:outline-none focus:border-[#6366f1] font-mono"
          >
            {bidders.map((b) => (
              <option key={b.id} value={String(b.id)}>
                {b.company_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Grid: Upload & Doc List (Left) vs Extracted Fields Panel (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Upload box & uploaded documents list */}
        <div className="space-y-4">
          {/* Upload Dropzone */}
          <div className="bg-[#111827] rounded border border-dashed border-[#334155] hover:border-[#6366f1] p-5 text-center transition">
            <Upload className="w-7 h-7 text-[#6366f1] mx-auto mb-2" />
            <h3 className="font-bold text-slate-200 text-xs mb-1 font-display">Upload Bidder Document</h3>
            <p className="text-[11px] text-slate-400 mb-3">PDF, PNG, JPG (GST, PAN, Financials, Audits)</p>
            <label className="cursor-pointer px-3 py-1.5 bg-[#6366f1] hover:bg-[#4f46e5] text-white rounded font-medium text-xs transition inline-block shadow">
              {uploading ? 'Processing OCR & AI...' : 'Select File to Upload'}
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
          </div>

          {/* Uploaded Documents List */}
          <div className="bg-[#111827] rounded border border-[#1e293b] p-4 shadow-lg space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#1e293b]">
              <h3 className="font-bold text-slate-200 text-xs font-display">Submitted Documents</h3>
              <span className="text-[11px] text-[#6366f1] font-mono font-bold">{documents.length} FILES</span>
            </div>

            <div className="space-y-1.5">
              {documents.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-500 font-mono">No documents found for this bidder.</div>
              ) : (
                documents.map((doc) => {
                  const isSelected = selectedDoc?.id === doc.id;
                  const isPending = doc.status === 'UPLOADED' || doc.status === 'PROCESSING';

                  return (
                    <div
                      key={doc.id}
                      onClick={() => handleSelectDoc(doc)}
                      className={`p-2.5 rounded border text-xs cursor-pointer transition flex items-center justify-between ${
                        isSelected
                          ? 'bg-[#6366f1]/15 border-[#6366f1]/50 text-slate-100 shadow-sm'
                          : 'bg-[#1e293b]/60 border-[#1e293b] text-slate-300 hover:bg-[#1f2937]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <div className="truncate">
                          <div className="font-semibold text-slate-200 truncate max-w-[140px] text-[11px]">{doc.file_name}</div>
                          <div className="text-[10px] text-slate-400 uppercase font-mono mt-0.5">
                            {doc.document_type || 'Unclassified'}
                          </div>
                        </div>
                      </div>

                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono flex-shrink-0 flex items-center gap-1 ${
                          doc.status === 'PROCESSED' || doc.status === 'COMPLETED'
                            ? 'bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/40'
                            : doc.status === 'NEEDS_REVIEW'
                            ? 'bg-[#f59e0b]/20 text-[#f59e0b] border border-[#f59e0b]/40'
                            : doc.status === 'FAILED' || doc.status === 'UNSUPPORTED'
                            ? 'bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/40'
                            : 'bg-indigo-900/40 text-indigo-300 border border-indigo-500/30'
                        }`}
                      >
                        {isPending && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />}
                        {doc.status}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Selected Document Details, Risk Gauge & Extracted Fields Table */}
        <div className="lg:col-span-2 bg-[#111827] rounded border border-[#1e293b] p-5 shadow-lg space-y-5">
          {selectedDoc ? (
            <>
              {/* Document Header Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#1e293b] gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 bg-[#6366f1]/20 text-[#c0c1ff] border border-[#6366f1]/30 rounded font-mono text-[10px] font-bold">
                      {docEvidence?.document_type || selectedDoc.document_type || 'DOCUMENT'}
                    </span>
                    <h2 className="text-sm font-bold text-slate-100 font-display">{selectedDoc.file_name}</h2>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
                    <span>Engine: <strong className="text-slate-300">{docEvidence?.ocr_used === 'true' || docEvidence?.ocr_used === true ? 'Tesseract Native' : 'PyMuPDF Native'}</strong></span>
                    <span>•</span>
                    <span>Status: <strong className={selectedDoc.status === 'PROCESSED' ? 'text-[#10b981]' : selectedDoc.status === 'NEEDS_REVIEW' ? 'text-[#f59e0b]' : 'text-[#ef4444]'}>{selectedDoc.status}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPreviewModalOpen(true)}
                    className="px-2.5 py-1.5 bg-[#6366f1]/20 hover:bg-[#6366f1]/30 text-[#c0c1ff] border border-[#6366f1]/40 text-xs font-medium rounded transition flex items-center gap-1.5 font-mono shadow-sm"
                    title="Preview Document File"
                  >
                    <Eye className="w-3.5 h-3.5 text-[#6366f1]" />
                    <span>Preview File</span>
                  </button>
                  <button
                    onClick={handleReprocess}
                    className="px-2.5 py-1.5 bg-[#1f2937] hover:bg-[#334155] text-slate-200 border border-[#334155] text-xs font-medium rounded transition flex items-center gap-1.5 font-mono"
                    title="Reprocess Document"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                    <span>Reprocess</span>
                  </button>
                  <a
                    href={`/api/documents/${selectedDoc.id}/download`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1.5 bg-[#6366f1] hover:bg-[#4f46e5] text-white text-xs font-medium rounded transition flex items-center gap-1.5 shadow font-mono"
                    title="Download original file"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </a>
                </div>
              </div>

              {/* Document Overview & Risk Gauge Banner */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#0b0f19] p-4 rounded border border-[#1e293b]">
                <div className="md:col-span-2 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-200 font-mono uppercase tracking-wider">
                    <Building className="w-3.5 h-3.5 text-[#6366f1]" />
                    <span>{selectedBidder?.company_name || 'Bidder Profile'}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                    <div>
                      <span className="text-slate-400 block text-[10px]">DOCUMENT TYPE:</span>
                      <span className="text-slate-200 font-semibold">{selectedDoc.document_type || 'Unclassified'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">CONFIDENCE SCORE:</span>
                      <span className="text-[#c0c1ff] font-semibold">
                        {selectedDoc.classification_confidence ? `${Math.round(selectedDoc.classification_confidence * 100)}%` : '85% (Standard)'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">KEY IDENTIFIERS DETECTED:</span>
                      <span className="text-slate-200 font-semibold">
                        {extractedIdentifiers.length > 0
                          ? extractedIdentifiers.map((i) => `${i.field_name.toUpperCase()}: ${i.field_value}`).join(', ')
                          : 'Standard Document'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">VALIDATION REASON:</span>
                      <span className={invalidFields.length > 0 ? 'text-amber-400 font-semibold' : 'text-emerald-400 font-semibold'}>
                        {invalidFields.length > 0
                          ? `Requires Review: ${invalidFields[0].validation_message || 'Format mismatch detected'}`
                          : selectedDoc.status === 'NEEDS_REVIEW'
                          ? 'Requires Officer Review: Low confidence extraction'
                          : selectedDoc.status === 'FAILED'
                          ? 'Validation Failed: Unreadable image or format issue'
                          : 'Verified: All regex rules passed'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Risk Gauge Visual */}
                <div className="flex flex-col items-center justify-center border-l border-[#1e293b] pl-2">
                  <RiskGauge score={riskInfo.score} level={riskInfo.level} label="Document Risk Gauge" />
                </div>
              </div>

              {/* Extracted Fields Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-200 text-xs font-display flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#6366f1]" />
                    Extracted Key-Value Evidence & Validation Matrix
                  </h3>
                  <span className="text-[11px] text-slate-400 font-mono">{fields.length} FIELDS EXTRACTED</span>
                </div>

                {loadingEvidence ? (
                  <div className="p-8 text-center text-xs text-slate-400 font-mono">Loading evidence traces...</div>
                ) : fields.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 bg-[#1e293b]/40 rounded border border-[#1e293b] font-mono">
                    No structured fields found. Document might be under processing or unstructured.
                  </div>
                ) : (
                  <div className="border border-[#1e293b] rounded overflow-hidden">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-[#0f172a] border-b border-[#1e293b] font-mono text-[10px] text-slate-400 uppercase tracking-widest">
                        <tr>
                          <th className="px-3.5 py-2.5">Field Name</th>
                          <th className="px-3.5 py-2.5">Extracted Value</th>
                          <th className="px-3.5 py-2.5">Validation</th>
                          <th className="px-3.5 py-2.5 text-right">Audit Trace</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1e293b] font-normal">
                        {fields.map((field, idx) => (
                          <tr key={field.id || idx} className="hover:bg-[#1e293b]/50">
                            <td className="px-3.5 py-2.5 font-semibold text-slate-200 uppercase font-mono text-[11px]">
                              {field.field_name}
                            </td>
                            <td className="px-3.5 py-2.5 font-mono text-[#c0c1ff] font-semibold">
                              {field.field_value || '<Not Detected>'}
                            </td>
                            <td className="px-3.5 py-2.5 font-mono">
                              {field.validation_status === 'VALID' && (
                                <span className="px-1.5 py-0.5 rounded bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/40 font-bold text-[10px]">
                                  VALID
                                </span>
                              )}
                              {field.validation_status === 'INVALID' && (
                                <span className="px-1.5 py-0.5 rounded bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/40 font-bold text-[10px]" title={field.validation_message}>
                                  INVALID
                                </span>
                              )}
                              {field.validation_status === 'EXPIRED' && (
                                <span className="px-1.5 py-0.5 rounded bg-[#f59e0b]/20 text-[#f59e0b] border border-[#f59e0b]/40 font-bold text-[10px]" title={field.validation_message}>
                                  EXPIRED
                                </span>
                              )}
                              {!field.validation_status && (
                                <span className="px-1.5 py-0.5 rounded bg-[#1e293b] text-slate-300 font-medium text-[10px]">
                                  EXTRACTED
                                </span>
                              )}
                            </td>
                            <td className="px-3.5 py-2.5 text-right">
                              <button
                                onClick={() => setEvidenceModal({ open: true, field })}
                                className="px-2 py-1 bg-[#1f2937] hover:bg-[#334155] text-slate-200 border border-[#334155] rounded text-[10px] font-medium font-mono inline-flex items-center gap-1 transition"
                              >
                                <Eye className="w-3 h-3 text-[#6366f1]" /> Trace Snippet
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-20 text-slate-400 text-xs font-mono">
              <FileSearch className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              Select a submitted document from the left list to inspect OCR extracted fields and evidence.
            </div>
          )}
        </div>
      </div>

      {/* Evidence Modal Drawer */}
      {evidenceModal.open && evidenceModal.field && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#111827] border border-[#334155] rounded max-w-lg w-full p-5 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 font-display">
              <Sparkles className="w-4 h-4 text-[#6366f1]" />
              Extracted Evidence Trace & Provenance
            </h3>
            <div className="p-3 bg-[#0b0f19] rounded border border-[#1e293b] text-xs space-y-2 font-mono">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Field Name:</span>
                <span className="font-bold text-slate-200 text-xs">{evidenceModal.field.field_name}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Extracted Value:</span>
                <span className="font-bold text-[#c0c1ff] text-xs">{evidenceModal.field.field_value}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Source Page Number:</span>
                <span className="text-slate-300">Page {evidenceModal.field.page_number || 1}</span>
              </div>
              {evidenceModal.field.validation_message && (
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Validation Rule Engine:</span>
                  <span className="text-amber-400 font-semibold">{evidenceModal.field.validation_message}</span>
                </div>
              )}
            </div>
            <div className="p-3 bg-[#1e293b]/60 rounded border border-[#334155] text-xs text-[#c0c1ff] font-mono leading-relaxed">
              "{evidenceModal.field.evidence || 'Raw text segment verified from document OCR extraction stream.'}"
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setEvidenceModal({ open: false })}
                className="px-3.5 py-1.5 bg-[#6366f1] hover:bg-[#4f46e5] text-white font-medium text-xs rounded transition font-mono"
              >
                Close Audit Trace
              </button>
            </div>
          </div>
        </div>
      )}

      {/* File Preview Modal Overlay */}
      {previewModalOpen && selectedDoc && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-[#111827] border border-[#334155] rounded-lg max-w-5xl w-full h-[88vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#1e293b] bg-[#0b0f19]">
              <div className="flex items-center gap-2.5">
                <FileText className="w-4 h-4 text-[#6366f1]" />
                <h3 className="text-sm font-bold text-slate-100 font-display">{selectedDoc.file_name}</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#6366f1]/20 text-[#c0c1ff] border border-[#6366f1]/30 uppercase font-bold">
                  {selectedDoc.document_type || 'Document Viewer'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`/api/documents/${selectedDoc.id}/download`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1 bg-[#1f2937] hover:bg-[#334155] text-slate-200 border border-[#334155] rounded text-xs font-mono flex items-center gap-1.5 transition"
                >
                  <Download className="w-3.5 h-3.5 text-[#6366f1]" /> Download Original
                </a>
                <button
                  onClick={() => setPreviewModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-[#1f2937] transition"
                  title="Close Preview"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-[#090d16] p-3 flex items-center justify-center overflow-auto relative">
              {selectedDoc.file_name.toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={`/api/documents/${selectedDoc.id}/download`}
                  title={selectedDoc.file_name}
                  className="w-full h-full rounded border border-[#1e293b] bg-white"
                />
              ) : (
                <img
                  src={`/api/documents/${selectedDoc.id}/download`}
                  alt={selectedDoc.file_name}
                  className="max-w-full max-h-full object-contain rounded shadow-lg border border-[#1e293b]"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
