import React, { useEffect, useState, useCallback } from 'react';
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
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Network, Info, ShieldAlert, Sparkles } from 'lucide-react';
import { getGraphData } from '../api/client';

interface ProcurementGraphProps {
  tenderId: string;
}

export const ProcurementGraph: React.FC<ProcurementGraphProps> = ({ tenderId }) => {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [loading, setLoading] = useState(true);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  useEffect(() => {
    if (!tenderId) return;
    setLoading(true);
    getGraphData(tenderId)
      .then((data) => {
        const rawNodes = data.nodes || [];
        const rawEdges = data.edges || [];

        // Format nodes for dark theme
        const formattedNodes: Node[] = rawNodes.map((n: any, idx: number) => {
          const type = (n.type || n.data?.entity_type || '').toLowerCase();
          const isTender = type.includes('tender');
          const isCompany = type.includes('company');
          const isRisk = type.includes('risk') || n.data?.requires_review;

          const defaultPos = n.position || {
            x: 400 + Math.cos((idx / (rawNodes.length || 1)) * 2 * Math.PI) * 240,
            y: 280 + Math.sin((idx / (rawNodes.length || 1)) * 2 * Math.PI) * 240,
          };

          const label = n.data?.label || n.label || n.id;
          const entityType = n.data?.entity_type || n.type || '';

          return {
            id: n.id,
            data: { label: `${label}${entityType && entityType !== label ? ` [${entityType}]` : ''}` },
            position: defaultPos,
            style: {
              background: isTender
                ? '#4f46e5'
                : isCompany
                ? '#0f172a'
                : isRisk
                ? '#881337'
                : '#1e293b',
              color: '#f8fafc',
              border: isTender
                ? '2px solid #818cf8'
                : isCompany
                ? '2px solid #3b82f6'
                : isRisk
                ? '2px solid #f43f5e'
                : '1px solid #475569',
              borderRadius: '12px',
              padding: '10px 14px',
              fontSize: '11px',
              fontWeight: '600',
              fontFamily: 'Inter, sans-serif',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
              minWidth: '130px',
              textAlign: 'center',
            },
          };
        });

        const formattedEdges: Edge[] = rawEdges.map((e: any) => {
          const isFlagged = e.requires_review || e.label?.includes('⚠') || e.label?.includes('SHARED');
          return {
            id: e.id,
            source: e.source,
            target: e.target,
            label: e.label,
            animated: isFlagged || e.animated,
            style: {
              stroke: isFlagged ? '#f43f5e' : '#64748b',
              strokeWidth: isFlagged ? 2.5 : 1.5,
            },
            labelStyle: {
              fill: isFlagged ? '#fda4af' : '#94a3b8',
              fontWeight: 700,
              fontSize: 10,
              fontFamily: 'monospace',
            },
          };
        });

        setNodes(formattedNodes);
        setEdges(formattedEdges);
      })
      .catch((err) => console.error('Failed to load risk graph:', err))
      .finally(() => setLoading(false));
  }, [tenderId]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 font-display flex items-center gap-2.5">
            <Network className="w-6 h-6 text-indigo-400" />
            Entity Relationship Network Graph
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Visualizing multi-entity ties, common directors, shared GSTINs/PANs, and potential bid rigging cartels.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5 text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span> Active Tender
          </span>
          <span className="flex items-center gap-1.5 text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Bidder Company
          </span>
          <span className="flex items-center gap-1.5 text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span> Collusion / Shared Link
          </span>
        </div>
      </div>

      {/* Graph Canvas */}
      <div className="bg-slate-950 rounded-2xl border border-slate-800 shadow-2xl h-[620px] relative overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <span className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-2"></span>
            <p className="text-sm">Mapping entity relationships and risk connections...</p>
          </div>
        ) : nodes.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-500 text-sm">
            No graph nodes generated for this tender. Add bidders and process documents to build network links.
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            fitView
          >
            <Controls className="!bg-slate-900 !border-slate-800 !text-slate-200" />
            <Background gap={20} size={1} color="#1e293b" />
          </ReactFlow>
        )}
      </div>
    </div>
  );
};
