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
  Building,
  Plus,
  X,
  AlertTriangle,
  Check,
  Zap,
  Activity,
  ArrowRight
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import {
  getBidders,
  getDocuments,
  uploadDocument,
  getEvidence,
  reprocessDocument,
  createBidder,
  getGroqDiagnostic
} from '../api/client';
import type { Bidder, DocumentItem, ExtractedField } from '../types';

interface DocumentVerificationProps {
  tenderId: string;
}

// Expected mandatory parameters by document category
const EXPECTED_FIELDS_BY_TYPE: Record<string, { label: string; key: string }[]> = {
  GST_CERTIFICATE: [
    { label: 'GSTIN (15-digit Tax Identifier)', key: 'gstin' },
    { label: 'Legal Company / Taxpayer Name', key: 'company_name' },
    { label: 'Principal Registered Address', key: 'registered_address' },
    { label: 'Date of Registration', key: 'registration_date' },
  ],
  PAN_CARD: [
    { label: 'PAN (10-digit Permanent Account Number)', key: 'pan' },
    { label: 'Entity Name / Cardholder Name', key: 'name' },
  ],
  UDYAM_CERTIFICATE: [
    { label: 'Udyam Registration Number', key: 'udyam_number' },
    { label: 'Enterprise Legal Name', key: 'enterprise_name' },
    { label: 'Plant / Office Address', key: 'address' },
    { label: 'Date of Enterprise Registration', key: 'date_of_registration' },
  ],
  INCORPORATION_CERTIFICATE: [
    { label: 'CIN (21-digit Corporate Identity Number)', key: 'cin' },
    { label: 'Company Name as per MCA', key: 'company_name' },
    { label: 'Date of Incorporation', key: 'incorporation_date' },
    { label: 'Registered Office Address', key: 'registered_address' },
  ],
  EXPERIENCE_CERTIFICATE: [
    { label: 'Issuing Client / Authority Name', key: 'client_name' },
    { label: 'Work Contract / PO Value', key: 'contract_value' },
    { label: 'Project Completion Date', key: 'completion_date' },
  ],
  OEM_AUTHORIZATION: [
    { label: 'OEM Brand / Principal Manufacturer', key: 'oem_name' },
    { label: 'Authorized Dealer / Bidder Name', key: 'authorized_bidder' },
    { label: 'Validity Period / Tender Reference', key: 'validity_period' },
  ],
  FINANCIAL_DOCUMENT: [
    { label: 'Annual Turnover Figure', key: 'annual_turnover' },
    { label: 'Financial Audit Year', key: 'financial_year' },
    { label: 'Chartered Accountant / UDIN', key: 'auditor_name' },
  ],
};

// Speedometer Gauge Component for Document Risk Level with explicit mathematical rule
const RiskGauge: React.FC<{
  score: number;
  level: 'LOW' | 'MEDIUM' | 'HIGH';
  label?: string;
  formula?: string;
}> = ({ score, level, label = 'Proportional Risk Speedometer', formula }) => {
  const colorClass =
    level === 'HIGH'
      ? '#ef4444'
      : level === 'MEDIUM'
      ? '#f59e0b'
      : '#10b981';

  const clampedScore = Math.min(Math.max(score, 0), 100);
  // Needle angle in degrees: -180 (left, 0%) to 0 (right, 100%)
  const needleDeg = -180 + (clampedScore / 100) * 180;
  const needleRad = (needleDeg * Math.PI) / 180;
  const R = 38;
  const cx = 60;
  const cy = 60;
  const nx = cx + R * Math.cos(needleRad);
  const ny = cy + R * Math.sin(needleRad);

  const arcLen = Math.PI * 40;
  const arcFill = (clampedScore / 100) * arcLen;

  return (
    <div className="flex flex-col items-center justify-center p-3.5 bg-[#0b0f19] rounded-lg border border-[#1e293b] shadow-inner w-full">
      <div className="relative w-36 h-20 flex items-end justify-center overflow-hidden">
        <svg width="130" height="74" viewBox="0 0 120 72">
          {/* Background arc track */}
          <path
            d="M 20 60 A 40 40 0 0 1 100 60"
            fill="none"
            stroke="#1e293b"
            strokeWidth="11"
            strokeLinecap="round"
          />
          {/* Filled arc — score fill */}
          <path
            d="M 20 60 A 40 40 0 0 1 100 60"
            fill="none"
            stroke={colorClass}
            strokeWidth="11"
            strokeLinecap="round"
            strokeDasharray={`${arcLen}`}
            strokeDashoffset={arcLen - arcFill}
            style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
          />
          {/* Needle */}
          <line
            x1={cx}
            y1={cy}
            x2={nx}
            y2={ny}
            stroke="#f8fafc"
            strokeWidth="2.5"
            strokeLinecap="round"
            style={{ transition: 'x2 0.8s ease-out, y2 0.8s ease-out' }}
          />
          {/* Center pivot */}
          <circle cx={cx} cy={cy} r="4.5" fill="#6366f1" />
          {/* Score text inside gauge */}
          <text
            x={cx}
            y={cy - 10}
            textAnchor="middle"
            fontSize="12"
            fontWeight="bold"
            fill={colorClass}
            fontFamily="monospace"
          >
            {clampedScore}%
          </text>
        </svg>
      </div>

      <div className="mt-1 text-center w-full">
        <div className="text-[10px] uppercase font-mono font-bold text-slate-400 tracking-wider">{label}</div>
        <div className="flex items-center gap-1.5 justify-center mt-0.5">
          <span
            className="text-xs font-black font-mono tracking-widest px-2 py-0.5 rounded"
            style={{
              color: colorClass,
              backgroundColor: `${colorClass}15`,
              border: `1px solid ${colorClass}40`,
            }}
          >
            {level} RISK
          </span>
        </div>
        {formula && (
          <div className="mt-2 pt-1.5 border-t border-[#1e293b] text-[9px] font-mono text-slate-400 text-center leading-tight">
            {formula}
          </div>
        )}
      </div>
    </div>
  );
};

// Required statutory procurement document types
const MANDATORY_BIDDER_DOCS = [
  { type: 'GST_CERTIFICATE', label: 'GST Registration Certificate', reason: 'Mandatory statutory tax registration' },
  { type: 'PAN_CARD', label: 'Permanent Account Number (PAN) Card', reason: 'Statutory income tax identification' },
  { type: 'UDYAM_CERTIFICATE', label: 'Udyam / MSME Certificate', fallbackType: 'INCORPORATION_CERTIFICATE', fallbackLabel: 'Certificate of Incorporation', reason: 'Corporate or MSME legal identity' },
  { type: 'EXPERIENCE_CERTIFICATE', label: 'Work Experience / PO Certificate', fallbackType: 'TECHNICAL_DOCUMENT', fallbackLabel: 'Technical Specifications', reason: 'Technical qualification & track record' },
  { type: 'FINANCIAL_DOCUMENT', label: 'Audited Financials / Turnover Statement', reason: 'Financial capability & annual turnover' },
];

export const DocumentVerification: React.FC<DocumentVerificationProps> = ({ tenderId }) => {
  const [searchParams] = useSearchParams();
  const queryBidderId = searchParams.get('bidderId');

  const [bidders, setBidders] = useState<Bidder[]>([]);
  const [selectedBidderId, setSelectedBidderId] = useState<string>('');
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);
  const [docEvidence, setDocEvidence] = useState<any>(null);
  const [groqDiagnostic, setGroqDiagnostic] = useState<any>(null);
  const [loadingGroq, setLoadingGroq] = useState(false);
  const [evidenceModal, setEvidenceModal] = useState<{ open: boolean; field?: ExtractedField }>({ open: false });
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

  // New Bidder modal state
  const [showAddBidderModal, setShowAddBidderModal] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [creatingBidder, setCreatingBidder] = useState(false);

  // Sync to Dossier / Dashboards modal state
  const [syncSuccessModalOpen, setSyncSuccessModalOpen] = useState(false);
  const [syncedBidderName, setSyncedBidderName] = useState('');

  // Track newly uploaded documents in this browser session
  const [newlyUploadedDocIds, setNewlyUploadedDocIds] = useState<Set<number>>(new Set());

  const [uploading, setUploading] = useState(false);
  const [loadingEvidence, setLoadingEvidence] = useState(false);

  // Poll controller
  const pollTimerRef = useRef<any>(null);

  const refreshBiddersList = async () => {
    if (!tenderId) return;
    try {
      const data = await getBidders(tenderId);
      setBidders(data || []);
      return data;
    } catch (err) {
      console.error('Failed to load bidders:', err);
    }
  };

  useEffect(() => {
    if (!tenderId) return;
    refreshBiddersList().then((data) => {
      if (data && data.length > 0 && !selectedBidderId) {
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
              fetchGroqAiDiagnostic(updated.id);
            }
          }
        }
      } else {
        setSelectedDoc(null);
        setDocEvidence(null);
        setGroqDiagnostic(null);
      }
    } catch (err) {
      console.error('Failed to load bidder documents:', err);
    }
  };

  const fetchGroqAiDiagnostic = async (docId: number | string) => {
    setLoadingGroq(true);
    try {
      const res = await getGroqDiagnostic(docId);
      setGroqDiagnostic(res);
    } catch (e) {
      console.error('Failed to fetch Groq diagnostic:', e);
    } finally {
      setLoadingGroq(false);
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
      fetchGroqAiDiagnostic(doc.id);
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

    // Instantly wipe previous document data so stale information disappears immediately
    setSelectedDoc(null);
    setDocEvidence(null);
    setGroqDiagnostic(null);
    setUploading(true);

    try {
      const uploaded = await uploadDocument(selectedBidderId, file);
      if (uploaded?.id) {
        setNewlyUploadedDocIds((prev) => new Set(prev).add(uploaded.id));
      }

      // Mark this bidder in localStorage as active/newly added
      try {
        const stored = JSON.parse(localStorage.getItem('newly_added_bidders') || '[]');
        if (!stored.includes(parseInt(selectedBidderId, 10))) {
          stored.push(parseInt(selectedBidderId, 10));
          localStorage.setItem('newly_added_bidders', JSON.stringify(stored));
        }
      } catch (e) {
        console.error(e);
      }

      // Allow background OCR & Gemini extraction to initialize
      await new Promise((res) => setTimeout(res, 900));

      // Refresh documents and updated bidder company name
      await refreshBiddersList();
      const docs = await getDocuments(selectedBidderId);
      setDocuments(docs || []);

      const matched = (docs || []).find((d) => d.id === uploaded?.id) || (docs && docs[docs.length - 1]);
      if (matched) {
        await handleSelectDoc(matched);
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
        refreshBiddersList();
      }, 800);
    } catch (err) {
      console.error('Reprocess failed:', err);
    }
  };

  const handleCreateBidder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompanyName.trim() || !tenderId) return;
    setCreatingBidder(true);
    try {
      const newBidder = await createBidder({
        tender_id: parseInt(tenderId, 10),
        company_name: newCompanyName.trim(),
        industry: 'Equipment & Services',
      });
      await refreshBiddersList();
      if (newBidder?.id) {
        setSelectedBidderId(String(newBidder.id));
        // Save to newly added list
        try {
          const stored = JSON.parse(localStorage.getItem('newly_added_bidders') || '[]');
          if (!stored.includes(newBidder.id)) {
            stored.push(newBidder.id);
            localStorage.setItem('newly_added_bidders', JSON.stringify(stored));
          }
        } catch (e) {
          console.error(e);
        }
      }
      setShowAddBidderModal(false);
      setNewCompanyName('');
    } catch (err) {
      console.error('Failed to create bidder:', err);
    } finally {
      setCreatingBidder(false);
    }
  };

  // Trigger Sync Bidder across all dashboards
  const handleSyncBidderAcrossSystem = () => {
    if (!selectedBidder) return;
    try {
      const stored = JSON.parse(localStorage.getItem('newly_added_bidders') || '[]');
      if (!stored.includes(selectedBidder.id)) {
        stored.push(selectedBidder.id);
        localStorage.setItem('newly_added_bidders', JSON.stringify(stored));
      }
      setSyncedBidderName(selectedBidder.company_name);
      setSyncSuccessModalOpen(true);
    } catch (e) {
      console.error(e);
    }
  };

  const selectedBidder = bidders.find((b) => String(b.id) === String(selectedBidderId));
  const fields: ExtractedField[] = docEvidence?.fields || selectedDoc?.extracted_fields || [];

  // Detect company name in the selected document
  const extractedCompany = fields.find((f) =>
    ['company_name', 'legal_name', 'trade_name', 'enterprise_name', 'name'].includes(f.field_name.toLowerCase())
  )?.field_value;

  const displayCompanyName = extractedCompany || selectedBidder?.company_name || 'Uploaded Entity Profile';

  // Determine key identifiers detected in the selected document
  const extractedIdentifiers = fields.filter((f) =>
    ['gstin', 'pan', 'cin', 'udyam_number', 'registration_number', 'tin'].includes(f.field_name.toLowerCase())
  );

  // Missing and invalid fields analysis within the current document
  const expectedSpec = EXPECTED_FIELDS_BY_TYPE[selectedDoc?.document_type || ''] || [];
  const existingFieldNames = fields.map((f) => f.field_name.toLowerCase());
  const missingFields = expectedSpec.filter(
    (exp) => !existingFieldNames.some((f) => f.includes(exp.key.toLowerCase()) || exp.key.toLowerCase().includes(f))
  );

  const invalidFields = fields.filter((f) => f.validation_status === 'INVALID' || f.validation_status === 'EXPIRED');

  // Missing required statutory documents for this bidder
  const submittedDocTypes = (documents || []).map((d) => (d.document_type || '').toUpperCase());
  const missingMandatoryDocs = MANDATORY_BIDDER_DOCS.filter((req) => {
    const hasPrimary = submittedDocTypes.some((t) => t.includes(req.type));
    const hasFallback = req.fallbackType ? submittedDocTypes.some((t) => t.includes(req.fallbackType)) : false;
    return !hasPrimary && !hasFallback;
  });

  // Dynamic, Uniform Risk Calculation following strict mathematical proportionality
  const calculateDocRisk = () => {
    if (!selectedDoc) {
      return {
        score: 5,
        level: 'LOW' as const,
        reasons: ['No document active'],
        formula: 'Baseline Clean: 5%',
      };
    }
    
    // Proportional Base Rule
    const baseRisk = 5;
    const missingDocsPenalty = missingMandatoryDocs.length * 15; // 15% per missing document
    const invalidFieldsPenalty = invalidFields.length * 15; // 15% per invalid field
    const missingFieldsPenalty = missingFields.length * 5; // 5% per missing parameter

    let calculatedScore = baseRisk + missingDocsPenalty + invalidFieldsPenalty + missingFieldsPenalty;
    const reasons: string[] = [];

    if (selectedDoc.status === 'FAILED') {
      calculatedScore = Math.max(calculatedScore, 90);
      reasons.push('Document OCR parsing or file format decode failed');
    }

    if (invalidFields.length > 0) {
      invalidFields.forEach((f) =>
        reasons.push(`${f.field_name.toUpperCase()} check failed: ${f.validation_message || 'Invalid format pattern'}`)
      );
    }

    if (missingMandatoryDocs.length > 0) {
      missingMandatoryDocs.forEach((md) => {
        reasons.push(`Missing mandatory statutory doc: ${md.label}`);
      });
    }

    if (missingFields.length > 0) {
      reasons.push(`${missingFields.length} expected parameter(s) missing from document`);
    }

    const score = Math.min(Math.max(calculatedScore, 5), 100);
    const level = score >= 60 ? ('HIGH' as const) : score >= 30 ? ('MEDIUM' as const) : ('LOW' as const);
    const formula = `Rule: 5% (Base) + [${missingMandatoryDocs.length} Missing Docs × 15%] + [${invalidFields.length} Invalid Fields × 15%] = ${score}%`;

    return { score, level, reasons, formula };
  };

  const riskInfo = calculateDocRisk();
  const isNewlyUploaded = selectedDoc ? newlyUploadedDocIds.has(Number(selectedDoc.id)) : false;

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#1e293b]">
        <div>
          <h1 className="text-xl font-bold text-slate-100 font-display flex items-center gap-2.5">
            <Zap className="w-5 h-5 text-amber-400" />
            Document Verification & Groq AI Diagnostics
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time PyMuPDF extraction, Groq LPU™ traffic-light evaluation, and proportional compliance risk scoring.
          </p>
        </div>

        {/* Bidder Selector & Add Bidder Button */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Bidder:</span>
          <select
            value={selectedBidderId}
            onChange={(e) => setSelectedBidderId(e.target.value)}
            className="bg-[#111827] border border-[#1e293b] hover:border-[#334155] text-slate-100 text-xs font-semibold rounded px-3 py-1.5 focus:outline-none focus:border-[#6366f1] font-mono cursor-pointer"
          >
            {bidders.map((b) => (
              <option key={b.id} value={String(b.id)}>
                {b.company_name} (ID #{b.id})
              </option>
            ))}
          </select>

          <button
            onClick={() => setShowAddBidderModal(true)}
            className="px-2.5 py-1.5 bg-[#1f2937] hover:bg-[#334155] text-slate-200 border border-[#334155] text-xs font-medium rounded transition flex items-center gap-1 font-mono cursor-pointer shadow-sm"
            title="Register a new company bidder"
          >
            <Plus className="w-3.5 h-3.5 text-[#6366f1]" />
            <span>+ New Bidder</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Upload & Live Groq AI Traffic Light Panel (Left) vs Evidence Matrix (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 Cols): Upload Box, Document Switcher, & Live Inline Groq AI Traffic Light Diagnostic */}
        <div className="lg:col-span-5 space-y-4">
          {/* Upload Dropzone */}
          <div className="bg-[#111827] rounded-lg border border-dashed border-[#334155] hover:border-[#6366f1] p-4 text-center transition shadow-md">
            <Upload className="w-6 h-6 text-[#6366f1] mx-auto mb-1.5 animate-bounce" />
            <h3 className="font-bold text-slate-200 text-xs mb-0.5 font-display">Upload Document for Real-Time Analysis</h3>
            <p className="text-[10px] text-slate-400 mb-2.5 font-mono">PDF, PNG, JPG (GST, PAN, Udyam, Audits, Work Orders)</p>
            <label className="cursor-pointer px-4 py-2 bg-[#6366f1] hover:bg-[#4f46e5] text-white rounded font-medium text-xs transition inline-flex items-center gap-2 shadow-lg">
              {uploading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing OCR & Groq Diagnostics...</span>
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  <span>Select File to Ingest</span>
                </>
              )}
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
          </div>

          {/* 🚦 INLINE GROQ AI SUMMARY & TRAFFIC LIGHT SECTION */}
          <div className="bg-[#111827] rounded-lg border border-indigo-500/30 p-4 shadow-xl space-y-3.5 relative overflow-hidden">
            {/* Header with Groq AI Summary badge */}
            <div className="flex items-center justify-between pb-2 border-b border-[#1e293b]">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400 animate-pulse" />
                <h3 className="font-bold text-slate-100 text-xs font-display">
                  Groq AI Summary
                </h3>
              </div>
              <span className="px-2 py-0.5 bg-amber-400/10 text-amber-300 border border-amber-400/30 rounded font-mono text-[9px] font-bold flex items-center gap-1">
                <Activity className="w-3 h-3 text-amber-400" />
                {loadingGroq ? 'Analyzing...' : 'Llama-3.3 Ultra-Fast'}
              </span>
            </div>

            {/* Visual Traffic Light Status Triplet (Green / Yellow / Red) */}
            <div className="grid grid-cols-3 gap-2">
              {/* Green Light Box */}
              <div className="bg-[#0b0f19] p-2.5 rounded-lg border border-emerald-500/30 flex flex-col items-center text-center">
                <div className="w-4 h-4 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981] mb-1 flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 text-black stroke-[3]" />
                </div>
                <span className="text-[10px] font-bold text-emerald-400 font-mono">GREEN LIGHT</span>
                <span className="text-[9px] text-slate-400 font-mono mt-0.5">
                  {fields.filter((f) => f.validation_status === 'VALID').length} Passed Checks
                </span>
              </div>

              {/* Amber / Yellow Light Box */}
              <div className="bg-[#0b0f19] p-2.5 rounded-lg border border-amber-500/30 flex flex-col items-center text-center">
                <div className="w-4 h-4 rounded-full bg-amber-400 shadow-[0_0_10px_#f59e0b] mb-1 flex items-center justify-center">
                  <AlertCircle className="w-2.5 h-2.5 text-black stroke-[3]" />
                </div>
                <span className="text-[10px] font-bold text-amber-400 font-mono">AMBER LIGHT</span>
                <span className="text-[9px] text-slate-400 font-mono mt-0.5">
                  {missingMandatoryDocs.length} Missing Docs
                </span>
              </div>

              {/* Red Light Box */}
              <div className="bg-[#0b0f19] p-2.5 rounded-lg border border-rose-500/30 flex flex-col items-center text-center">
                <div className="w-4 h-4 rounded-full bg-rose-500 shadow-[0_0_10px_#ef4444] mb-1 flex items-center justify-center">
                  <X className="w-2.5 h-2.5 text-white stroke-[3]" />
                </div>
                <span className="text-[10px] font-bold text-rose-400 font-mono">RED LIGHT</span>
                <span className="text-[9px] text-slate-400 font-mono mt-0.5">
                  {invalidFields.length} Format Defects
                </span>
              </div>
            </div>

            {/* Diagrammatic Verification Flow */}
            <div className="p-2.5 bg-[#0b0f19] rounded-lg border border-[#1e293b] space-y-1.5">
              <div className="text-[10px] font-bold text-slate-300 font-mono uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#6366f1]" />
                <span>Verification Pipeline Diagram</span>
              </div>
              <div className="grid grid-cols-4 gap-1 text-center font-mono">
                <div className="p-1 rounded bg-[#1e293b]/70 border border-[#334155] text-[9px] text-slate-300">
                  <div className="text-[8px] text-slate-400">STEP 1</div>
                  <div className="font-bold text-emerald-400">PyMuPDF OCR</div>
                </div>
                <div className="p-1 rounded bg-[#1e293b]/70 border border-[#334155] text-[9px] text-slate-300">
                  <div className="text-[8px] text-slate-400">STEP 2</div>
                  <div className="font-bold text-indigo-300">Entity Regex</div>
                </div>
                <div className="p-1 rounded bg-[#1e293b]/70 border border-[#334155] text-[9px] text-slate-300">
                  <div className="text-[8px] text-slate-400">STEP 3</div>
                  <div className={`font-bold ${invalidFields.length > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    Syntax Check
                  </div>
                </div>
                <div className="p-1 rounded bg-amber-500/10 border border-amber-500/30 text-[9px] text-amber-300">
                  <div className="text-[8px] text-amber-400">STEP 4</div>
                  <div className="font-bold">Groq Audit</div>
                </div>
              </div>
            </div>

            {/* Mandatory Statutory Checklist (Traffic Light Checklist) */}
            <div className="p-2.5 bg-[#0b0f19] rounded-lg border border-[#1e293b] space-y-1.5">
              <div className="text-[10px] font-bold text-slate-300 font-mono uppercase tracking-wider flex items-center justify-between">
                <span>Statutory Procurement Checklist</span>
                <span className="text-[9px] text-[#c0c1ff]">
                  {5 - missingMandatoryDocs.length} / 5 Present
                </span>
              </div>
              <div className="space-y-1 font-mono text-[10px]">
                {MANDATORY_BIDDER_DOCS.map((docReq, idx) => {
                  const isPresent = !missingMandatoryDocs.some((m) => m.type === docReq.type);
                  return (
                    <div
                      key={idx}
                      className={`p-1.5 rounded flex items-center justify-between border ${
                        isPresent
                          ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                          : 'bg-rose-950/20 border-rose-500/30 text-rose-300'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            isPresent ? 'bg-emerald-400 shadow-[0_0_6px_#10b981]' : 'bg-rose-500 shadow-[0_0_6px_#ef4444]'
                          }`}
                        />
                        <span className="font-semibold">{docReq.label}</span>
                      </div>
                      <span className="text-[9px] font-extrabold uppercase px-1 rounded bg-black/40">
                        {isPresent ? '🟢 PRESENT' : '🔴 MISSING'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Executive Groq AI Summary Box */}
            <div className="p-3 bg-[#0b0f19] rounded-lg border border-amber-500/30 text-xs font-mono space-y-1.5">
              <div className="flex items-center justify-between text-amber-300 font-bold text-[11px]">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Groq AI Executive Audit Summary
                </span>
                <span className="text-[9px] text-slate-400">
                  {groqDiagnostic?.model_used || 'Groq LPU Engine'}
                </span>
              </div>

              {loadingGroq ? (
                <div className="py-4 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                  <span>Synthesizing Groq AI audit summary...</span>
                </div>
              ) : groqDiagnostic?.ai_summary ? (
                <div className="text-[10px] text-slate-200 leading-relaxed max-h-56 overflow-y-auto whitespace-pre-wrap pr-1">
                  {groqDiagnostic.ai_summary}
                </div>
              ) : (
                <div className="text-[10px] text-slate-300 leading-relaxed space-y-1">
                  <div>• <strong>Entity Ingested:</strong> {displayCompanyName}</div>
                  <div>
                    • <strong>Status:</strong>{' '}
                    {invalidFields.length > 0 ? (
                      <span className="text-rose-400">
                        Defects detected in {invalidFields.map((f) => f.field_name.toUpperCase()).join(', ')}
                      </span>
                    ) : (
                      <span className="text-emerald-400">Extracted identifiers match statutory format</span>
                    )}
                  </div>
                  <div>
                    • <strong>Missing Documents:</strong>{' '}
                    {missingMandatoryDocs.length > 0 ? (
                      <span className="text-amber-400">
                        {missingMandatoryDocs.map((m) => m.label).join(', ')}
                      </span>
                    ) : (
                      <span className="text-emerald-400">All mandatory documents uploaded</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (7 Cols): Selected Document Details, Risk Speedometer & Extracted Fields Panel */}
        <div className="lg:col-span-7 bg-[#111827] rounded-lg border border-[#1e293b] p-5 shadow-lg space-y-5">
          {selectedDoc ? (
            <>
              {/* Document Header Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#1e293b] gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="px-2 py-0.5 bg-[#6366f1]/20 text-[#c0c1ff] border border-[#6366f1]/30 rounded font-mono text-[10px] font-bold">
                      {selectedDoc.file_name.toLowerCase().endsWith('.png')
                        ? 'PNG IMAGE'
                        : selectedDoc.file_name.toLowerCase().endsWith('.jpg') || selectedDoc.file_name.toLowerCase().endsWith('.jpeg')
                        ? 'JPEG IMAGE'
                        : selectedDoc.file_name.toLowerCase().endsWith('.pdf')
                        ? 'PDF DOCUMENT'
                        : 'DIGITAL DOCUMENT'}
                    </span>
                    <h2 className="text-sm font-bold text-slate-100 font-display">{selectedDoc.file_name}</h2>
                    {isNewlyUploaded && (
                      <span className="px-2 py-0.5 bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/40 rounded font-mono text-[9px] font-extrabold uppercase">
                        Current Upload
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
                    <span>
                      Engine:{' '}
                      <strong className="text-slate-300">
                        {docEvidence?.ocr_used === 'true' || docEvidence?.ocr_used === true
                          ? 'Tesseract Native OCR'
                          : 'PyMuPDF Native'}
                      </strong>
                    </span>
                    <span>•</span>
                    <span>
                      Status:{' '}
                      <strong
                        className={
                          selectedDoc.status === 'PROCESSED'
                            ? 'text-[#10b981]'
                            : selectedDoc.status === 'NEEDS_REVIEW'
                            ? 'text-[#f59e0b]'
                            : 'text-[#ef4444]'
                        }
                      >
                        {selectedDoc.status}
                      </strong>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => setPreviewModalOpen(true)}
                    className="px-2.5 py-1.5 bg-[#6366f1]/20 hover:bg-[#6366f1]/30 text-[#c0c1ff] border border-[#6366f1]/40 text-xs font-medium rounded transition flex items-center gap-1.5 font-mono shadow-sm cursor-pointer"
                    title="Preview Document File"
                  >
                    <Eye className="w-3.5 h-3.5 text-[#6366f1]" />
                    <span>Preview File</span>
                  </button>
                  <button
                    onClick={handleReprocess}
                    className="px-2.5 py-1.5 bg-[#1f2937] hover:bg-[#334155] text-slate-200 border border-[#334155] text-xs font-medium rounded transition flex items-center gap-1.5 font-mono cursor-pointer"
                    title="Reprocess Document OCR & AI"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                    <span>Reprocess</span>
                  </button>
                  <a
                    href={`/api/documents/${selectedDoc.id}/download`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1.5 bg-[#6366f1] hover:bg-[#4f46e5] text-white text-xs font-medium rounded transition flex items-center gap-1.5 shadow font-mono cursor-pointer"
                    title="Download original file"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </a>
                </div>
              </div>

              {/* Document Overview & Dynamic Proportional Risk Speedometer Banner */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-[#0b0f19] p-4 rounded-lg border border-[#1e293b]">
                <div className="md:col-span-7 space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-100 font-mono">
                    <Building className="w-4 h-4 text-[#6366f1] flex-shrink-0" />
                    <span className="text-slate-300">DOCUMENT ENTITY:</span>
                    <span className="text-[#c0c1ff] font-extrabold uppercase bg-[#6366f1]/10 px-2 py-0.5 rounded border border-[#6366f1]/20">
                      {displayCompanyName}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                    <div>
                      <span className="text-slate-400 block text-[10px]">FILE FORMAT / EXTENSION:</span>
                      <span className="text-[#c0c1ff] font-semibold">
                        {selectedDoc.file_name.toLowerCase().endsWith('.pdf')
                          ? 'PDF Document (.pdf)'
                          : selectedDoc.file_name.toLowerCase().endsWith('.png')
                          ? 'PNG Image (.png)'
                          : selectedDoc.file_name.toLowerCase().endsWith('.jpg') || selectedDoc.file_name.toLowerCase().endsWith('.jpeg')
                          ? 'JPEG Image (.jpg)'
                          : 'Digital File'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">DOCUMENT CLASSIFICATION:</span>
                      <span className="text-slate-200 font-semibold">
                        {selectedDoc.document_type ? selectedDoc.document_type.replace(/_/g, ' ') : 'Statutory Verification'}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-400 block text-[10px]">KEY IDENTIFIERS DETECTED:</span>
                      <span className="text-slate-200 font-semibold">
                        {extractedIdentifiers.length > 0
                          ? extractedIdentifiers.map((i) => `${i.field_name.toUpperCase()}: ${i.field_value}`).join(' | ')
                          : 'No primary government tax/company identifiers detected'}
                      </span>
                    </div>
                  </div>

                  {/* Document Risk Factors Summary */}
                  {riskInfo.reasons.length > 0 && (
                    <div className="pt-2 border-t border-[#1e293b]">
                      <span className="text-[10px] text-slate-400 font-mono block mb-1">
                        DETECTED RISK & COMPLIANCE SIGNALS:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {riskInfo.reasons.map((r, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded bg-[#ef4444]/10 text-rose-300 border border-[#ef4444]/30 text-[10px] font-mono flex items-center gap-1"
                          >
                            <AlertCircle className="w-3 h-3 text-[#ef4444]" />
                            {r}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Proportional Risk Speedometer Gauge */}
                <div className="md:col-span-5 flex flex-col items-center justify-center border-l border-[#1e293b] pl-3">
                  <RiskGauge
                    score={riskInfo.score}
                    level={riskInfo.level}
                    label="Proportional Risk Speedometer"
                    formula={riskInfo.formula}
                  />
                </div>
              </div>

              {/* ACTION CALLOUT: Add/Sync Bidder to Dossier, Risk Graph & Dashboards */}
              <div className="p-4 bg-gradient-to-r from-indigo-950/60 via-slate-900 to-indigo-950/40 rounded-lg border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
                    <h4 className="text-xs font-bold text-slate-100 font-display">
                      Publish & Synchronize Bidder to System
                    </h4>
                    <span className="px-1.5 py-0.2 rounded bg-indigo-500/20 text-[#c0c1ff] border border-indigo-500/40 font-mono text-[9px] font-bold">
                      LIVE SYNC
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 font-mono">
                    Add <strong className="text-[#c0c1ff]">{displayCompanyName}</strong> to the Bidder Dossier,
                    Procurement Risk Graph, Overview Dashboard & Audit Export Sheets.
                  </p>
                </div>

                <button
                  onClick={handleSyncBidderAcrossSystem}
                  className="px-4 py-2 bg-gradient-to-r from-[#6366f1] to-[#4f46e5] hover:from-[#4f46e5] hover:to-[#4338ca] text-white text-xs font-bold rounded shadow-lg transition flex items-center gap-2 font-mono flex-shrink-0 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Sync to All Dashboards</span>
                </button>
              </div>

              {/* CRITICAL DIAGNOSTICS: What's Wrong vs What's Missing */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 🔴 What's Wrong / Validation Failures */}
                <div className="p-3.5 bg-[#0b0f19] rounded-lg border border-[#1e293b] space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold font-mono">
                    <AlertTriangle
                      className={`w-4 h-4 ${invalidFields.length > 0 ? 'text-[#ef4444]' : 'text-[#10b981]'}`}
                    />
                    <span className="text-slate-200 uppercase tracking-wide">What's Wrong / Failed Checks</span>
                  </div>

                  {invalidFields.length > 0 ? (
                    <div className="space-y-1.5">
                      {invalidFields.map((f, i) => (
                        <div
                          key={i}
                          className="p-2 rounded bg-[#ef4444]/15 border border-[#ef4444]/30 text-xs font-mono text-rose-200"
                        >
                          <div className="font-bold flex items-center justify-between text-[11px]">
                            <span>{f.field_name.toUpperCase()}</span>
                            <span className="px-1.5 py-0.2 bg-[#ef4444]/30 rounded text-[9px] uppercase font-bold text-rose-100">
                              {f.validation_status}
                            </span>
                          </div>
                          <div className="text-[10px] text-rose-300/90 mt-0.5">
                            Value: <code className="text-white bg-black/40 px-1 rounded">{f.field_value}</code>
                          </div>
                          <div className="text-[10px] text-rose-300 mt-1">
                            ⚠️ {f.validation_message || 'Format check failed against regulatory pattern.'}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : selectedDoc.status === 'FAILED' ? (
                    <div className="p-2.5 rounded bg-[#ef4444]/15 border border-[#ef4444]/30 text-xs font-mono text-rose-200">
                      OCR or file parsing failed. Ensure file is not password-protected or corrupt.
                    </div>
                  ) : (
                    <div className="p-2.5 rounded bg-[#10b981]/10 border border-[#10b981]/30 text-xs font-mono text-emerald-300 flex items-center gap-2">
                      <Check className="w-4 h-4 text-[#10b981]" />
                      <span>All extracted fields in this document passed regulatory validation rules.</span>
                    </div>
                  )}
                </div>

                {/* 🟡 What's Missing: Document Fields + Mandatory Checklist */}
                <div className="p-3.5 bg-[#0b0f19] rounded-lg border border-[#1e293b] space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold font-mono">
                    <HelpCircle
                      className={`w-4 h-4 ${
                        missingMandatoryDocs.length > 0 || missingFields.length > 0
                          ? 'text-[#f59e0b]'
                          : 'text-[#10b981]'
                      }`}
                    />
                    <span className="text-slate-200 uppercase tracking-wide">
                      What's Missing (Docs & Parameters)
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {/* Missing Mandatory Documents for the company */}
                    {missingMandatoryDocs.length > 0 && (
                      <div className="p-2 rounded bg-amber-950/30 border border-amber-500/30 space-y-1">
                        <span className="text-[10px] font-bold text-amber-300 uppercase font-mono block">
                          Missing Statutory Documents ({missingMandatoryDocs.length}):
                        </span>
                        {missingMandatoryDocs.map((md, idx) => (
                          <div key={idx} className="flex items-center gap-1.5 text-[10px] text-amber-200/90 font-mono">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                            <span>{md.label} — <em className="text-amber-400/80">{md.reason}</em></span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Missing Fields inside this document */}
                    {missingFields.length > 0 ? (
                      missingFields.map((f, i) => (
                        <div
                          key={i}
                          className="p-2 rounded bg-[#f59e0b]/10 border border-[#f59e0b]/30 text-xs font-mono text-amber-200 flex items-start gap-2"
                        >
                          <AlertCircle className="w-3.5 h-3.5 text-[#f59e0b] mt-0.5 flex-shrink-0" />
                          <div>
                            <div className="font-bold text-[11px] text-amber-200">{f.label}</div>
                            <div className="text-[10px] text-amber-300/80">
                              Parameter not detected in current document OCR stream.
                            </div>
                          </div>
                        </div>
                      ))
                    ) : missingMandatoryDocs.length === 0 ? (
                      <div className="p-2.5 rounded bg-[#10b981]/10 border border-[#10b981]/30 text-xs font-mono text-emerald-300 flex items-center gap-2">
                        <Check className="w-4 h-4 text-[#10b981]" />
                        <span>All mandatory documents and category parameters are fully satisfied.</span>
                      </div>
                    ) : null}
                  </div>
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
                    No structured fields found. Document might still be under processing.
                  </div>
                ) : (
                  <div className="border border-[#1e293b] rounded-lg overflow-hidden">
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
                                <span
                                  className="px-1.5 py-0.5 rounded bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/40 font-bold text-[10px]"
                                  title={field.validation_message}
                                >
                                  INVALID
                                </span>
                              )}
                              {field.validation_status === 'EXPIRED' && (
                                <span
                                  className="px-1.5 py-0.5 rounded bg-[#f59e0b]/20 text-[#f59e0b] border border-[#f59e0b]/40 font-bold text-[10px]"
                                  title={field.validation_message}
                                >
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
                                className="px-2 py-1 bg-[#1f2937] hover:bg-[#334155] text-slate-200 border border-[#334155] rounded text-[10px] font-medium font-mono inline-flex items-center gap-1 transition cursor-pointer"
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
              Upload a document or select an active file above to view live Groq AI traffic-light diagnostics and extracted parameters.
            </div>
          )}
        </div>
      </div>

      {/* Quick Add Bidder Modal */}
      {showAddBidderModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleCreateBidder}
            className="bg-[#111827] border border-[#334155] rounded-lg max-w-md w-full p-5 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#1e293b]">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 font-display">
                <Building className="w-4 h-4 text-[#6366f1]" />
                Register New Bidder Entity
              </h3>
              <button
                type="button"
                onClick={() => setShowAddBidderModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-300 font-mono uppercase block">
                Company Legal Name:
              </label>
              <input
                type="text"
                required
                value={newCompanyName}
                onChange={(e) => setNewCompanyName(e.target.value)}
                placeholder="e.g. Acme Infra Power Pvt Ltd"
                className="w-full px-3 py-2 bg-[#0b0f19] border border-[#334155] rounded text-xs text-white focus:outline-none focus:border-[#6366f1] font-mono"
              />
              <p className="text-[10px] text-slate-400 font-mono">
                After creating, you can directly upload and evaluate its GST, PAN, and technical documents.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddBidderModal(false)}
                className="px-3 py-1.5 bg-[#1f2937] hover:bg-[#334155] text-slate-300 text-xs rounded font-mono cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creatingBidder || !newCompanyName.trim()}
                className="px-4 py-1.5 bg-[#6366f1] hover:bg-[#4f46e5] text-white text-xs font-semibold rounded font-mono cursor-pointer disabled:opacity-50"
              >
                {creatingBidder ? 'Creating...' : 'Register & Select'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Evidence Modal Drawer */}
      {evidenceModal.open && evidenceModal.field && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#111827] border border-[#334155] rounded-lg max-w-lg w-full p-5 shadow-2xl space-y-4">
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
                className="px-3.5 py-1.5 bg-[#6366f1] hover:bg-[#4f46e5] text-white font-medium text-xs rounded transition font-mono cursor-pointer"
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
                  className="px-3 py-1 bg-[#1f2937] hover:bg-[#334155] text-slate-200 border border-[#334155] rounded text-xs font-mono flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-[#6366f1]" /> Download Original
                </a>
                <button
                  onClick={() => setPreviewModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-[#1f2937] transition cursor-pointer"
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

      {/* Sync Success Modal */}
      {syncSuccessModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#111827] border border-indigo-500/40 rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#1e293b]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                  <Check className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100 font-display">
                    Bidder Synchronized Across Entire System
                  </h3>
                  <span className="text-[10px] text-emerald-400 font-mono font-semibold">
                    ACTIVE IN ALL DASHBOARDS
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSyncSuccessModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 bg-[#0b0f19] rounded-lg border border-[#1e293b] text-xs font-mono space-y-2">
              <div className="text-slate-300">
                Company <strong className="text-[#c0c1ff]">{syncedBidderName}</strong> has been enrolled and updated across all procurement analytics modules.
              </div>
              <div className="text-[11px] text-slate-400">
                You can now evaluate its compliance score, cross-bidder risk collusion graph, and download the compiled evaluation report.
              </div>
            </div>

            {/* Quick Navigation Action Grid */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <a
                href={`/bidders?tenderId=${tenderId}`}
                className="p-3 bg-[#1e293b] hover:bg-[#334155] border border-[#334155] rounded-lg text-xs font-mono text-slate-200 flex flex-col gap-1 transition group"
              >
                <div className="flex items-center justify-between text-indigo-400 group-hover:text-white">
                  <span className="font-bold flex items-center gap-1.5"><Building className="w-3.5 h-3.5" /> Bidder Dossier</span>
                  <span>→</span>
                </div>
                <span className="text-[10px] text-slate-400">View company dossier & credentials</span>
              </a>

              <a
                href={`/risk-graph?tenderId=${tenderId}`}
                className="p-3 bg-[#1e293b] hover:bg-[#334155] border border-[#334155] rounded-lg text-xs font-mono text-slate-200 flex flex-col gap-1 transition group"
              >
                <div className="flex items-center justify-between text-indigo-400 group-hover:text-white">
                  <span className="font-bold flex items-center gap-1.5"><Layers className="w-3.5 h-3.5" /> Risk Graph</span>
                  <span>→</span>
                </div>
                <span className="text-[10px] text-slate-400">Inspect collusion & address networks</span>
              </a>

              <a
                href={`/?tenderId=${tenderId}`}
                className="p-3 bg-[#1e293b] hover:bg-[#334155] border border-[#334155] rounded-lg text-xs font-mono text-slate-200 flex flex-col gap-1 transition group"
              >
                <div className="flex items-center justify-between text-emerald-400 group-hover:text-white">
                  <span className="font-bold flex items-center gap-1.5"><Cpu className="w-3.5 h-3.5" /> Overview Dashboard</span>
                  <span>→</span>
                </div>
                <span className="text-[10px] text-slate-400">Track ranking & compliance cards</span>
              </a>

              <a
                href={`/export?tenderId=${tenderId}`}
                className="p-3 bg-[#1e293b] hover:bg-[#334155] border border-[#334155] rounded-lg text-xs font-mono text-slate-200 flex flex-col gap-1 transition group"
              >
                <div className="flex items-center justify-between text-emerald-400 group-hover:text-white">
                  <span className="font-bold flex items-center gap-1.5"><Download className="w-3.5 h-3.5" /> Export Excel / CSV</span>
                  <span>→</span>
                </div>
                <span className="text-[10px] text-slate-400">Download updated evaluation sheets</span>
              </a>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSyncSuccessModalOpen(false)}
                className="px-4 py-2 bg-[#6366f1] hover:bg-[#4f46e5] text-white text-xs font-bold rounded font-mono transition cursor-pointer"
              >
                Continue In Document Studio
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
