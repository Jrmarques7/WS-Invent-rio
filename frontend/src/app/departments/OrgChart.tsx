'use client';

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react';
import {
  ReactFlow, Background, Controls, Panel,
  useNodesState, useEdgesState,
  Handle, Position, MarkerType,
  type Connection, type Edge, type Node, type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Department, buildFlatTree, deptTypeBadgeColor } from '@/types/departments';
import { departmentsApi } from '@/lib/api/services/departments';
import toast from 'react-hot-toast';

// ─── auto-layout (Reingold-Tilford style) ───────────────────────────────────

const NW = 200;
const NH = 72;
const HGAP = 60;
const VGAP = 90;

type FlatNode = ReturnType<typeof buildFlatTree>[0];

function subtreeWidth(n: FlatNode): number {
  if (n.children.length === 0) return NW;
  const cw = n.children.reduce((s, c) => s + subtreeWidth(c) + HGAP, -HGAP);
  return Math.max(NW, cw);
}

function assignPos(n: FlatNode, cx: number, y: number, out: Record<string, { x: number; y: number }>) {
  out[n.id] = { x: cx - NW / 2, y };
  if (!n.children.length) return;
  const total = n.children.reduce((s, c) => s + subtreeWidth(c) + HGAP, -HGAP);
  let x = cx - total / 2;
  for (const c of n.children) {
    const sw = subtreeWidth(c);
    assignPos(c, x + sw / 2, y + NH + VGAP, out);
    x += sw + HGAP;
  }
}

function autoLayout(departments: Department[]): Record<string, { x: number; y: number }> {
  const roots = buildFlatTree(departments).filter(n => n.depth === 0);
  const out: Record<string, { x: number; y: number }> = {};
  let x = 0;
  for (const root of roots) {
    const sw = subtreeWidth(root);
    assignPos(root, x + sw / 2, 0, out);
    x += sw + HGAP * 2;
  }
  return out;
}

// ─── context (avoids stale callback closures in custom nodes) ────────────────

type OrgCtx = {
  canWrite: boolean;
  canDelete: boolean;
  onEdit: (id: string) => void;
  onAddChild: (id: string) => void;
  onDelete: (id: string) => void;
};

const Ctx = createContext<OrgCtx | null>(null);

// ─── custom node ─────────────────────────────────────────────────────────────

function DeptNode({ id, data }: NodeProps) {
  const ctx = useContext(Ctx)!;
  const [hov, setHov] = useState(false);
  const label = data.label as string;
  const type = data.type as string;

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ width: NW }}
      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm cursor-grab active:cursor-grabbing"
    >
      <Handle type="target" position={Position.Top} className="!w-2.5 !h-2.5 !bg-indigo-400 !border-white" />
      <div className="p-3">
        <p className="font-semibold text-sm text-gray-900 dark:text-white truncate leading-tight">{label}</p>
        {type && (
          <span className={`mt-1.5 inline-block px-2 py-0.5 rounded text-xs font-medium ${deptTypeBadgeColor(type)}`}>
            {type}
          </span>
        )}
        <div className={`mt-2 flex gap-2 transition-opacity duration-150 ${hov ? 'opacity-100' : 'opacity-0'}`}>
          {ctx.canWrite && (
            <>
              <button
                onPointerDown={e => e.stopPropagation()}
                onClick={() => ctx.onAddChild(id)}
                className="text-xs text-green-600 dark:text-green-400 hover:underline font-medium"
              >+ Sub</button>
              <button
                onPointerDown={e => e.stopPropagation()}
                onClick={() => ctx.onEdit(id)}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >Editar</button>
            </>
          )}
          {ctx.canDelete && (
            <button
              onPointerDown={e => e.stopPropagation()}
              onClick={() => ctx.onDelete(id)}
              className="text-xs text-red-600 dark:text-red-400 hover:underline font-medium"
            >Excluir</button>
          )}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!w-2.5 !h-2.5 !bg-indigo-400 !border-white" />
    </div>
  );
}

const nodeTypes = { dept: DeptNode };

const LS_KEY = 'dept-org-positions';

// ─── component ───────────────────────────────────────────────────────────────

type Props = {
  departments: Department[];
  canWrite: boolean;
  canDelete: boolean;
  onEdit: (dept: Department) => void;
  onAddChild: (parentId: string) => void;
  onDelete: (dept: Department) => void;
  onReload: () => void;
};

export function OrgChart({ departments, canWrite, canDelete, onEdit, onAddChild, onDelete, onReload }: Props) {
  const depsRef = useRef(departments);
  depsRef.current = departments;
  const onReloadRef = useRef(onReload);
  onReloadRef.current = onReload;

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Build nodes/edges whenever departments list changes
  useEffect(() => {
    const saved: Record<string, { x: number; y: number }> = JSON.parse(
      localStorage.getItem(LS_KEY) || '{}'
    );
    // Auto-layout for any department that has no saved position
    const missing = departments.filter(d => !saved[d.id]);
    if (missing.length > 0) {
      const auto = autoLayout(departments);
      missing.forEach(d => { saved[d.id] = auto[d.id] ?? { x: 0, y: 0 }; });
    }

    setNodes(departments.map(d => ({
      id: d.id,
      type: 'dept',
      position: saved[d.id],
      data: { label: d.name, type: d.type },
    })));

    setEdges(departments
      .filter(d => d.parent_id && departments.some(p => p.id === d.parent_id))
      .map(d => ({
        id: `e-${d.parent_id}-${d.id}`,
        source: d.parent_id!,
        target: d.id,
        type: 'smoothstep',
        animated: false,
        markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' },
        style: { stroke: '#6366f1', strokeWidth: 1.5 },
      }))
    );
  }, [departments, setNodes, setEdges]);

  // Save position on drag
  const onNodeDragStop = useCallback((_: React.MouseEvent, node: Node) => {
    const saved: Record<string, { x: number; y: number }> = JSON.parse(
      localStorage.getItem(LS_KEY) || '{}'
    );
    saved[node.id] = node.position;
    localStorage.setItem(LS_KEY, JSON.stringify(saved));
  }, []);

  // Draw edge = set parent
  const onConnect = useCallback(async (conn: Connection) => {
    if (!conn.source || !conn.target || conn.source === conn.target) return;
    const child = depsRef.current.find(d => d.id === conn.target);
    if (!child) return;
    try {
      await departmentsApi.update(child.id, {
        name: child.name, type: child.type,
        parent_id: conn.source, description: child.description,
      });
      onReloadRef.current();
    } catch {
      toast.error('Erro ao vincular unidade');
    }
  }, []);

  // Delete edge = unset parent
  const onEdgesDelete = useCallback(async (deleted: Edge[]) => {
    for (const edge of deleted) {
      const child = depsRef.current.find(d => d.id === edge.target);
      if (!child) continue;
      try {
        await departmentsApi.update(child.id, {
          name: child.name, type: child.type,
          parent_id: null, description: child.description,
        });
      } catch {
        toast.error('Erro ao desvincular unidade');
      }
    }
    onReloadRef.current();
  }, []);

  // Re-layout: clear localStorage positions and recompute
  const relayout = useCallback(() => {
    const auto = autoLayout(depsRef.current);
    localStorage.setItem(LS_KEY, JSON.stringify(auto));
    setNodes(prev => prev.map(n => ({ ...n, position: auto[n.id] ?? n.position })));
  }, [setNodes]);

  const ctxValue = useMemo<OrgCtx>(() => ({
    canWrite, canDelete,
    onEdit: (id) => { const d = depsRef.current.find(x => x.id === id); if (d) onEdit(d); },
    onAddChild: (id) => onAddChild(id),
    onDelete: (id) => { const d = depsRef.current.find(x => x.id === id); if (d) onDelete(d); },
  }), [canWrite, canDelete, onEdit, onAddChild, onDelete]);

  return (
    <Ctx.Provider value={ctxValue}>
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-gray-50 dark:bg-gray-900" style={{ height: '72vh' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onEdgesDelete={onEdgesDelete}
          onNodeDragStop={onNodeDragStop}
          nodeTypes={nodeTypes}
          deleteKeyCode="Delete"
          fitView
          fitViewOptions={{ padding: 0.2 }}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#cbd5e1" gap={24} />
          <Controls />
          <Panel position="top-right">
            <button
              onClick={relayout}
              className="px-3 py-1.5 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Reorganizar
            </button>
          </Panel>
        </ReactFlow>
      </div>
      <p className="text-xs text-gray-400 mt-2 text-center">
        Arraste os nós para reposicionar · Conecte dois nós para definir hierarquia · Selecione uma ligação e pressione <kbd className="px-1 py-0.5 rounded border border-gray-300 text-gray-500">Delete</kbd> para remover
      </p>
    </Ctx.Provider>
  );
}
