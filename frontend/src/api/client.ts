import axios from 'axios';
import type {
  Tender,
  Requirement,
  Bidder,
  DocumentItem,
  ComplianceEvaluation,
  RiskSignal,
  GraphData,
  ComparisonResult,
  ChatResponse,
  QuickAction,
  HealthStatus
} from '../types';

const apiHost = import.meta.env.VITE_API_BASE_URL || '';

export const api = axios.create({
  baseURL: apiHost,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Tenders API
export const getTenders = (): Promise<Tender[]> => api.get('/api/tenders').then((res) => res.data);
export const getTender = (id: string | number): Promise<Tender> =>
  api.get(`/api/tenders/${id}`).then((res) => res.data);
export const createTender = (data: Partial<Tender>): Promise<Tender> =>
  api.post('/api/tenders', data).then((res) => res.data);
export const updateTender = (id: string | number, data: Partial<Tender>): Promise<Tender> =>
  api.put(`/api/tenders/${id}`, data).then((res) => res.data);
export const deleteTender = (id: string | number): Promise<{ message: string }> =>
  api.delete(`/api/tenders/${id}`).then((res) => res.data);

// Requirements API
export const getRequirements = (tenderId: string | number): Promise<Requirement[]> =>
  api.get(`/api/tenders/${tenderId}/requirements`).then((res) => res.data);
export const createRequirement = (data: Partial<Requirement> & { tender_id: number }): Promise<Requirement> =>
  api.post(`/api/tenders/${data.tender_id}/requirements`, data).then((res) => res.data);
export const updateRequirement = (id: string | number, data: Partial<Requirement>): Promise<Requirement> =>
  api.put(`/api/requirements/${id}`, data).then((res) => res.data);
export const deleteRequirement = (id: string | number): Promise<{ message: string }> =>
  api.delete(`/api/requirements/${id}`).then((res) => res.data);

// Bidders API
export const getBidders = (tenderId: string | number): Promise<Bidder[]> =>
  api.get(`/api/tenders/${tenderId}/bidders`).then((res) => res.data);
export const getBidder = (id: string | number): Promise<Bidder> =>
  api.get(`/api/bidders/${id}`).then((res) => res.data);
export const createBidder = (data: Partial<Bidder> & { tender_id: number }): Promise<Bidder> =>
  api.post(`/api/tenders/${data.tender_id}/bidders`, data).then((res) => res.data);
export const getBidderIntelligence = (id: string | number): Promise<any> =>
  api.get(`/api/bidders/${id}/intelligence`).then((res) => res.data);

// Documents API
export const getDocuments = (bidderId: string | number): Promise<DocumentItem[]> =>
  api.get(`/api/bidders/${bidderId}/documents`).then((res) => res.data);
export const getDocumentsByBidder = getDocuments;

export const uploadDocument = (bidderId: string | number, file: File): Promise<any> => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post(`/api/bidders/${bidderId}/documents`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((res) => res.data);
};

export const getEvidence = (documentId: string | number): Promise<any> =>
  api.get(`/api/documents/${documentId}/evidence`).then((res) => res.data);

export const reprocessDocument = (documentId: string | number): Promise<any> =>
  api.post(`/api/documents/${documentId}/process`).then((res) => res.data);

// Compliance API
export const getBidderCompliance = (bidderId: string | number): Promise<ComplianceEvaluation> =>
  api.get(`/api/bidders/${bidderId}/compliance`).then((res) => res.data);
export const getTenderCompliance = (tenderId: string | number): Promise<any[]> =>
  api.get(`/api/tenders/${tenderId}/compliance`).then((res) => res.data);
export const recheckCompliance = (bidderId: string | number): Promise<any> =>
  api.post(`/api/compliance/recheck/${bidderId}`).then((res) => res.data);

// Risk API
export const getBidderRisks = (bidderId: string | number): Promise<RiskSignal[]> =>
  api.get(`/api/bidders/${bidderId}/risks`).then((res) => res.data);
export const getTenderRisks = (tenderId: string | number): Promise<RiskSignal[]> =>
  api.get(`/api/tenders/${tenderId}/risks`).then((res) => res.data);
export const updateRiskStatus = (riskId: string | number, status: string): Promise<any> =>
  api.patch(`/api/risks/${riskId}/status`, { status }).then((res) => res.data);

// Graph API
export const getGraphData = (tenderId: string | number): Promise<GraphData> =>
  api.get(`/api/tenders/${tenderId}/graph`).then((res) => res.data);
export const getBidderRelationships = (bidderId: string | number): Promise<any> =>
  api.get(`/api/graph/bidder/${bidderId}`).then((res) => res.data);

// Compare API
export const compareBidders = (
  tenderId: string | number,
  bidderIds: (string | number)[]
): Promise<ComparisonResult> => {
  const numericTenderId = typeof tenderId === 'string' ? parseInt(tenderId, 10) : tenderId;
  const numericBidderIds = bidderIds.map((id) => (typeof id === 'string' ? parseInt(id, 10) : id));
  return api.post('/api/compare', {
    tender_id: numericTenderId,
    bidder_ids: numericBidderIds,
  }).then((res) => res.data);
};

// Export URLs
export const exportCsvUrl = (tenderId: string | number) =>
  `${apiHost || ''}/api/tenders/${tenderId}/export/csv`;
export const exportExcelUrl = (tenderId: string | number) =>
  `${apiHost || ''}/api/tenders/${tenderId}/export/excel`;

// Chatbot API
export const sendChatMessage = (
  message: string,
  tenderId?: number | null,
  bidderId?: number | null,
  sessionId?: string | null
): Promise<ChatResponse> =>
  api.post('/api/chatbot/chat', {
    message,
    tender_id: tenderId || null,
    bidder_id: bidderId || null,
    session_id: sessionId || null,
  }).then((res) => res.data);

export const getQuickActions = (): Promise<QuickAction[]> =>
  api.get('/api/chatbot/quick-actions').then((res) => res.data);

export const clearChatSession = (sessionId: string): Promise<{ session_id: string; cleared: boolean }> =>
  api.delete(`/api/chatbot/sessions/${sessionId}`).then((res) => res.data);

// Health & Diagnostics API
export const getHealth = (): Promise<HealthStatus> =>
  api.get('/health').then((res) => res.data);
