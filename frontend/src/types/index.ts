export interface Tender {
  id: number | string;
  tender_id: string;
  title: string;
  description?: string;
  category?: string;
  tender_date?: string;
  submission_deadline?: string;
  status: 'DRAFT' | 'ACTIVE' | 'CLOSED' | 'EVALUATION' | string;
  created_at: string;
  requirements_count?: number;
  bidders_count?: number;
}

export interface Requirement {
  id: number | string;
  tender_id: number | string;
  code?: string;
  name: string;
  description?: string;
  mandatory: boolean;
  expected_document_type: string;
  validation_rule?: string;
  created_at?: string;
}

export interface Bidder {
  id: number | string;
  tender_id: number | string;
  company_name: string;
  cin?: string;
  gstin?: string;
  pan?: string;
  udyam_number?: string;
  registered_address?: string;
  incorporation_date?: string;
  industry?: string;
  created_at?: string;
  documents_count?: number;
  compliance_summary?: Record<string, number>;
}

export interface ExtractedField {
  id: number | string;
  document_id: number | string;
  field_name: string;
  field_value?: string;
  confidence?: number;
  page_number?: number;
  evidence?: string;
  validation_status?: string;
  validation_message?: string;
}

export interface DocumentItem {
  id: number | string;
  bidder_id: number | string;
  file_name: string;
  document_type?: string;
  file_path?: string;
  status: 'UPLOADED' | 'PROCESSING' | 'PROCESSED' | 'NEEDS_REVIEW' | 'FAILED' | 'UNSUPPORTED' | string;
  is_supported?: boolean | string;
  classification_confidence?: number;
  confidence_score?: number;
  ocr_used?: boolean | string;
  uploaded_at?: string;
  created_at?: string;
  extracted_fields?: ExtractedField[];
}

export type Document = DocumentItem;

export interface ComplianceItem {
  id: number | string;
  requirement_id: number | string;
  requirement_name?: string;
  mandatory?: boolean;
  expected_document_type?: string;
  status: 'VERIFIED' | 'REVIEW' | 'MISSING' | 'NOT_AVAILABLE' | string;
  reason?: string;
  evidence?: string;
  created_at?: string;
  checked_at?: string;
}

export interface ComplianceSummary {
  total: number;
  verified: number;
  missing: number;
  review: number;
  not_available: number;
  compliance_score: number;
}

export interface ComplianceEvaluation {
  bidder_id: number | string;
  company_name: string;
  summary: ComplianceSummary;
  results: ComplianceItem[];
}

export type ComplianceResult = ComplianceItem;

export interface RiskSignal {
  id: number | string;
  bidder_id: number | string;
  risk_type: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | string;
  source?: string;
  evidence?: string;
  status: 'OPEN' | 'REVIEWED' | 'RESOLVED' | string;
  detected_at?: string;
  created_at?: string;
  bidder_name?: string;
}

export interface EntityNode {
  id: string;
  label?: string;
  type?: string;
  data?: any;
  position?: { x: number; y: number };
  source?: string;
}

export interface RelationshipEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  evidence?: string;
  requires_review?: boolean;
  animated?: boolean;
  type?: string;
  style?: Record<string, any>;
  data?: any;
}

export interface GraphData {
  nodes: EntityNode[];
  edges: RelationshipEdge[];
}

export interface BidderComparisonRow {
  bidder_id: number | string;
  company_name: string;
  cin?: string;
  gstin?: string;
  pan?: string;
  udyam_number?: string;
  incorporation_date?: string;
  compliance_count?: Record<string, number>;
  total_risks?: number;
  high_risks?: number;
  documents_uploaded?: number;
  field_values?: Record<string, string>;
  compliance_statuses?: Record<string, { status: string; reason?: string }>;
}

export interface ComparisonResult {
  tender: Tender;
  requirements: Requirement[];
  bidders: BidderComparisonRow[];
  matrix?: any;
}

// Chatbot Types
export interface ChatSource {
  type: 'tender' | 'bidder' | 'document' | 'compliance' | 'risk' | 'relationship' | string;
  id?: number | string;
  label: string;
  snippet?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  sources?: ChatSource[];
  model_used?: string;
}

export interface ChatResponse {
  answer: string;
  session_id: string;
  sources: ChatSource[];
  timestamp: string;
  model_used: string;
  quick_suggestions?: string[];
}

export interface QuickAction {
  id: string;
  label: string;
  prompt: string;
  category: string;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | string;
  components: {
    database: {
      status: string;
      tender_count: number;
      bidder_count: number;
    };
    gemini_document_ai: {
      status: string;
      model: string;
      configured: boolean;
    };
    grok_procurement_assistant: {
      status: string;
      model: string;
      configured: boolean;
    };
    tesseract_ocr: {
      available: boolean;
      status: string;
      version?: string;
      message?: string;
    };
  };
}
