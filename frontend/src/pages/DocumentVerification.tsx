import React, { useEffect, useState } from 'react';
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
  Layers
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { getBidders, getDocuments, uploadDocument, getEvidence, reprocessDocument } from '../api/client';
import type { Bidder, DocumentItem, ExtractedField } from '../types';

interface DocumentVerificationProps {
  tenderId: string;
}

export const DocumentVerification: React.FC<DocumentVerificationProps> = ({ tenderId }) => {
  const [searchParams] = useSearchParams();
  const queryBidderId = searchParams.get('bidderId');

  const [bidders, setBidders] = useState<Bidder[]>([]);
  const [selectedBidderId, setSelectedBidderId] = useState<string>('');
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);
  const [docEvidence, setDocEvidence] = useState<any>(null);
  const [evidenceModal, setEvidenceModal] = useState<{ open: boolean; field?: ExtractedField }>({ open: false });

  const [uploading, setUploading] = useState(false);
  const [loadingEvidence, setLoadingEvidence] = useState(false);

  useEffect(() => {
    if (!tenderId) return;
    getBidders(tenderId).then((data) => {
      setBidders(data || []);
      if (data && data.length > 0) {
        setSelectedBidderId(queryBidderId || String(data[0].id));
      }
    });
  }, [tenderId, queryBidderId]);

  const loadDocuments = async () => {
    if (!selectedBidderId) return;
    try {
      const docs = await getDocuments(selectedBidderId);
      setDocuments(docs || []);
      if (docs && docs.length > 0) {
        handleSelectDoc(docs[0]);
      } else {
        setSelectedDoc(null);
        setDocEvidence(null);
      }
    } catch (err) {
      console.error('Failed to load bidder documents:', err);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [selectedBidderId]);

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
      await uploadDocument(selectedBidderId, file);
      await loadDocuments();
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleReprocess = async () => {
    if (!selectedDoc) return;
    try {
      await reprocessDocument(selectedDoc.id);
      setTimeout(() => {
        handleSelectDoc(selectedDoc);
      }, 1000);
    } catch (err) {
      console.error('Reprocess failed:', err);
    }
  };

  const fields: ExtractedField[] = docEvidence?.fields || selectedDoc?.extracted_fields || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 font-display flex items-center gap-2.5">
            <FileSearch className="w-6 h-6 text-indigo-400" />
            Document Ingestion & Evidence OCR
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Native PyMuPDF digital parsing, Tesseract OCR for scanned papers, and Gemini structured field extraction.
          </p>
        </div>

        {/* Bidder Selector */}
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Bidder:</span>
          <select
            value={selectedBidderId}
            onChange={(e) => setSelectedBidderId(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-slate-100 text-sm font-semibold rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-7">
        {/* Left Column: Upload box & uploaded documents list */}
        <div className="space-y-5">
          {/* Upload Dropzone */}
          <div className="bg-slate-900/90 rounded-2xl border-2 border-dashed border-indigo-500/30 hover:border-indigo-500/60 p-6 text-center transition bg-indigo-950/10">
            <Upload className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
            <h3 className="font-bold text-slate-200 text-sm mb-1">Upload Bidder Document</h3>
            <p className="text-xs text-slate-400 mb-4">Supports PDF, PNG, JPG (GST, PAN, Incorporation, Experience)</p>
            <label className="cursor-pointer px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium text-xs transition inline-block shadow-md shadow-indigo-600/20">
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
          <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="font-bold text-slate-200 text-sm">Submitted Documents</h3>
              <span className="text-xs text-indigo-400 font-mono font-medium">{documents.length} Files</span>
            </div>

            <div className="space-y-2">
              {documents.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-500">No documents found for this bidder.</div>
              ) : (
                documents.map((doc) => {
                  const isSelected = selectedDoc?.id === doc.id;
                  return (
                    <div
                      key={doc.id}
                      onClick={() => handleSelectDoc(doc)}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition flex items-center justify-between ${
                        isSelected
                          ? 'bg-indigo-600/20 border-indigo-500/60 text-indigo-100 shadow-sm'
                          : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <div className="truncate">
                          <div className="font-semibold text-slate-200 truncate max-w-[150px]">{doc.file_name}</div>
                          <div className="text-[10px] text-slate-400 uppercase font-mono mt-0.5">
                            {doc.document_type || 'Unclassified'}
                          </div>
                        </div>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 ${
                          doc.status === 'PROCESSED' || doc.status === 'COMPLETED'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : doc.status === 'NEEDS_REVIEW'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : doc.status === 'FAILED' || doc.status === 'UNSUPPORTED'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        {doc.status}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Selected Document Extracted Fields & Confidence */}
        <div className="lg:col-span-2 bg-slate-900/90 rounded-2xl border border-slate-800 p-6 shadow-xl space-y-6">
          {selectedDoc ? (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-md font-mono text-xs font-bold">
                      {docEvidence?.document_type || selectedDoc.document_type || 'DOCUMENT'}
                    </span>
                    <h2 className="text-base font-bold text-slate-100">{selectedDoc.file_name}</h2>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span>OCR Mode: <strong className="text-slate-300">{docEvidence?.ocr_used === 'true' || docEvidence?.ocr_used === true ? 'Tesseract Native' : 'PyMuPDF Native'}</strong></span>
                    <span>•</span>
                    <span>Status: <strong className="text-emerald-400">{selectedDoc.status}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleReprocess}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium rounded-lg transition flex items-center gap-1.5"
                    title="Reprocess Document"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                    <span>Reprocess</span>
                  </button>
                  <a
                    href={`/api/documents/${selectedDoc.id}/download`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg transition flex items-center gap-1.5 shadow-sm"
                    title="Download original file"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </a>
                </div>
              </div>

              {/* Extracted Fields Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    Extracted Key-Value Evidence & Validation
                  </h3>
                  <span className="text-xs text-slate-400 font-mono">{fields.length} Fields Extracted</span>
                </div>

                {loadingEvidence ? (
                  <div className="p-8 text-center text-xs text-slate-400">Loading evidence traces...</div>
                ) : fields.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 bg-slate-800/40 rounded-xl border border-slate-800">
                    No structured fields found. Document might be under processing or unstructured.
                  </div>
                ) : (
                  <div className="border border-slate-800 rounded-xl overflow-hidden shadow-inner">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-950/60 border-b border-slate-800 font-semibold text-slate-400 uppercase">
                        <tr>
                          <th className="px-4 py-3">Field Name</th>
                          <th className="px-4 py-3">Extracted Value</th>
                          <th className="px-4 py-3">Validation</th>
                          <th className="px-4 py-3 text-right">Audit Trace</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80 font-normal">
                        {fields.map((field, idx) => (
                          <tr key={field.id || idx} className="hover:bg-slate-800/40">
                            <td className="px-4 py-3 font-semibold text-slate-200 uppercase font-mono text-[11px]">
                              {field.field_name}
                            </td>
                            <td className="px-4 py-3 font-mono text-indigo-300">
                              {field.field_value || '<Not Detected>'}
                            </td>
                            <td className="px-4 py-3">
                              {field.validation_status === 'VALID' && (
                                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold text-[10px]">
                                  VALID
                                </span>
                              )}
                              {field.validation_status === 'INVALID' && (
                                <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold text-[10px]">
                                  INVALID
                                </span>
                              )}
                              {field.validation_status === 'EXPIRED' && (
                                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold text-[10px]">
                                  EXPIRED
                                </span>
                              )}
                              {!field.validation_status && (
                                <span className="px-2 py-0.5 rounded bg-slate-700 text-slate-300 font-medium text-[10px]">
                                  EXTRACTED
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => setEvidenceModal({ open: true, field })}
                                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-md font-medium text-[11px] inline-flex items-center gap-1 transition"
                              >
                                <Eye className="w-3 h-3 text-indigo-400" /> Trace Snippet
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
            <div className="text-center py-20 text-slate-400 text-sm">
              <FileSearch className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              Select a submitted document from the left list to inspect OCR extracted fields and evidence.
            </div>
          )}
        </div>
      </div>

      {/* Evidence Modal Drawer */}
      {evidenceModal.open && evidenceModal.field && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              Extracted Evidence Trace & Provenance
            </h3>
            <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 text-xs space-y-2">
              <div>
                <span className="text-slate-400 block mb-0.5">Field Name:</span>
                <span className="font-bold text-slate-200 font-mono uppercase">{evidenceModal.field.field_name}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Extracted Value:</span>
                <span className="font-mono font-bold text-indigo-300">{evidenceModal.field.field_value}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Source Page Number:</span>
                <span className="text-slate-300">Page {evidenceModal.field.page_number || 1}</span>
              </div>
              {evidenceModal.field.validation_message && (
                <div>
                  <span className="text-slate-400 block mb-0.5">Validation Rule Engine:</span>
                  <span className="text-slate-300">{evidenceModal.field.validation_message}</span>
                </div>
              )}
            </div>
            <div className="p-3.5 bg-indigo-950/30 rounded-xl border border-indigo-800/40 text-xs text-indigo-200 font-mono leading-relaxed">
              "{evidenceModal.field.evidence || 'Raw text segment verified from document OCR extraction stream.'}"
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setEvidenceModal({ open: false })}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-xl transition shadow-md"
              >
                Close Audit Trace
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
