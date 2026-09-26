import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  Node,
  Edge,
  NodeChange,
  EdgeChange,
  Handle,
  Position,
  useReactFlow,
  ReactFlowProvider,
  MiniMap,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Network,
  Building2,
  User,
  MapPin,
  FileText,
  CreditCard,
  Briefcase,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Search,
  Filter,
  Eye,
  Download,
  RotateCcw,
  Maximize2,
  ZoomIn,
  ZoomOut,
  X,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Layers,
  Cpu,
  Info,
  CheckCircle2,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { getGraphData } from '../api/client';
import type { GraphData, EntityNode, RelationshipEdge, RiskSignal } from '../types';

// ── CUSTOM NODE COMPONENTS ───────────────────────────────────────────────────

// 1. Tender Node (Root Context)
const TenderNode = ({ data, selected }: any) => (
  <div
    className={`p-3.5 rounded bg-[#111827] border ${
      selected ? 'border-[#6366f1] ring-2 ring-[#6366f1]/30' : 'border-[#6366f1]/60'
    } shadow-xl min-w-[260px] text-left transition-all`}
  >
    <Handle type="source" position={Position.Bottom} className="!bg-[#6366f1] !w-2.5 !h-2.5" />
    <div className="flex items-center justify-between gap-2 mb-1.5 pb-1.5 border-b border-[#1e293b]">
      <div className="flex items-center gap-1.5 text-[#c0c1ff]">
        <Network className="w-4 h-4 text-[#6366f1]" />
        <span className="font-mono text-[10px] font-bold uppercase tracking-widest">ROOT TENDER</span>
      </div>
      <span className="px-1.5 py-0.5 rounded bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/40 font-mono text-[9px] font-bold">
        {data.status || 'ACTIVE EVALUATION'}
      </span>
    </div>
    <div className="font-bold text-slate-100 text-xs font-display mb-1 truncate" title={data.label}>
      {data.label}
    </div>
    <div className="text-[10px] font-mono text-slate-400 flex items-center justify-between">
      <span>ID: {data.tender_id || 'TND-2024'}</span>
      <span>Category: {data.category || 'Railway'}</span>
    </div>
  </div>
);

// 2. Company / Bidder Node
const CompanyNode = ({ data, selected }: any) => {
  const isFlagged = data.is_flagged || data.verification_status === 'RISK SIGNAL';
  const isReview = data.verification_status === 'REVIEW' || data.verification_status === 'MISSING INFORMATION';

  return (
    <div
      className={`p-3.5 rounded bg-[#111827] border ${
        selected
          ? 'border-[#6366f1] ring-2 ring-[#6366f1]/30'
          : isFlagged
          ? 'border-[#ef4444]/80 shadow-rose-950/20'
          : isReview
          ? 'border-[#f59e0b]/80'
          : 'border-[#334155]'
      } shadow-xl min-w-[240px] text-left transition-all`}
    >
      <Handle type="target" position={Position.Top} className="!bg-[#6366f1] !w-2 !h-2" />
      <Handle type="source" position={Position.Bottom} className="!bg-[#6366f1] !w-2 !h-2" />

      <div className="flex items-center justify-between gap-2 mb-1.5 pb-1.5 border-b border-[#1e293b]">
        <div className="flex items-center gap-1.5 text-slate-300">
          <Building2 className={`w-3.5 h-3.5 ${isFlagged ? 'text-[#ef4444]' : 'text-[#6366f1]'}`} />
          <span className="font-mono text-[10px] font-semibold text-slate-400">BIDDER #{data.bidder_id}</span>
        </div>
        <span
          className={`px-1.5 py-0.5 rounded font-mono text-[9px] font-bold ${
            isFlagged
              ? 'bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/40 animate-pulse'
              : isReview
              ? 'bg-[#f59e0b]/20 text-[#f59e0b] border border-[#f59e0b]/40'
              : 'bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/40'
          }`}
        >
          {data.verification_status || 'VERIFIED'}
        </span>
      </div>

      <div className="font-bold text-slate-100 text-xs truncate mb-1" title={data.label}>
        {data.label}
      </div>

      <div className="space-y-1 text-[10px] font-mono text-slate-400">
        <div className="flex items-center justify-between">
          <span>GST: {data.gstin ? data.gstin.slice(0, 10) + '...' : 'N/A'}</span>
          <span className="text-[#c0c1ff] font-bold">{data.compliance_score ?? 100}% Comp.</span>
        </div>
        {data.high_risks > 0 && (
          <div className="flex items-center gap-1 text-[#ef4444] font-semibold">
            <ShieldAlert className="w-3 h-3" />
            <span>{data.high_risks} Critical Flag(s)</span>
          </div>
        )}
      </div>
    </div>
  );
};

// 3. Person / Director Node
const PersonNode = ({ data, selected }: any) => (
  <div
    className={`p-2.5 rounded bg-[#111827] border ${
      selected
        ? 'border-[#6366f1] ring-2 ring-[#6366f1]/30'
        : data.is_shared
        ? 'border-[#ef4444]/80 shadow-rose-950/30'
        : 'border-[#334155]'
    } shadow-md min-w-[170px] text-left transition-all`}
  >
    <Handle type="target" position={Position.Top} className="!bg-[#6366f1] !w-2 !h-2" />
    <Handle type="source" position={Position.Bottom} className="!bg-[#6366f1] !w-2 !h-2" />
    <div className="flex items-center justify-between mb-1">
      <div className="flex items-center gap-1.5 text-slate-300">
        <User className={`w-3 h-3 ${data.is_shared ? 'text-[#ef4444]' : 'text-sky-400'}`} />
        <span className="text-[10px] font-mono uppercase text-slate-400">DIRECTOR</span>
      </div>
      {data.is_shared && (
        <span className="px-1 py-0.2 rounded bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/40 font-mono text-[8px] font-bold">
          SHARED
        </span>
      )}
    </div>
    <div className="font-bold text-slate-100 text-[11px] truncate">{data.label}</div>
    <div className="text-[9px] font-mono text-slate-400 mt-0.5">DIN: {data.din || '01234567'}</div>
  </div>
);

// 4. Address Node
const AddressNode = ({ data, selected }: any) => (
  <div
    className={`p-2.5 rounded bg-[#111827] border ${
      selected
        ? 'border-[#6366f1] ring-2 ring-[#6366f1]/30'
        : data.is_inconsistent
        ? 'border-[#f59e0b]/80 shadow-amber-950/30'
        : 'border-[#334155]'
    } shadow-md min-w-[180px] max-w-[220px] text-left transition-all`}
  >
    <Handle type="target" position={Position.Top} className="!bg-[#6366f1] !w-2 !h-2" />
    <Handle type="source" position={Position.Bottom} className="!bg-[#6366f1] !w-2 !h-2" />
    <div className="flex items-center justify-between mb-1">
      <div className="flex items-center gap-1 text-slate-400">
        <MapPin className={`w-3 h-3 ${data.is_inconsistent ? 'text-[#f59e0b]' : 'text-emerald-400'}`} />
        <span className="text-[10px] font-mono uppercase">ADDRESS</span>
      </div>
      {data.is_inconsistent && (
        <span className="px-1 py-0.2 rounded bg-[#f59e0b]/20 text-[#f59e0b] border border-[#f59e0b]/40 font-mono text-[8px] font-bold">
          MISMATCH
        </span>
      )}
    </div>
    <div className="text-[11px] text-slate-200 font-medium line-clamp-2" title={data.full_address || data.label}>
      {data.label}
    </div>
    {data.source_doc && (
      <div className="text-[9px] font-mono text-slate-500 mt-0.5 truncate">Doc: {data.source_doc}</div>
    )}
  </div>
);

// 5. Identifier Node (GSTIN / PAN / CIN / Udyam)
const IdentifierNode = ({ data, selected }: any) => (
  <div
    className={`p-2 rounded bg-[#0b0f19] border ${
      selected ? 'border-[#6366f1] ring-2 ring-[#6366f1]/30' : 'border-[#1e293b]'
    } shadow-sm min-w-[130px] text-left transition-all`}
  >
    <Handle type="target" position={Position.Top} className="!bg-[#6366f1] !w-1.5 !h-1.5" />
    <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 mb-0.5">
      <span className="font-bold text-[#c0c1ff]">{data.entity_type}</span>
      {data.status && <span className="text-emerald-400">●</span>}
    </div>
    <div className="font-mono text-[10px] font-semibold text-slate-200 truncate">{data.label}</div>
  </div>
);

// 6. Document Node
const DocumentNode = ({ data, selected }: any) => (
  <div
    className={`p-2.5 rounded bg-[#111827] border ${
      selected ? 'border-[#6366f1] ring-2 ring-[#6366f1]/30' : 'border-[#1e293b]'
    } shadow-sm min-w-[150px] max-w-[190px] text-left transition-all`}
  >
    <Handle type="target" position={Position.Top} className="!bg-[#6366f1] !w-2 !h-2" />
    <div className="flex items-center gap-1.5 mb-1 text-slate-400">
      <FileText className="w-3 h-3 text-[#6366f1]" />
      <span className="text-[9px] font-mono uppercase truncate">{data.document_type || 'DOCUMENT'}</span>
    </div>
    <div className="text-[10px] font-semibold text-slate-200 truncate" title={data.label}>
      {data.label}
    </div>
    <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 mt-1">
      <span className="text-emerald-400">{data.status || 'PROCESSED'}</span>
      <span>{data.ocr_used === 'true' || data.ocr_used === true ? 'OCR' : 'PDF'}</span>
    </div>
  </div>
);

// 7. Project / Experience Node
const ProjectNode = ({ data, selected }: any) => (
  <div
    className={`p-2.5 rounded bg-[#111827] border ${
      selected ? 'border-[#6366f1] ring-2 ring-[#6366f1]/30' : 'border-[#334155]'
    } shadow-md min-w-[160px] max-w-[200px] text-left transition-all`}
  >
    <Handle type="target" position={Position.Top} className="!bg-[#6366f1] !w-2 !h-2" />
    <div className="flex items-center gap-1 text-slate-400 mb-1">
      <Briefcase className="w-3 h-3 text-amber-400" />
      <span className="text-[9px] font-mono uppercase">PAST PROJECT</span>
    </div>
    <div className="text-[11px] font-bold text-slate-200 truncate">{data.client_name || data.label}</div>
    <div className="text-[9px] font-mono text-[#c0c1ff] mt-0.5">Value: {data.project_value || '₹2+ Cr'}</div>
  </div>
);

// 8. OEM Authorization Node
const OEMNode = ({ data, selected }: any) => (
  <div
    className={`p-2.5 rounded bg-[#111827] border ${
      selected
        ? 'border-[#6366f1] ring-2 ring-[#6366f1]/30'
        : data.is_expired
        ? 'border-[#ef4444]/80 shadow-rose-950/20'
        : 'border-[#334155]'
    } shadow-md min-w-[160px] text-left transition-all`}
  >
    <Handle type="target" position={Position.Top} className="!bg-[#6366f1] !w-2 !h-2" />
    <div className="flex items-center justify-between mb-1">
      <div className="flex items-center gap-1 text-slate-400">
        <ShieldCheck className={`w-3 h-3 ${data.is_expired ? 'text-[#ef4444]' : 'text-violet-400'}`} />
        <span className="text-[9px] font-mono uppercase">OEM PARTNER</span>
      </div>
      {data.is_expired && (
        <span className="px-1 py-0.2 rounded bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/40 font-mono text-[8px] font-bold">
          EXPIRED
        </span>
      )}
    </div>
    <div className="text-[11px] font-bold text-slate-200 truncate">{data.label}</div>
    <div className="text-[9px] font-mono text-slate-400 mt-0.5">Till: {data.validity_date || 'Active'}</div>
  </div>
);

// Register custom nodes
const nodeTypes = {
  tender: TenderNode,
  company: CompanyNode,
  person: PersonNode,
  address: AddressNode,
  identifier: IdentifierNode,
  document: DocumentNode,
  project: ProjectNode,
  oem: OEMNode,
};

// ── MAIN GRAPH WORKBENCH COMPONENT ───────────────────────────────────────────

interface ProcurementGraphProps {
  tenderId: string;
}

const ProcurementGraphInternal: React.FC<ProcurementGraphProps> = ({ tenderId }) => {
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & View Modes
  const [selectedFilter, setSelectedFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'entity' | 'risk' | 'relationship'>('entity');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedBidderFilter, setSelectedBidderFilter] = useState<string>('ALL');

  // Inspection Drawer State
  const [selectedEdge, setSelectedEdge] = useState<RelationshipEdge | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerType, setDrawerType] = useState<'edge' | 'node' | null>(null);

  const { fitView, zoomIn, zoomOut } = useReactFlow();

  // Load Graph Data from Backend
  useEffect(() => {
    if (!tenderId) return;
    setLoading(true);
    getGraphData(tenderId)
      .then((data: any) => {
        setGraphData(data);
        setNodes(data.nodes || []);
        setEdges(data.edges || []);
      })
      .catch((err) => console.error('Failed to load risk graph:', err))
      .finally(() => setLoading(false));
  }, [tenderId]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  // Handle Edge Click -> Open Relationship Detail Panel
  const onEdgeClick = useCallback((_: any, edge: Edge) => {
    setSelectedEdge(edge as RelationshipEdge);
    setSelectedNode(null);
    setDrawerType('edge');
    setDrawerOpen(true);
  }, []);

  // Handle Node Click -> Open Node Detail Panel
  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelectedNode(node);
    setSelectedEdge(null);
    setDrawerType('node');
    setDrawerOpen(true);
  }, []);

  // Apply Search, Filters, and View Modes dynamically
  const filteredNodesAndEdges = useMemo(() => {
    if (!graphData) return { nodes: [], edges: [] };

    let activeNodes = [...graphData.nodes];
    let activeEdges = [...graphData.edges];

    // Filter by Bidder
    if (selectedBidderFilter !== 'ALL') {
      const bId = Number(selectedBidderFilter);
      activeNodes = activeNodes.filter(
        (n) =>
          n.type === 'tender' ||
          n.data?.bidder_id === bId ||
          (n.data?.is_shared && true)
      );
      const activeNodeIds = new Set(activeNodes.map((n) => n.id));
      activeEdges = activeEdges.filter(
        (e) => activeNodeIds.has(e.source) && activeNodeIds.has(e.target)
      );
    }

    // Filter by Node Type / Category
    if (selectedFilter === 'FLAGGED') {
      activeNodes = activeNodes.filter(
        (n) =>
          n.type === 'tender' ||
          n.data?.is_flagged ||
          n.data?.is_inconsistent ||
          n.data?.is_expired ||
          n.data?.is_shared
      );
      activeEdges = activeEdges.filter(
        (e) => e.data?.requires_review || e.data?.is_flagged || e.label?.includes('⚠')
      );
      const connectedNodeIds = new Set([
        ...activeEdges.map((e) => e.source),
        ...activeEdges.map((e) => e.target),
        ...activeNodes.map((n) => n.id),
      ]);
      activeNodes = graphData.nodes.filter((n) => connectedNodeIds.has(n.id) || n.type === 'tender');
    } else if (selectedFilter === 'COMPANIES') {
      activeNodes = activeNodes.filter((n) => n.type === 'company' || n.type === 'tender');
      activeEdges = activeEdges.filter((e) => e.label === 'SUBMITTED_BID' || e.label?.includes('SHARED'));
    } else if (selectedFilter === 'DIRECTORS') {
      activeNodes = activeNodes.filter(
        (n) => n.type === 'person' || n.type === 'company' || n.type === 'tender'
      );
      activeEdges = activeEdges.filter(
        (e) => e.label?.includes('DIRECTOR') || e.label === 'SUBMITTED_BID'
      );
    } else if (selectedFilter === 'ADDRESSES') {
      activeNodes = activeNodes.filter(
        (n) => n.type === 'address' || n.type === 'company' || n.type === 'tender'
      );
      activeEdges = activeEdges.filter(
        (e) => e.label?.includes('ADDRESS') || e.label?.includes('REGISTERED') || e.label === 'SUBMITTED_BID'
      );
    } else if (selectedFilter === 'DOCUMENTS') {
      activeNodes = activeNodes.filter(
        (n) => n.type === 'document' || n.type === 'company' || n.type === 'tender'
      );
      activeEdges = activeEdges.filter(
        (e) => e.label?.includes('DOCUMENT') || e.label === 'SUBMITTED_BID'
      );
    } else if (selectedFilter === 'IDENTIFIERS') {
      activeNodes = activeNodes.filter(
        (n) => n.type === 'identifier' || n.type === 'company' || n.type === 'tender'
      );
      activeEdges = activeEdges.filter(
        (e) =>
          e.label?.includes('GST') ||
          e.label?.includes('PAN') ||
          e.label?.includes('CIN') ||
          e.label?.includes('UDYAM') ||
          e.label === 'SUBMITTED_BID'
      );
    } else if (selectedFilter === 'PROJECTS') {
      activeNodes = activeNodes.filter(
        (n) => n.type === 'project' || n.type === 'company' || n.type === 'tender'
      );
      activeEdges = activeEdges.filter(
        (e) => e.label?.includes('WORKED') || e.label === 'SUBMITTED_BID'
      );
    } else if (selectedFilter === 'RISKS') {
      activeEdges = activeEdges.filter(
        (e) => e.data?.requires_review || e.data?.is_flagged || e.label?.includes('⚠')
      );
      const connectedNodeIds = new Set([
        ...activeEdges.map((e) => e.source),
        ...activeEdges.map((e) => e.target),
      ]);
      activeNodes = activeNodes.filter((n) => connectedNodeIds.has(n.id) || n.type === 'tender');
    }

    // Search Query Matching & Dimming
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchedNodeIds = new Set(
        activeNodes
          .filter(
            (n) =>
              (n.data?.label && String(n.data.label).toLowerCase().includes(q)) ||
              (n.data?.entity_type && String(n.data.entity_type).toLowerCase().includes(q)) ||
              (n.data?.gstin && String(n.data.gstin).toLowerCase().includes(q)) ||
              (n.data?.pan && String(n.data.pan).toLowerCase().includes(q)) ||
              (n.data?.full_address && String(n.data.full_address).toLowerCase().includes(q)) ||
              (n.data?.client_name && String(n.data.client_name).toLowerCase().includes(q))
          )
          .map((n) => n.id)
      );

      // Add connected edges and adjacent nodes
      const connectedEdgeIds = new Set<string>();
      activeEdges.forEach((e) => {
        if (matchedNodeIds.has(e.source) || matchedNodeIds.has(e.target)) {
          connectedEdgeIds.add(e.id);
          matchedNodeIds.add(e.source);
          matchedNodeIds.add(e.target);
        }
      });

      // Apply opacity style for search highlighting
      activeNodes = activeNodes.map((n) => ({
        ...n,
        position: n.position || { x: 0, y: 0 },
        style: {
          ...(n.style || {}),
          opacity: matchedNodeIds.has(n.id) ? 1 : 0.25,
        },
      }));

      activeEdges = activeEdges.map((e) => ({
        ...e,
        style: {
          ...(e.style || {}),
          opacity: connectedEdgeIds.has(e.id) ? 1 : 0.15,
        },
      }));
    }

    return {
      nodes: (activeNodes.map((n) => ({
        ...n,
        position: n.position || { x: 0, y: 0 },
      })) as unknown) as Node[],
      edges: (activeEdges as unknown) as Edge[],
    };
  }, [graphData, selectedFilter, selectedBidderFilter, searchQuery, viewMode]);

  // Sync rendered nodes and edges
  useEffect(() => {
    setNodes(filteredNodesAndEdges.nodes);
    setEdges(filteredNodesAndEdges.edges);
  }, [filteredNodesAndEdges]);

  // Export SVG utility
  const handleExportSVG = () => {
    const svgElement = document.querySelector('.react-flow__viewport');
    if (!svgElement) return;
    const blob = new Blob([svgElement.outerHTML], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `procureai-entity-graph-${tenderId || 'export'}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const summary = graphData?.summary || {
    total_nodes: nodes.length,
    total_edges: edges.length,
    flagged_nodes: 0,
    flagged_relationships: 0,
    high_risk_signals: 0,
    entities_requiring_review: 0,
  };

  const tenderInfo = graphData?.tender || {
    tender_id: 'TND-2024-RAIL-001',
    title: 'Supply of Railway Electrical Equipment',
    status: 'ACTIVE EVALUATION',
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto flex flex-col h-[calc(100vh-5.5rem)]">
      {/* ── GRAPH HEADER ─────────────────────────────────────────────────── */}
      <div className="bg-[#111827] rounded p-4 border border-[#1e293b] shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-4 flex-shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-lg font-bold text-slate-100 font-display tracking-tight flex items-center gap-2">
              <Network className="w-5 h-5 text-[#6366f1]" />
              Procurement Risk & Entity Graph
            </h1>
            <span className="px-2 py-0.5 rounded bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/40 font-mono text-[10px] font-bold">
              {tenderInfo.status}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Interactive mapping of bidder entities, relationships, documents and procurement risk signals.
          </p>
          <div className="mt-1 text-[11px] font-mono text-slate-300">
            <span className="text-[#c0c1ff] font-semibold">{tenderInfo.tender_id}</span> — {tenderInfo.title}
          </div>
        </div>

        {/* Real Backend Metric Summary Bar */}
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          <div className="bg-[#0b0f19] px-3 py-1.5 rounded border border-[#1e293b] flex items-center gap-2">
            <span className="text-slate-400 text-[10px] uppercase">Entities:</span>
            <span className="font-bold text-slate-100">{summary.total_nodes}</span>
          </div>
          <div className="bg-[#0b0f19] px-3 py-1.5 rounded border border-[#1e293b] flex items-center gap-2">
            <span className="text-slate-400 text-[10px] uppercase">Relationships:</span>
            <span className="font-bold text-slate-100">{summary.total_edges}</span>
          </div>
          <div className="bg-[#0b0f19] px-3 py-1.5 rounded border border-[#1e293b] flex items-center gap-2">
            <span className="text-[#ef4444] text-[10px] uppercase font-bold flex items-center gap-1">
              <ShieldAlert className="w-3 h-3" /> Flagged:
            </span>
            <span className="font-bold text-[#ef4444]">{summary.flagged_relationships}</span>
          </div>
          <div className="bg-[#0b0f19] px-3 py-1.5 rounded border border-[#1e293b] flex items-center gap-2">
            <span className="text-[#f59e0b] text-[10px] uppercase font-bold">Review:</span>
            <span className="font-bold text-[#f59e0b]">{summary.entities_requiring_review} Bidders</span>
          </div>
        </div>
      </div>

      {/* ── GRAPH TOOLBAR ─────────────────────────────────────────────────── */}
      <div className="bg-[#111827] px-4 py-2.5 rounded border border-[#1e293b] shadow flex flex-col md:flex-row md:items-center justify-between gap-3 flex-shrink-0">
        {/* Left: Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar font-mono text-xs">
          {[
            { id: 'ALL', label: `All Nodes (${summary.total_nodes})` },
            { id: 'FLAGGED', label: `Flagged Only (${summary.flagged_relationships})`, icon: AlertTriangle, isAlert: true },
            { id: 'COMPANIES', label: 'Companies' },
            { id: 'DIRECTORS', label: 'Directors' },
            { id: 'ADDRESSES', label: 'Addresses' },
            { id: 'DOCUMENTS', label: 'Documents' },
            { id: 'IDENTIFIERS', label: 'Identifiers' },
            { id: 'PROJECTS', label: 'Projects' },
            { id: 'RISKS', label: 'Risk Rel.' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedFilter(tab.id)}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all whitespace-nowrap flex items-center gap-1 ${
                selectedFilter === tab.id
                  ? tab.isAlert
                    ? 'bg-[#ef4444] text-white font-bold shadow'
                    : 'bg-[#6366f1] text-white font-bold shadow'
                  : 'bg-[#0b0f19] text-slate-400 hover:text-slate-200 border border-[#1e293b]'
              }`}
            >
              {tab.icon && <tab.icon className="w-3 h-3" />}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Right: Search & Actions */}
        <div className="flex items-center gap-2 font-mono">
          {/* Bidder Filter */}
          <select
            value={selectedBidderFilter}
            onChange={(e) => setSelectedBidderFilter(e.target.value)}
            className="bg-[#0b0f19] border border-[#1e293b] text-slate-200 text-xs rounded px-2.5 py-1 focus:outline-none focus:border-[#6366f1]"
          >
            <option value="ALL">All Bidders</option>
            {graphData?.nodes
              ?.filter((n) => n.type === 'company')
              .map((c) => (
                <option key={c.id} value={String(c.data.bidder_id)}>
                  {c.data.label}
                </option>
              ))}
          </select>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search entity, DIN, GSTIN..."
              className="pl-8 pr-3 py-1 bg-[#0b0f19] border border-[#1e293b] text-xs text-slate-200 rounded focus:outline-none focus:border-[#6366f1] w-48 sm:w-56"
            />
          </div>

          <button
            onClick={handleExportSVG}
            className="px-2.5 py-1 bg-[#1f2937] hover:bg-[#334155] text-slate-200 border border-[#334155] rounded text-xs flex items-center gap-1.5 transition"
            title="Export Graph to SVG"
          >
            <Download className="w-3.5 h-3.5 text-[#6366f1]" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* ── GRAPH CANVAS & INSPECTION DRAWER ──────────────────────────────── */}
      <div className="bg-[#0b0f19] rounded border border-[#1e293b] shadow-2xl flex-1 relative overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 font-mono text-xs">
            <span className="w-6 h-6 border-2 border-[#6366f1] border-t-transparent rounded-full animate-spin mb-3"></span>
            <p>Constructing multi-tier entity intelligence graph from database records...</p>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            nodeTypes={nodeTypes}
            fitView
            minZoom={0.2}
            maxZoom={2}
          >
            <Controls className="!bg-[#111827] !border-[#1e293b] !text-slate-200 !rounded-none" />
            <Background gap={24} size={1} color="#1e293b" />

            {/* Bottom-Right HUD: Legend */}
            <Panel position="bottom-right" className="!m-3 space-y-2">
              <div className="bg-[#111827]/95 backdrop-blur border border-[#1e293b] rounded p-3 shadow-2xl font-mono text-[11px] space-y-1.5 max-w-[220px]">
                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 border-b border-[#1e293b] pb-1">
                  Entity Graph Legend
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded bg-[#6366f1]"></span>
                  <span className="text-slate-300">Tender / Company</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded bg-sky-400"></span>
                  <span className="text-slate-300">Person / Director</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded bg-emerald-400"></span>
                  <span className="text-slate-300">Address / Location</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded bg-amber-400"></span>
                  <span className="text-slate-300">Project Experience</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-0.5 border-t-2 border-dashed border-[#ef4444]"></span>
                  <span className="text-[#ef4444] font-bold">Potential Relationship / Flag</span>
                </div>
              </div>
            </Panel>
          </ReactFlow>
        )}

        {/* ── RIGHT INSPECTION DETAIL PANEL (DRAWER) ────────────────────── */}
        {drawerOpen && (
          <aside className="absolute top-3 bottom-3 right-3 w-96 bg-[#111827]/95 backdrop-blur-md border border-[#334155] rounded shadow-2xl flex flex-col z-30 transition-all font-mono">
            {/* Header */}
            <div className="p-3.5 bg-[#0b0f19] border-b border-[#1e293b] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#6366f1]" />
                <h3 className="font-bold text-xs text-slate-100 uppercase tracking-wide">
                  {drawerType === 'edge' ? 'Relationship Dossier' : 'Entity Intelligence'}
                </h3>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-100 rounded transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-4 space-y-4 overflow-y-auto flex-1 text-xs">
              {drawerType === 'edge' && selectedEdge && (
                <>
                  {/* Alert Banner if flagged */}
                  {(selectedEdge.data?.requires_review || selectedEdge.data?.is_flagged || selectedEdge.label?.includes('⚠')) && (
                    <div className="p-3 bg-[#ef4444]/15 border border-[#ef4444]/40 rounded text-xs space-y-1">
                      <div className="flex items-center gap-1.5 text-[#ef4444] font-bold text-[11px] uppercase">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Requires Officer Review</span>
                      </div>
                      <p className="text-slate-300 text-[11px] leading-relaxed">
                        Potential relationship or cross-document inconsistency identified. Verify evidence source before final award.
                      </p>
                    </div>
                  )}

                  {/* Relationship Overview */}
                  <div className="space-y-2">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                      Relationship Type
                    </span>
                    <div className="p-2.5 bg-[#0b0f19] rounded border border-[#1e293b] font-bold text-[#c0c1ff]">
                      {selectedEdge.data?.relationship_type || selectedEdge.label || 'Connection'}
                    </div>
                  </div>

                  {/* Entities Connected */}
                  <div className="space-y-2">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                      Connected Entities
                    </span>
                    <div className="p-2.5 bg-[#0b0f19] rounded border border-[#1e293b] space-y-1 text-[11px]">
                      <div className="text-slate-300">
                        <span className="text-slate-500 uppercase text-[9px] block">Entity A:</span>
                        {selectedEdge.data?.entity_a || selectedEdge.data?.source_entity || selectedEdge.source}
                      </div>
                      <div className="border-t border-[#1e293b] pt-1 mt-1 text-slate-300">
                        <span className="text-slate-500 uppercase text-[9px] block">Entity B:</span>
                        {selectedEdge.data?.entity_b || selectedEdge.data?.target_entity || selectedEdge.target}
                      </div>
                    </div>
                  </div>

                  {/* Evidence Traceability */}
                  {selectedEdge.data?.evidence && (
                    <div className="space-y-2">
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                        Verifiable Evidence Trace
                      </span>
                      <div className="p-3 bg-[#1e293b]/60 rounded border border-[#334155] text-slate-200 text-[11px] leading-relaxed">
                        "{selectedEdge.data.evidence}"
                      </div>
                    </div>
                  )}

                  {/* Metadata: Source Document, Page, Confidence */}
                  <div className="p-2.5 bg-[#0b0f19] rounded border border-[#1e293b] space-y-1.5 text-[10px] text-slate-400">
                    <div className="flex items-center justify-between">
                      <span>Source Document:</span>
                      <span className="text-slate-200 font-semibold">{selectedEdge.data?.source_document || 'Tender Submission'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Evidence Location:</span>
                      <span className="text-slate-200">Page {selectedEdge.data?.page_number || 1}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Extraction Confidence:</span>
                      <span className="text-[#10b981] font-bold">{selectedEdge.data?.confidence || 'High'}</span>
                    </div>
                  </div>
                </>
              )}

              {drawerType === 'node' && selectedNode && (
                <>
                  <div className="p-3 bg-[#0b0f19] rounded border border-[#1e293b] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-[#c0c1ff] font-bold uppercase">
                        {String(selectedNode.data?.entity_type || selectedNode.type || '')}
                      </span>
                      {Boolean(selectedNode.data?.verification_status) && (
                        <span className="px-1.5 py-0.5 rounded bg-[#10b981]/20 text-[#10b981] text-[9px] font-bold">
                          {String(selectedNode.data.verification_status)}
                        </span>
                      )}
                    </div>
                    <div className="font-bold text-slate-100 text-sm">
                      {String(selectedNode.data?.label || '')}
                    </div>
                  </div>

                  {/* Attributes Table */}
                  <div className="space-y-2">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                      Entity Attributes
                    </span>
                    <div className="p-2.5 bg-[#0b0f19] rounded border border-[#1e293b] space-y-1.5 text-[11px]">
                      {Boolean(selectedNode.data?.cin) && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">CIN:</span>
                          <span className="text-slate-200">{String(selectedNode.data.cin)}</span>
                        </div>
                      )}
                      {Boolean(selectedNode.data?.gstin) && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">GSTIN:</span>
                          <span className="text-[#c0c1ff]">{String(selectedNode.data.gstin)}</span>
                        </div>
                      )}
                      {Boolean(selectedNode.data?.pan) && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">PAN:</span>
                          <span className="text-[#c0c1ff]">{String(selectedNode.data.pan)}</span>
                        </div>
                      )}
                      {Boolean(selectedNode.data?.din) && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">DIN:</span>
                          <span className="text-[#c0c1ff]">{String(selectedNode.data.din)}</span>
                        </div>
                      )}
                      {Boolean(selectedNode.data?.full_address) && (
                        <div className="pt-1 border-t border-[#1e293b]">
                          <span className="text-slate-400 block mb-0.5">Address:</span>
                          <span className="text-slate-200">{String(selectedNode.data.full_address)}</span>
                        </div>
                      )}
                      {Boolean(selectedNode.data?.project_value) && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Project Value:</span>
                          <span className="text-emerald-400 font-bold">{String(selectedNode.data.project_value)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {Boolean(selectedNode.data?.risk_summary) && (
                    <div className="p-2.5 bg-[#1e293b]/60 rounded border border-[#334155] text-[11px] text-slate-300">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                        Evaluation Note:
                      </span>
                      {String(selectedNode.data.risk_summary)}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Actions Footer */}
            <div className="p-3 bg-[#0b0f19] border-t border-[#1e293b] flex items-center justify-between gap-2">
              <button
                onClick={() => setDrawerOpen(false)}
                className="w-full py-1.5 bg-[#6366f1] hover:bg-[#4f46e5] text-white rounded text-xs font-semibold transition"
              >
                Close Dossier
              </button>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};

// Main Export with ReactFlowProvider
export const ProcurementGraph: React.FC<ProcurementGraphProps> = (props) => (
  <ReactFlowProvider>
    <ProcurementGraphInternal {...props} />
  </ReactFlowProvider>
);
