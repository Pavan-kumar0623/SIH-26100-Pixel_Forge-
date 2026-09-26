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
  Panel,
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  EdgeProps,
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
  Download,
  RotateCcw,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  X,
  Sparkles,
  Layers,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Compass,
  CheckCircle2,
  HelpCircle,
  Eye,
} from 'lucide-react';
import { getGraphData } from '../api/client';
import type { GraphData, EntityNode, RelationshipEdge } from '../types';

// ── CUSTOM EDGE COMPONENTS ──────────────────────────────────────────────────

// 1. High-Priority Risk / Inconsistency Edge
const CustomRiskEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data,
  label,
  selected,
}) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const isHighlighted = (data as any)?.isHighlighted;
  const isDimmed = (data as any)?.isDimmed;
  const isWarning = (data as any)?.relationship_type?.includes('ADDRESS') || (data as any)?.relationship_type?.includes('NAME');
  const strokeColor = isWarning ? '#f59e0b' : '#ef4444';
  const labelBg = isWarning ? 'bg-amber-950/90 text-amber-200 border-amber-500/60' : 'bg-rose-950/90 text-rose-200 border-rose-500/60';

  const cleanLabel = (label as string || (data as any)?.relationship_type || 'Risk Signal')
    .replace(' ⚠', '')
    .replace('POTENTIAL_', '')
    .replace(/_/g, ' ');

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          ...style,
          stroke: strokeColor,
          strokeWidth: selected ? 3.5 : isHighlighted ? 3 : 2.5,
          strokeDasharray: '6 4',
          opacity: isDimmed ? 0.2 : 1,
          filter: `drop-shadow(0 0 6px ${strokeColor}66)`,
          transition: 'all 200ms ease',
        }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
            opacity: isDimmed ? 0.2 : 1,
            zIndex: 10,
          }}
          className="nodrag nopan"
        >
          <button
            type="button"
            className={`px-2.5 py-0.5 rounded-full border shadow-xl text-[10px] font-mono font-bold flex items-center gap-1.5 cursor-pointer hover:scale-105 active:scale-95 transition-transform ${labelBg}`}
            title="Click to inspect relationship evidence"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isWarning ? 'bg-amber-400' : 'bg-rose-400 animate-ping'} inline-block`}></span>
            <span className="uppercase tracking-wider">{cleanLabel}</span>
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

// 2. Subtle Standard Structural Edge
const CustomStandardEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data,
  label,
  selected,
}) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const isHighlighted = (data as any)?.isHighlighted;
  const isDimmed = (data as any)?.isDimmed;

  // Format label to clean readable title
  const cleanLabel = (label as string || (data as any)?.relationship_type || '')
    .replace('HAS_', '')
    .replace(/_/g, ' ');

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          ...style,
          stroke: isHighlighted ? '#818cf8' : selected ? '#c7d2fe' : '#334155',
          strokeWidth: isHighlighted || selected ? 2 : 1.25,
          opacity: isDimmed ? 0.15 : isHighlighted ? 1 : 0.5,
          transition: 'all 200ms ease',
        }}
      />
      {cleanLabel && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
              opacity: isDimmed ? 0.15 : isHighlighted ? 1 : 0.75,
              zIndex: 5,
            }}
            className="nodrag nopan"
          >
            <div
              className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-medium transition-all shadow-sm cursor-pointer ${
                isHighlighted
                  ? 'bg-slate-900 text-indigo-200 border border-indigo-500/60 shadow-indigo-500/20'
                  : 'bg-slate-950/80 text-slate-400 border border-slate-800/80 hover:text-slate-200 hover:border-slate-600'
              }`}
            >
              {cleanLabel}
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

const edgeTypes = {
  default: CustomStandardEdge,
  relationship: CustomRiskEdge,
  risk: CustomRiskEdge,
};

// ── CUSTOM NODE COMPONENTS ───────────────────────────────────────────────────

// 1. Tender Node (Root Context Level 1)
const TenderNode = ({ data, selected }: any) => {
  const isHighlighted = data?.isHighlighted;
  const isDimmed = data?.isDimmed;

  return (
    <div
      className={`p-4 rounded-xl bg-slate-900/95 border-2 shadow-2xl min-w-[280px] max-w-[320px] text-left transition-all duration-200 cursor-pointer ${
        selected
          ? 'border-indigo-500 ring-4 ring-indigo-500/30 shadow-indigo-950/50'
          : isHighlighted
          ? 'border-indigo-400 shadow-indigo-950/40 ring-2 ring-indigo-400/20'
          : 'border-indigo-500/60 shadow-indigo-950/20 hover:border-indigo-400'
      } ${isDimmed ? 'opacity-30' : 'opacity-100'}`}
    >
      <Handle type="source" position={Position.Bottom} className="!bg-indigo-500 !w-3 !h-3 !border-2 !border-slate-900" />
      <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-1.5 text-indigo-300">
          <Network className="w-4 h-4 text-indigo-400" />
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider">ROOT TENDER</span>
        </div>
        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono text-[9px] font-bold tracking-wide">
          {data.status || 'ACTIVE EVALUATION'}
        </span>
      </div>
      <div className="font-bold text-slate-100 text-sm font-display mb-2 leading-tight line-clamp-2" title={data.label}>
        {data.label}
      </div>
      <div className="text-[10px] font-mono text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/60">
        <span className="text-slate-300 font-semibold">{data.tender_id || 'TND-2024'}</span>
        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">{data.category || 'Railway'}</span>
      </div>
    </div>
  );
};

// 2. Company / Bidder Node (Level 2)
const CompanyNode = ({ data, selected }: any) => {
  const isFlagged = data.is_flagged || data.verification_status === 'RISK SIGNAL';
  const isReview = data.verification_status === 'REVIEW' || data.verification_status === 'MISSING INFORMATION';
  const isHighlighted = data?.isHighlighted;
  const isDimmed = data?.isDimmed;

  return (
    <div
      className={`p-4 rounded-xl bg-slate-900/95 border shadow-xl min-w-[260px] max-w-[290px] text-left transition-all duration-200 cursor-pointer ${
        selected
          ? 'border-indigo-500 ring-4 ring-indigo-500/30 shadow-indigo-950/40'
          : isHighlighted
          ? 'border-indigo-400 ring-2 ring-indigo-400/20'
          : isFlagged
          ? 'border-rose-500/80 shadow-rose-950/30 hover:border-rose-400 ring-1 ring-rose-500/20'
          : isReview
          ? 'border-amber-500/80 shadow-amber-950/20 hover:border-amber-400'
          : 'border-slate-700/80 hover:border-slate-500'
      } ${isDimmed ? 'opacity-30' : 'opacity-100'}`}
    >
      <Handle type="target" position={Position.Top} className="!bg-indigo-500 !w-2.5 !h-2.5 !border-2 !border-slate-900" />
      <Handle type="source" position={Position.Bottom} className="!bg-indigo-500 !w-2.5 !h-2.5 !border-2 !border-slate-900" />

      <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-slate-800">
        <div className="flex items-center gap-1.5 text-slate-300">
          <Building2 className={`w-4 h-4 ${isFlagged ? 'text-rose-400' : isReview ? 'text-amber-400' : 'text-indigo-400'}`} />
          <span className="font-mono text-[10px] font-bold text-slate-400 tracking-wider">BIDDER #{data.bidder_id}</span>
        </div>
        <span
          className={`px-2 py-0.5 rounded-full font-mono text-[9px] font-bold tracking-wide flex items-center gap-1 ${
            isFlagged
              ? 'bg-rose-500/15 text-rose-400 border border-rose-500/40'
              : isReview
              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/40'
              : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/40'
          }`}
        >
          {isFlagged && <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse inline-block"></span>}
          {data.verification_status || 'VERIFIED'}
        </span>
      </div>

      <div className="font-bold text-slate-100 text-sm truncate mb-2" title={data.label}>
        {data.label}
      </div>

      <div className="space-y-1.5 text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-800/60">
        <div className="flex items-center justify-between">
          <span className="text-slate-500">GST: {data.gstin ? data.gstin.slice(0, 10) + '...' : 'N/A'}</span>
          <span className="text-indigo-300 font-bold bg-indigo-950/60 border border-indigo-500/30 px-1.5 py-0.2 rounded">
            {data.compliance_score ?? 100}% Comp.
          </span>
        </div>
        {data.high_risks > 0 && (
          <div className="flex items-center gap-1 text-rose-400 font-semibold bg-rose-950/40 border border-rose-500/30 px-1.5 py-0.5 rounded">
            <ShieldAlert className="w-3 h-3" />
            <span>{data.high_risks} Critical Flag(s)</span>
          </div>
        )}
      </div>
    </div>
  );
};

// 3. Person / Director Node (Level 3)
const PersonNode = ({ data, selected }: any) => {
  const isHighlighted = data?.isHighlighted;
  const isDimmed = data?.isDimmed;

  return (
    <div
      className={`p-3 rounded-lg bg-slate-900/95 border shadow-md min-w-[180px] max-w-[210px] text-left transition-all duration-200 cursor-pointer ${
        selected
          ? 'border-indigo-500 ring-4 ring-indigo-500/30'
          : isHighlighted
          ? 'border-sky-400 ring-2 ring-sky-400/20'
          : data.is_shared
          ? 'border-rose-500/80 shadow-rose-950/30 ring-1 ring-rose-500/30'
          : 'border-slate-800 hover:border-slate-600'
      } ${isDimmed ? 'opacity-30' : 'opacity-100'}`}
    >
      <Handle type="target" position={Position.Top} className="!bg-indigo-500 !w-2 !h-2 !border-2 !border-slate-900" />
      <Handle type="source" position={Position.Bottom} className="!bg-indigo-500 !w-2 !h-2 !border-2 !border-slate-900" />
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5 text-slate-300">
          <User className={`w-3.5 h-3.5 ${data.is_shared ? 'text-rose-400' : 'text-sky-400'}`} />
          <span className="text-[9px] font-mono font-bold uppercase text-slate-400 tracking-wider">DIRECTOR</span>
        </div>
        {data.is_shared && (
          <span className="px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 font-mono text-[8px] font-bold">
            SHARED
          </span>
        )}
      </div>
      <div className="font-bold text-slate-100 text-xs truncate mb-1">{data.label}</div>
      <div className="text-[9px] font-mono text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800/80">
        DIN: <span className="text-slate-300 font-semibold">{data.din || '01234567'}</span>
      </div>
    </div>
  );
};

// 4. Identifier Node (GSTIN / PAN / CIN / Udyam - Level 3)
const IdentifierNode = ({ data, selected }: any) => {
  const isHighlighted = data?.isHighlighted;
  const isDimmed = data?.isDimmed;

  return (
    <div
      className={`p-2.5 rounded-lg bg-slate-950/90 border shadow-sm min-w-[140px] max-w-[170px] text-left transition-all duration-200 cursor-pointer ${
        selected
          ? 'border-indigo-500 ring-4 ring-indigo-500/30'
          : isHighlighted
          ? 'border-indigo-400 ring-2 ring-indigo-400/20'
          : 'border-slate-800 hover:border-slate-600'
      } ${isDimmed ? 'opacity-30' : 'opacity-100'}`}
    >
      <Handle type="target" position={Position.Top} className="!bg-indigo-500 !w-1.5 !h-1.5 !border !border-slate-900" />
      <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 mb-1">
        <span className="font-bold text-indigo-300 tracking-wider">{data.entity_type}</span>
        {data.status && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>}
      </div>
      <div className="font-mono text-[10px] font-semibold text-slate-200 truncate tracking-tight">{data.label}</div>
    </div>
  );
};

// 5. Document Node (Level 4)
const DocumentNode = ({ data, selected }: any) => {
  const isHighlighted = data?.isHighlighted;
  const isDimmed = data?.isDimmed;

  return (
    <div
      className={`p-2.5 rounded-lg bg-slate-900/95 border shadow-sm min-w-[170px] max-w-[200px] text-left transition-all duration-200 cursor-pointer ${
        selected
          ? 'border-indigo-500 ring-4 ring-indigo-500/30'
          : isHighlighted
          ? 'border-indigo-400 ring-2 ring-indigo-400/20'
          : 'border-slate-800 hover:border-slate-600'
      } ${isDimmed ? 'opacity-30' : 'opacity-100'}`}
    >
      <Handle type="target" position={Position.Top} className="!bg-indigo-500 !w-2 !h-2 !border-2 !border-slate-900" />
      <div className="flex items-center gap-1.5 mb-1 text-slate-400">
        <FileText className="w-3.5 h-3.5 text-indigo-400" />
        <span className="text-[9px] font-mono font-bold uppercase truncate text-slate-400 tracking-wider">
          {data.document_type || 'DOCUMENT'}
        </span>
      </div>
      <div className="text-[11px] font-semibold text-slate-200 truncate mb-1" title={data.label}>
        {data.label}
      </div>
      <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 pt-1 border-t border-slate-800/80">
        <span className="text-emerald-400 font-semibold">{data.status || 'PROCESSED'}</span>
        <span className="bg-slate-950 px-1 rounded text-slate-300">
          {data.ocr_used === 'true' || data.ocr_used === true ? 'OCR' : 'PDF'}
        </span>
      </div>
    </div>
  );
};

// 6. Project / Experience Node (Level 4)
const ProjectNode = ({ data, selected }: any) => {
  const isHighlighted = data?.isHighlighted;
  const isDimmed = data?.isDimmed;

  return (
    <div
      className={`p-3 rounded-lg bg-slate-900/95 border shadow-md min-w-[180px] max-w-[210px] text-left transition-all duration-200 cursor-pointer ${
        selected
          ? 'border-indigo-500 ring-4 ring-indigo-500/30'
          : isHighlighted
          ? 'border-amber-400 ring-2 ring-amber-400/20'
          : 'border-slate-800 hover:border-slate-600'
      } ${isDimmed ? 'opacity-30' : 'opacity-100'}`}
    >
      <Handle type="target" position={Position.Top} className="!bg-indigo-500 !w-2 !h-2 !border-2 !border-slate-900" />
      <div className="flex items-center gap-1.5 text-slate-400 mb-1.5">
        <Briefcase className="w-3.5 h-3.5 text-amber-400" />
        <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400">PAST PROJECT</span>
      </div>
      <div className="text-xs font-bold text-slate-200 truncate mb-1">{data.client_name || data.label}</div>
      <div className="text-[10px] font-mono text-emerald-400 font-semibold bg-emerald-950/40 border border-emerald-500/30 px-1.5 py-0.5 rounded">
        Value: {data.project_value || '₹2+ Cr'}
      </div>
    </div>
  );
};

// 7. Address Node (Level 5)
const AddressNode = ({ data, selected }: any) => {
  const isHighlighted = data?.isHighlighted;
  const isDimmed = data?.isDimmed;

  return (
    <div
      className={`p-3 rounded-lg bg-slate-900/95 border shadow-md min-w-[190px] max-w-[230px] text-left transition-all duration-200 cursor-pointer ${
        selected
          ? 'border-indigo-500 ring-4 ring-indigo-500/30'
          : isHighlighted
          ? 'border-emerald-400 ring-2 ring-emerald-400/20'
          : data.is_inconsistent
          ? 'border-amber-500/80 shadow-amber-950/30 ring-1 ring-amber-500/30'
          : 'border-slate-800 hover:border-slate-600'
      } ${isDimmed ? 'opacity-30' : 'opacity-100'}`}
    >
      <Handle type="target" position={Position.Top} className="!bg-indigo-500 !w-2 !h-2 !border-2 !border-slate-900" />
      <Handle type="source" position={Position.Bottom} className="!bg-indigo-500 !w-2 !h-2 !border-2 !border-slate-900" />
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5 text-slate-400">
          <MapPin className={`w-3.5 h-3.5 ${data.is_inconsistent ? 'text-amber-400' : 'text-emerald-400'}`} />
          <span className="text-[9px] font-mono font-bold uppercase tracking-wider">ADDRESS</span>
        </div>
        {data.is_inconsistent && (
          <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 font-mono text-[8px] font-bold">
            MISMATCH
          </span>
        )}
      </div>
      <div className="text-[11px] text-slate-200 font-medium line-clamp-2 leading-tight mb-1" title={data.full_address || data.label}>
        {data.label}
      </div>
      {data.source_doc && (
        <div className="text-[9px] font-mono text-slate-400 truncate pt-1 border-t border-slate-800/60">
          Doc: {data.source_doc}
        </div>
      )}
    </div>
  );
};

// 8. OEM Authorization Node (Level 5)
const OEMNode = ({ data, selected }: any) => {
  const isHighlighted = data?.isHighlighted;
  const isDimmed = data?.isDimmed;

  return (
    <div
      className={`p-3 rounded-lg bg-slate-900/95 border shadow-md min-w-[180px] max-w-[210px] text-left transition-all duration-200 cursor-pointer ${
        selected
          ? 'border-indigo-500 ring-4 ring-indigo-500/30'
          : isHighlighted
          ? 'border-violet-400 ring-2 ring-violet-400/20'
          : data.is_expired
          ? 'border-rose-500/80 shadow-rose-950/30 ring-1 ring-rose-500/30'
          : 'border-slate-800 hover:border-slate-600'
      } ${isDimmed ? 'opacity-30' : 'opacity-100'}`}
    >
      <Handle type="target" position={Position.Top} className="!bg-indigo-500 !w-2 !h-2 !border-2 !border-slate-900" />
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5 text-slate-400">
          <ShieldCheck className={`w-3.5 h-3.5 ${data.is_expired ? 'text-rose-400' : 'text-violet-400'}`} />
          <span className="text-[9px] font-mono font-bold uppercase tracking-wider">OEM PARTNER</span>
        </div>
        {data.is_expired && (
          <span className="px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 font-mono text-[8px] font-bold">
            EXPIRED
          </span>
        )}
      </div>
      <div className="text-xs font-bold text-slate-200 truncate mb-1">{data.label}</div>
      <div className="text-[9px] font-mono text-slate-400 pt-1 border-t border-slate-800/60">
        Till: <span className={data.is_expired ? 'text-rose-400 font-semibold' : 'text-slate-300'}>{data.validity_date || 'Active'}</span>
      </div>
    </div>
  );
};

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

// ── SMART GRAPH SPACING & CLUSTER LAYOUT GENERATOR ────────────────────────────

function computeSpaciousLayout(rawNodes: Node[], rawEdges: Edge[]): Node[] {
  if (!rawNodes || rawNodes.length === 0) return [];

  const tender = rawNodes.find((n) => n.type === 'tender');
  const companies = rawNodes.filter((n) => n.type === 'company');
  const otherNodes = rawNodes.filter((n) => n.type !== 'tender' && n.type !== 'company');

  const numBidders = companies.length || 1;
  const COLUMN_WIDTH = 760; // Generous 760px breathing room between bidder columns
  const TOTAL_WIDTH = (numBidders - 1) * COLUMN_WIDTH;
  const CENTER_X = 1600;
  const START_X = CENTER_X - TOTAL_WIDTH / 2;

  const nodePositions: Record<string, { x: number; y: number }> = {};

  // 1. Level 1: Tender Node
  if (tender) {
    nodePositions[tender.id] = { x: CENTER_X - 145, y: 60 };
  }

  // 2. Level 2: Bidder Company Nodes
  const bidderXMap: Record<number | string, number> = {};
  companies.forEach((comp, idx) => {
    const colX = START_X + idx * COLUMN_WIDTH;
    const bId = comp.data?.bidder_id ?? idx;
    bidderXMap[bId] = colX;
    nodePositions[comp.id] = { x: colX - 135, y: 260 };
  });

  // Track children for each bidder
  const bidderChildren: Record<
    number | string,
    {
      identifiers: Node[];
      persons: Node[];
      documents: Node[];
      projects: Node[];
      addresses: Node[];
      oems: Node[];
      others: Node[];
    }
  > = {};

  companies.forEach((comp) => {
    const bId = comp.data?.bidder_id ?? '';
    bidderChildren[bId] = {
      identifiers: [],
      persons: [],
      documents: [],
      projects: [],
      addresses: [],
      oems: [],
      others: [],
    };
  });

  const sharedPersons: Node[] = [];

  otherNodes.forEach((node) => {
    if (node.type === 'person' && node.data?.is_shared) {
      sharedPersons.push(node);
      return;
    }

    const bId = node.data?.bidder_id;
    if (bId !== undefined && bidderChildren[bId]) {
      if (node.type === 'identifier') bidderChildren[bId].identifiers.push(node);
      else if (node.type === 'person') bidderChildren[bId].persons.push(node);
      else if (node.type === 'document') bidderChildren[bId].documents.push(node);
      else if (node.type === 'project') bidderChildren[bId].projects.push(node);
      else if (node.type === 'address') bidderChildren[bId].addresses.push(node);
      else if (node.type === 'oem') bidderChildren[bId].oems.push(node);
      else bidderChildren[bId].others.push(node);
    } else {
      const connectedEdge = rawEdges.find((e) => e.target === node.id || e.source === node.id);
      let foundBidderId: any = null;
      if (connectedEdge) {
        const otherId = connectedEdge.source === node.id ? connectedEdge.target : connectedEdge.source;
        const comp = companies.find((c) => c.id === otherId);
        if (comp) foundBidderId = comp.data?.bidder_id;
      }
      if (foundBidderId && bidderChildren[foundBidderId]) {
        if (node.type === 'identifier') bidderChildren[foundBidderId].identifiers.push(node);
        else if (node.type === 'person') bidderChildren[foundBidderId].persons.push(node);
        else if (node.type === 'document') bidderChildren[foundBidderId].documents.push(node);
        else if (node.type === 'project') bidderChildren[foundBidderId].projects.push(node);
        else if (node.type === 'address') bidderChildren[foundBidderId].addresses.push(node);
        else if (node.type === 'oem') bidderChildren[foundBidderId].oems.push(node);
        else bidderChildren[foundBidderId].others.push(node);
      }
    }
  });

  // Lay out each bidder's sub-entities in strict vertical tiers with zero overlap
  companies.forEach((comp) => {
    const bId = comp.data?.bidder_id ?? '';
    const colX = bidderXMap[bId];
    const ch = bidderChildren[bId];
    if (!ch) return;

    // ── LEVEL 3 (Y = 480): Identifiers (GSTIN, PAN, CIN, Udyam) & Directors
    const tier3Nodes = [...ch.identifiers, ...ch.persons];
    const t3Count = tier3Nodes.length;
    const t3Spacing = 160;
    const t3StartX = colX - ((t3Count - 1) * t3Spacing) / 2;
    tier3Nodes.forEach((node, idx) => {
      nodePositions[node.id] = {
        x: t3StartX + idx * t3Spacing - 75,
        y: 480,
      };
    });

    // ── LEVEL 4 (Y = 700): Documents & Past Projects
    const t4Docs = ch.documents;
    const t4Projects = ch.projects;
    const docSpacing = 170;
    const docStartX = colX - 180;
    t4Docs.forEach((doc, idx) => {
      nodePositions[doc.id] = {
        x: docStartX + idx * docSpacing,
        y: 700,
      };
    });
    t4Projects.forEach((proj, idx) => {
      nodePositions[proj.id] = {
        x: colX + 110 + idx * 170,
        y: 700,
      };
    });

    // ── LEVEL 5 (Y = 920): Addresses & OEM Partners
    ch.addresses.forEach((addr) => {
      if (addr.data?.is_inconsistent) {
        nodePositions[addr.id] = {
          x: colX - 110,
          y: 1040,
        };
      } else {
        nodePositions[addr.id] = {
          x: colX - 110,
          y: 920,
        };
      }
    });

    ch.oems.forEach((oem, idx) => {
      nodePositions[oem.id] = {
        x: colX + 100 + idx * 160,
        y: 920,
      };
    });

    ch.others.forEach((oth, idx) => {
      nodePositions[oth.id] = {
        x: colX - 100 + idx * 140,
        y: 1160,
      };
    });
  });

  // Shared Directors (e.g. Rajesh Kumar)
  sharedPersons.forEach((sp) => {
    const connectedEdges = rawEdges.filter((e) => e.target === sp.id || e.source === sp.id);
    const connectedCompanyIds = connectedEdges.map((e) => (e.target === sp.id ? e.source : e.target));
    const compXs = connectedCompanyIds
      .map((cId) => nodePositions[cId]?.x)
      .filter((x): x is number => x !== undefined);

    let midX = CENTER_X;
    if (compXs.length > 0) {
      midX = compXs.reduce((a, b) => a + b, 0) / compXs.length + 130;
    }
    nodePositions[sp.id] = { x: midX - 95, y: 480 };
  });

  return rawNodes.map((node) => ({
    ...node,
    position: nodePositions[node.id] || node.position || { x: CENTER_X, y: 300 },
  }));
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────

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
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedBidderFilter, setSelectedBidderFilter] = useState<string>('ALL');

  // Hover & Selection State
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<RelationshipEdge | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerType, setDrawerType] = useState<'edge' | 'node' | null>(null);

  // Fullscreen & UI States
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const { fitView, zoomIn, zoomOut, setCenter } = useReactFlow();

  // Load Graph Data
  useEffect(() => {
    if (!tenderId) return;
    setLoading(true);
    getGraphData(tenderId)
      .then((data: any) => {
        setGraphData(data);
      })
      .catch((err) => console.error('Failed to load risk graph:', err))
      .finally(() => setLoading(false));
  }, [tenderId]);

  // Fullscreen toggle handler
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current
        .requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch(() => setIsFullscreen(true));
    } else {
      document
        .exitFullscreen()
        .then(() => setIsFullscreen(false))
        .catch(() => setIsFullscreen(false));
    }
  }, []);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      setTimeout(() => fitView({ padding: 0.15, duration: 300 }), 150);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, [fitView]);

  // Reset View handler
  const handleResetView = useCallback(() => {
    fitView({ padding: 0.18, duration: 400 });
  }, [fitView]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  // Handle Edge Click
  const onEdgeClick = useCallback((_: any, edge: Edge) => {
    setSelectedEdge(edge as RelationshipEdge);
    setSelectedNode(null);
    setDrawerType('edge');
    setDrawerOpen(true);
  }, []);

  // Handle Node Click
  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelectedNode(node);
    setSelectedEdge(null);
    setDrawerType('node');
    setDrawerOpen(true);
  }, []);

  // Handle Node Hover
  const onNodeMouseEnter = useCallback((_: any, node: Node) => {
    setHoveredNodeId(node.id);
  }, []);

  const onNodeMouseLeave = useCallback(() => {
    setHoveredNodeId(null);
  }, []);

  // Filter & Layout pipeline
  const filteredNodesAndEdges = useMemo(() => {
    if (!graphData) return { nodes: [], edges: [] };

    let activeNodes = [...graphData.nodes];
    let activeEdges = [...graphData.edges];

    // 1. Filter by Bidder
    if (selectedBidderFilter !== 'ALL') {
      const bId = Number(selectedBidderFilter);
      activeNodes = activeNodes.filter(
        (n) => n.type === 'tender' || n.data?.bidder_id === bId || (n.data?.is_shared && true)
      );
      const activeNodeIds = new Set(activeNodes.map((n) => n.id));
      activeEdges = activeEdges.filter((e) => activeNodeIds.has(e.source) && activeNodeIds.has(e.target));
    }

    // 2. Filter by Category
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
        (e) => e.data?.requires_review || e.data?.is_flagged || e.label?.includes('⚠') || e.type === 'relationship'
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
      activeNodes = activeNodes.filter((n) => n.type === 'person' || n.type === 'company' || n.type === 'tender');
      activeEdges = activeEdges.filter((e) => e.label?.includes('DIRECTOR') || e.label === 'SUBMITTED_BID');
    } else if (selectedFilter === 'ADDRESSES') {
      activeNodes = activeNodes.filter((n) => n.type === 'address' || n.type === 'company' || n.type === 'tender');
      activeEdges = activeEdges.filter(
        (e) => e.label?.includes('ADDRESS') || e.label?.includes('REGISTERED') || e.label === 'SUBMITTED_BID'
      );
    } else if (selectedFilter === 'DOCUMENTS') {
      activeNodes = activeNodes.filter((n) => n.type === 'document' || n.type === 'company' || n.type === 'tender');
      activeEdges = activeEdges.filter((e) => e.label?.includes('DOCUMENT') || e.label === 'SUBMITTED_BID');
    } else if (selectedFilter === 'IDENTIFIERS') {
      activeNodes = activeNodes.filter((n) => n.type === 'identifier' || n.type === 'company' || n.type === 'tender');
      activeEdges = activeEdges.filter(
        (e) =>
          e.label?.includes('GST') ||
          e.label?.includes('PAN') ||
          e.label?.includes('CIN') ||
          e.label?.includes('UDYAM') ||
          e.label === 'SUBMITTED_BID'
      );
    } else if (selectedFilter === 'PROJECTS') {
      activeNodes = activeNodes.filter((n) => n.type === 'project' || n.type === 'company' || n.type === 'tender');
      activeEdges = activeEdges.filter((e) => e.label?.includes('WORKED') || e.label === 'SUBMITTED_BID');
    } else if (selectedFilter === 'RISKS') {
      activeEdges = activeEdges.filter(
        (e) => e.data?.requires_review || e.data?.is_flagged || e.label?.includes('⚠') || e.type === 'relationship'
      );
      const connectedNodeIds = new Set([
        ...activeEdges.map((e) => e.source),
        ...activeEdges.map((e) => e.target),
      ]);
      activeNodes = activeNodes.filter((n) => connectedNodeIds.has(n.id) || n.type === 'tender');
    }

    // 3. Compute layout positions
    const laidOutNodes = computeSpaciousLayout(activeNodes, activeEdges);

    // 4. Compute Connected graph set for hover highlighting
    let highlightedNodeIds = new Set<string>();
    let highlightedEdgeIds = new Set<string>();

    if (hoveredNodeId) {
      highlightedNodeIds.add(hoveredNodeId);
      activeEdges.forEach((e) => {
        if (e.source === hoveredNodeId || e.target === hoveredNodeId) {
          highlightedEdgeIds.add(e.id);
          highlightedNodeIds.add(e.source);
          highlightedNodeIds.add(e.target);
        }
      });
    }

    // 5. Search query matching
    let searchMatchedNodeIds = new Set<string>();
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      laidOutNodes.forEach((n) => {
        const matches =
          (n.data?.label && String(n.data.label).toLowerCase().includes(q)) ||
          (n.data?.entity_type && String(n.data.entity_type).toLowerCase().includes(q)) ||
          (n.data?.gstin && String(n.data.gstin).toLowerCase().includes(q)) ||
          (n.data?.pan && String(n.data.pan).toLowerCase().includes(q)) ||
          (n.data?.din && String(n.data.din).toLowerCase().includes(q)) ||
          (n.data?.full_address && String(n.data.full_address).toLowerCase().includes(q)) ||
          (n.data?.client_name && String(n.data.client_name).toLowerCase().includes(q));
        if (matches) searchMatchedNodeIds.add(n.id);
      });
    }

    // Enrich Nodes with hover/dimmed states
    const finalNodes = laidOutNodes.map((n) => {
      const isSearchActive = searchQuery.trim().length > 0;
      const isSearchMatch = isSearchActive ? searchMatchedNodeIds.has(n.id) : true;
      const isHoverActive = hoveredNodeId !== null;
      const isHoverConnected = isHoverActive ? highlightedNodeIds.has(n.id) : true;

      const isDimmed = (isSearchActive && !isSearchMatch) || (isHoverActive && !isHoverConnected);
      const isHighlighted = (isHoverActive && isHoverConnected) || (isSearchActive && isSearchMatch);

      return {
        ...n,
        data: {
          ...n.data,
          isDimmed,
          isHighlighted,
        },
      };
    });

    // Enrich Edges with hover/dimmed states
    const finalEdges = activeEdges.map((e) => {
      const isHoverActive = hoveredNodeId !== null;
      const isEdgeHighlighted = isHoverActive ? highlightedEdgeIds.has(e.id) : false;
      const isDimmed = isHoverActive && !isEdgeHighlighted;

      return {
        ...e,
        type: e.data?.requires_review || e.data?.is_flagged || e.label?.includes('⚠') ? 'relationship' : 'default',
        data: {
          ...e.data,
          isHighlighted: isEdgeHighlighted,
          isDimmed,
        },
      };
    });

    return { nodes: finalNodes, edges: finalEdges };
  }, [graphData, selectedFilter, selectedBidderFilter, searchQuery, hoveredNodeId]);

  // Sync to ReactFlow state
  useEffect(() => {
    setNodes(filteredNodesAndEdges.nodes);
    setEdges(filteredNodesAndEdges.edges);
  }, [filteredNodesAndEdges]);

  // Auto-fit view when filter or bidder changes
  useEffect(() => {
    const timer = setTimeout(() => {
      fitView({ padding: 0.18, duration: 450 });
    }, 100);
    return () => clearTimeout(timer);
  }, [selectedFilter, selectedBidderFilter, fitView]);

  // Export SVG
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
    <div
      ref={containerRef}
      className={`flex flex-col bg-[#0b0f19] text-slate-200 transition-all ${
        isFullscreen ? 'fixed inset-0 z-50 p-4' : 'h-[calc(100vh-5.5rem)] max-w-[1600px] mx-auto space-y-3'
      }`}
    >
      {/* ── 1. COMPACT ENTERPRISE HEADER ────────────────────────────────────── */}
      <div className="bg-slate-900/90 backdrop-blur-md rounded-xl p-3.5 border border-slate-800 shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-3 flex-shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <h1 className="text-base font-bold text-slate-100 font-display tracking-tight flex items-center gap-2">
              <Network className="w-5 h-5 text-indigo-400" />
              Procurement Risk & Entity Intelligence Graph
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono text-[10px] font-bold">
              {tenderInfo.status}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Multi-tier entity mapping across <span className="text-slate-300 font-semibold">{tenderInfo.tender_id}</span> ({tenderInfo.title})
          </p>
        </div>

        {/* Real Backend Metric Summary Bar */}
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          <div className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 flex items-center gap-2 shadow-inner">
            <span className="text-slate-400 text-[10px] uppercase font-medium">Entities:</span>
            <span className="font-bold text-slate-100">{summary.total_nodes}</span>
          </div>
          <div className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 flex items-center gap-2 shadow-inner">
            <span className="text-slate-400 text-[10px] uppercase font-medium">Relations:</span>
            <span className="font-bold text-slate-100">{summary.total_edges}</span>
          </div>
          <div className="bg-rose-950/40 px-3 py-1.5 rounded-lg border border-rose-500/40 flex items-center gap-2 shadow-inner">
            <span className="text-rose-400 text-[10px] uppercase font-bold flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5" /> Flagged:
            </span>
            <span className="font-bold text-rose-400">{summary.flagged_relationships}</span>
          </div>
          <div className="bg-amber-950/40 px-3 py-1.5 rounded-lg border border-amber-500/40 flex items-center gap-2 shadow-inner">
            <span className="text-amber-400 text-[10px] uppercase font-bold">Review:</span>
            <span className="font-bold text-amber-400">{summary.entities_requiring_review} Bidders</span>
          </div>
        </div>
      </div>

      {/* ── 2. FILTER & ACTION TOOLBAR ──────────────────────────────────────── */}
      <div className="bg-slate-900/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-2.5 flex-shrink-0">
        {/* Left: Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar font-mono text-xs py-0.5">
          {[
            { id: 'ALL', label: `All Entities (${summary.total_nodes})` },
            { id: 'FLAGGED', label: `Flagged Signals (${summary.flagged_relationships})`, icon: AlertTriangle, isAlert: true },
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
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                selectedFilter === tab.id
                  ? tab.isAlert
                    ? 'bg-rose-600 text-white font-bold shadow-lg shadow-rose-950/50'
                    : 'bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-950/50'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 border border-slate-800'
              }`}
            >
              {tab.icon && <tab.icon className="w-3 h-3" />}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Right: Bidder Selector, Search, & Export */}
        <div className="flex items-center gap-2 font-mono">
          {/* Bidder Column Isolator */}
          <select
            value={selectedBidderFilter}
            onChange={(e) => setSelectedBidderFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:border-indigo-500 cursor-pointer shadow-sm hover:border-slate-700"
            title="Focus on specific bidder cluster"
          >
            <option value="ALL">All Bidder Clusters</option>
            {graphData?.nodes
              ?.filter((n) => n.type === 'company')
              .map((c) => (
                <option key={c.id} value={String(c.data.bidder_id)}>
                  {c.data.label}
                </option>
              ))}
          </select>

          {/* Real-time Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search DIN, GSTIN, Entity..."
              className="pl-8 pr-3 py-1 bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 w-44 sm:w-52 shadow-sm placeholder:text-slate-500"
            />
          </div>

          <button
            onClick={handleExportSVG}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer active:scale-95"
            title="Export Graph to SVG vector image"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* ── 3. INTERACTIVE GRAPH CANVAS ─────────────────────────────────────── */}
      <div className="bg-[#0b0f19] rounded-xl border border-slate-800 shadow-2xl flex-1 relative overflow-hidden flex flex-col">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 font-mono text-xs">
            <span className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3"></span>
            <p className="tracking-wide">Constructing spacious entity intelligence graph from database records...</p>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            onNodeMouseEnter={onNodeMouseEnter}
            onNodeMouseLeave={onNodeMouseLeave}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            minZoom={0.15}
            maxZoom={2.2}
            fitViewOptions={{ padding: 0.18, duration: 400 }}
            proOptions={{ hideAttribution: true }}
            defaultEdgeOptions={{ animated: false }}
          >
            <Background gap={28} size={1} color="#1e293b" />

            {/* ── FLOATING HIGH-CONTRAST CONTROL BAR (BOTTOM-LEFT HUD) ── */}
            <Panel position="bottom-left" className="!m-4">
              <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-xl shadow-2xl p-1.5 flex items-center gap-1 font-mono text-slate-200">
                <button
                  type="button"
                  onClick={() => zoomIn({ duration: 250 })}
                  className="p-2 hover:bg-slate-800 hover:text-white rounded-lg transition-colors cursor-pointer text-slate-300"
                  title="Zoom In (+)"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => zoomOut({ duration: 250 })}
                  className="p-2 hover:bg-slate-800 hover:text-white rounded-lg transition-colors cursor-pointer text-slate-300"
                  title="Zoom Out (−)"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <div className="w-[1px] h-5 bg-slate-700 mx-0.5" />
                <button
                  type="button"
                  onClick={() => fitView({ padding: 0.18, duration: 400 })}
                  className="px-2 py-1.5 hover:bg-slate-800 hover:text-indigo-300 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
                  title="Fit all visible nodes in viewport"
                >
                  <Compass className="w-4 h-4 text-indigo-400" />
                  <span className="hidden sm:inline">Fit Graph</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetView}
                  className="p-2 hover:bg-slate-800 hover:text-white rounded-lg transition-colors cursor-pointer text-slate-300"
                  title="Reset View"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <div className="w-[1px] h-5 bg-slate-700 mx-0.5" />
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="p-2 hover:bg-slate-800 hover:text-indigo-400 rounded-lg transition-colors cursor-pointer text-slate-300"
                  title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4 text-indigo-400" /> : <Maximize2 className="w-4 h-4" />}
                </button>
              </div>
            </Panel>

            {/* ── COLLAPSIBLE LEGEND (BOTTOM-RIGHT HUD) ── */}
            <Panel position="bottom-right" className="!m-4">
              {legendOpen ? (
                <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-xl p-3 shadow-2xl font-mono text-[11px] space-y-2 max-w-[240px] transition-all">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    <span>Entity Legend</span>
                    <button
                      type="button"
                      onClick={() => setLegendOpen(false)}
                      className="p-0.5 hover:text-slate-100 rounded text-slate-400 cursor-pointer"
                      title="Minimize Legend"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                      <span className="text-slate-300">Tender / Bidder Company</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span>
                      <span className="text-slate-300">Person / Director</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-300"></span>
                      <span className="text-slate-300">GSTIN / PAN / CIN Identifier</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                      <span className="text-slate-300">Registered Address</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                      <span className="text-slate-300">Past Project Experience</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-violet-400"></span>
                      <span className="text-slate-300">OEM Partner Authorization</span>
                    </div>
                    <div className="flex items-center gap-2 pt-1 border-t border-slate-800">
                      <span className="w-4 h-0.5 border-t-2 border-dashed border-rose-500"></span>
                      <span className="text-rose-400 font-bold">Potential Risk / Collusion</span>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setLegendOpen(true)}
                  className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 hover:border-slate-500 text-slate-300 px-3 py-1.5 rounded-xl shadow-xl font-mono text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Layers className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Legend</span>
                  <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                </button>
              )}
            </Panel>
          </ReactFlow>
        )}

        {/* ── 4. RIGHT INSPECTION DETAIL PANEL (DOSSIER DRAWER) ─────────────── */}
        {drawerOpen && (
          <aside className="absolute top-3 bottom-3 right-3 w-96 bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-xl shadow-2xl flex flex-col z-30 transition-all font-mono">
            {/* Header */}
            <div className="p-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between rounded-t-xl">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <h3 className="font-bold text-xs text-slate-100 uppercase tracking-wider">
                  {drawerType === 'edge' ? 'Relationship Dossier' : 'Entity Intelligence'}
                </h3>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                title="Close Dossier"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-4 space-y-4 overflow-y-auto flex-1 text-xs">
              {drawerType === 'edge' && selectedEdge && (
                <>
                  {/* Alert Banner if flagged */}
                  {(selectedEdge.data?.requires_review ||
                    selectedEdge.data?.is_flagged ||
                    selectedEdge.label?.includes('⚠')) && (
                    <div className="p-3 bg-rose-950/40 border border-rose-500/50 rounded-xl text-xs space-y-1 shadow-inner">
                      <div className="flex items-center gap-1.5 text-rose-400 font-bold text-[11px] uppercase">
                        <AlertTriangle className="w-4 h-4" />
                        <span>Requires Officer Review</span>
                      </div>
                      <p className="text-slate-300 text-[11px] leading-relaxed">
                        Potential relationship or cross-document discrepancy detected. Verify traceable evidence before tender award.
                      </p>
                    </div>
                  )}

                  {/* Relationship Overview */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                      Relationship Type
                    </span>
                    <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 font-bold text-indigo-300 flex items-center justify-between">
                      <span>{selectedEdge.data?.relationship_type || selectedEdge.label || 'Connection'}</span>
                      {selectedEdge.data?.requires_review && (
                        <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-400 text-[9px] font-mono font-bold">
                          RISK
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Entities Connected */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                      Connected Entities
                    </span>
                    <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 space-y-1.5 text-[11px]">
                      <div className="text-slate-300">
                        <span className="text-slate-500 uppercase text-[9px] block font-semibold">Entity A:</span>
                        <span className="text-slate-200 font-medium">
                          {selectedEdge.data?.entity_a || selectedEdge.data?.source_entity || selectedEdge.source}
                        </span>
                      </div>
                      <div className="border-t border-slate-800/80 pt-1.5 text-slate-300">
                        <span className="text-slate-500 uppercase text-[9px] block font-semibold">Entity B:</span>
                        <span className="text-slate-200 font-medium">
                          {selectedEdge.data?.entity_b || selectedEdge.data?.target_entity || selectedEdge.target}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Evidence Traceability */}
                  {selectedEdge.data?.evidence && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                        Verifiable Evidence Trace
                      </span>
                      <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800 text-slate-200 text-[11px] leading-relaxed italic">
                        "{selectedEdge.data.evidence}"
                      </div>
                    </div>
                  )}

                  {/* Metadata: Source Document, Page, Confidence */}
                  <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 space-y-1.5 text-[10px] text-slate-400">
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
                      <span className="text-emerald-400 font-bold">{selectedEdge.data?.confidence || 'High'}</span>
                    </div>
                  </div>
                </>
              )}

              {drawerType === 'node' && selectedNode && (
                <>
                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider">
                        {String(selectedNode.data?.entity_type || selectedNode.type || '')}
                      </span>
                      {Boolean(selectedNode.data?.verification_status) && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[9px] font-bold">
                          {String(selectedNode.data.verification_status)}
                        </span>
                      )}
                    </div>
                    <div className="font-bold text-slate-100 text-sm leading-snug">
                      {String(selectedNode.data?.label || '')}
                    </div>
                  </div>

                  {/* Attributes Table */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                      Entity Attributes
                    </span>
                    <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 space-y-1.5 text-[11px]">
                      {Boolean(selectedNode.data?.cin) && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">CIN:</span>
                          <span className="text-slate-200 font-mono">{String(selectedNode.data.cin)}</span>
                        </div>
                      )}
                      {Boolean(selectedNode.data?.gstin) && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">GSTIN:</span>
                          <span className="text-indigo-300 font-mono font-semibold">{String(selectedNode.data.gstin)}</span>
                        </div>
                      )}
                      {Boolean(selectedNode.data?.pan) && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">PAN:</span>
                          <span className="text-indigo-300 font-mono font-semibold">{String(selectedNode.data.pan)}</span>
                        </div>
                      )}
                      {Boolean(selectedNode.data?.din) && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">DIN:</span>
                          <span className="text-sky-300 font-mono font-semibold">{String(selectedNode.data.din)}</span>
                        </div>
                      )}
                      {Boolean(selectedNode.data?.full_address) && (
                        <div className="pt-1.5 border-t border-slate-800">
                          <span className="text-slate-400 block mb-0.5 text-[10px]">Full Registered Address:</span>
                          <span className="text-slate-200 leading-relaxed">{String(selectedNode.data.full_address)}</span>
                        </div>
                      )}
                      {Boolean(selectedNode.data?.project_value) && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Past Project Value:</span>
                          <span className="text-emerald-400 font-bold">{String(selectedNode.data.project_value)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {Boolean(selectedNode.data?.risk_summary) && (
                    <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800 text-[11px] text-slate-300 space-y-1">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">
                        Procurement Evaluation Note:
                      </span>
                      <p className="leading-relaxed">{String(selectedNode.data.risk_summary)}</p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Actions Footer */}
            <div className="p-3 bg-slate-950 border-t border-slate-800 rounded-b-xl">
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-lg shadow-indigo-950/40"
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

export const ProcurementGraph: React.FC<ProcurementGraphProps> = (props) => (
  <ReactFlowProvider>
    <ProcurementGraphInternal {...props} />
  </ReactFlowProvider>
);
