"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  Panel,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Connection,
  type Node,
  type Edge,
  type NodeTypes,
  type IsValidConnection,
  MarkerType,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { nanoid } from "nanoid";
import {
  Plus, Play, ArrowLeft, Loader2, Receipt, CreditCard,
  History, StickyNote, Download,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCanvasStore } from "@/store/canvas";
import { AddNodeModal } from "./AddNodeModal";
import { HistorySidebar } from "./HistorySidebar";
import { RequestInputsNode } from "./nodes/RequestInputsNode";
import { GeminiNode } from "./nodes/GeminiNode";
import { CropImageNode } from "./nodes/CropImageNode";
import { ResponseNode } from "./nodes/ResponseNode";
import { StickyNoteNode } from "./nodes/StickyNoteNode";
import { ImageGenNode } from "./nodes/ImageGenNode";
import { cn } from "@/lib/utils";

const NODE_TYPES: NodeTypes = {
  requestInputs: RequestInputsNode,
  gemini: GeminiNode,
  cropImage: CropImageNode,
  response: ResponseNode,
  stickyNote: StickyNoteNode,
  imageGen: ImageGenNode,
};

const EDGE_DEFAULTS = {
  type: "default",
  animated: false,
};

function getEdgeColor(srcNode: Node | undefined, sourceHandle: string | null | undefined): string {
  if (!srcNode) return "#f59e0b";
  if (srcNode.type === "cropImage" || srcNode.type === "imageGen") return "#3b82f6";
  if (srcNode.type === "requestInputs" && sourceHandle?.startsWith("field-")) {
    const fieldId = sourceHandle.replace("field-", "");
    const field = (srcNode.data.fields as { id: string; type: string }[] ?? []).find(f => f.id === fieldId);
    if (field?.type === "image") return "#3b82f6";
  }
  return "#f59e0b";
}

function makeEdgeStyle(color: string) {
  return {
    ...EDGE_DEFAULTS,
    style: { stroke: color, strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color },
  };
}

const PROTECTED = new Set(["response"]);
const FIT_VIEW_OPTIONS = { padding: 0.2 };
const PRO_OPTIONS = { hideAttribution: true };

function hasCycle(source: string, target: string, edges: Edge[]): boolean {
  const visited = new Set<string>();
  const stack = [target];
  while (stack.length) {
    const curr = stack.pop()!;
    if (curr === source) return true;
    if (visited.has(curr)) continue;
    visited.add(curr);
    for (const e of edges) if (e.source === curr) stack.push(e.target);
  }
  return false;
}

interface Run {
  id: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  nodeRuns: {
    id: string;
    nodeId: string;
    nodeLabel: string;
    nodeType: string;
    status: string;
    durationMs: number | null;
    output?: unknown;
    startedAt: string;
  }[];
}

interface Props {
  workflowId: string;
  initialName: string;
  initialNodes: Node[];
  initialEdges: Edge[];
  initialRuns: Run[];
}

function defaultNodeData(type: string, extra?: Record<string, unknown>) {
  if (type === "requestInputs") return { fields: [] };
  if (type === "gemini") return {
    label: "LLM Call", model: "gemini-2.5-flash", systemPrompt: "", status: "idle", output: null, durationMs: null,
    temperature: 0.7, maxTokens: 1024, reasoning: false, topP: 1, topK: 0,
    frequencyPenalty: 0, presencePenalty: 0, repetitionPenalty: 1, minP: 0, topA: 0,
    seed: 0, stopSequences: "", jsonMode: false,
    ...extra,
  };
  if (type === "cropImage") return { label: "Crop Image", x: 0, y: 0, w: 100, h: 100, status: "idle", output: null, durationMs: null };
  if (type === "response") return {};
  if (type === "stickyNote") return { text: "" };
  if (type === "imageGen") return { label: "Generate Image", model: "gemini-2.0-flash-preview-image-generation", status: "idle", output: null, durationMs: null };
  return {};
}

interface ContextMenu { x: number; y: number; nodeId: string }

function CanvasInner({ workflowId, initialName, initialNodes, initialEdges, initialRuns }: Props) {
  const router = useRouter();
  const { workflowName, setWorkflowName, isHistoryOpen, toggleHistory, setRunNodeCallback, setDeleteNodeCallback, setDuplicateNodeCallback, setDuplicateWithEdgesCallback, setLockNodeCallback } = useCanvasStore();
  const { fitView } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    initialEdges.map(e => {
      const srcNode = initialNodes.find(n => n.id === e.source);
      const color = getEdgeColor(srcNode, e.sourceHandle);
      return { ...e, ...makeEdgeStyle(color) };
    })
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [runs, setRuns] = useState<Run[]>(initialRuns);
  const [isRunning, setIsRunning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stable refs so callbacks don't depend on nodes/edges directly
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;
  const edgesRef = useRef(edges);
  edgesRef.current = edges;

  // ── Undo / Redo ───────────────────────────────────────────────────────────
  const past = useRef<{ nodes: Node[]; edges: Edge[] }[]>([]);
  const future = useRef<{ nodes: Node[]; edges: Edge[] }[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const snapshot = useCallback(() => {
    past.current = [...past.current, { nodes: [...nodesRef.current], edges: [...edgesRef.current] }].slice(-50);
    future.current = [];
    setCanUndo(true);
    setCanRedo(false);
  }, []);

  const undo = useCallback(() => {
    if (!past.current.length) return;
    const prev = past.current.pop()!;
    future.current.push({ nodes: [...nodesRef.current], edges: [...edgesRef.current] });
    setNodes(prev.nodes);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setEdges(prev.edges as any);
    setCanUndo(past.current.length > 0);
    setCanRedo(true);
  }, [setNodes, setEdges]);

  const redo = useCallback(() => {
    if (!future.current.length) return;
    const next = future.current.pop()!;
    past.current.push({ nodes: [...nodesRef.current], edges: [...edgesRef.current] });
    setNodes(next.nodes);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setEdges(next.edges as any);
    setCanRedo(future.current.length > 0);
    setCanUndo(true);
  }, [setNodes, setEdges]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      if (ctrl && (e.key === "y" || (e.key === "z" && e.shiftKey))) { e.preventDefault(); redo(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => { setWorkflowName(initialName); }, [initialName, setWorkflowName]);

  // ── Auto-save ─────────────────────────────────────────────────────────────
  const save = useCallback(async (ns: Node[], es: Edge[], name: string) => {
    setIsSaving(true);
    // Strip runtime-only fields before persisting (status/output change each run)
    const cleanNodes = ns.map(n => {
      if (n.type === "gemini" || n.type === "cropImage" || n.type === "imageGen") {
        const { status: _s, output: _o, durationMs: _d, ...rest } = n.data as Record<string, unknown>;
        return { ...n, data: rest };
      }
      if (n.type === "response") {
        const { results: _r, output: _o, status: _s, ...rest } = n.data as Record<string, unknown>;
        return { ...n, data: rest };
      }
      return n;
    });
    await fetch(`/api/workflows/${workflowId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, nodes: cleanNodes, edges: es }),
    });
    setIsSaving(false);
  }, [workflowId]);

  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { save(nodes, edges, workflowName).catch(() => {}); }, 1200);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [nodes, edges, workflowName, save]);

  // ── Connection validation (DAG + type-safe) ───────────────────────────────
  const isValidConnection: IsValidConnection = useCallback((connection: Connection | Edge) => {
    const curNodes = nodesRef.current;
    const curEdges = edgesRef.current;
    const src = connection.source!;
    const tgt = connection.target!;
    if (src === tgt) return false;
    if (hasCycle(src, tgt, curEdges)) return false;

    const srcNode = curNodes.find(n => n.id === src);
    let outType: "text" | "image" | "any" = "any";
    if (srcNode?.type === "gemini") outType = "text";
    else if (srcNode?.type === "cropImage" || srcNode?.type === "imageGen") outType = "image";
    else if (srcNode?.type === "requestInputs" && connection.sourceHandle?.startsWith("field-")) {
      const fieldId = connection.sourceHandle.replace("field-", "");
      const field = (srcNode.data.fields as { id: string; type: string }[] ?? []).find(f => f.id === fieldId);
      outType = field?.type === "image" ? "image" : "text";
    }

    const th = connection.targetHandle;
    if (th === "image-vision" && outType !== "image" && outType !== "any") return false;
    if (th === "prompt" && outType === "image") return false;

    return true;
  }, []);

  const onConnect = useCallback((connection: Connection) => {
    snapshot();
    const srcNode = nodesRef.current.find(n => n.id === connection.source);
    const color = getEdgeColor(srcNode, connection.sourceHandle);
    setEdges(es => addEdge({ ...connection, ...makeEdgeStyle(color) }, es));
  }, [snapshot, setEdges]);

  // ── Node changes — protect requestInputs + response ───────────────────────
  const handleNodesChange = useCallback(
    (changes: Parameters<typeof onNodesChange>[0]) => {
      const filtered = changes.filter(c => {
        if (c.type === "remove") {
          const n = nodesRef.current.find(n => n.id === c.id);
          return !PROTECTED.has(n?.type ?? "");
        }
        return true;
      });
      if (filtered.some(c => c.type === "remove")) snapshot();
      onNodesChange(filtered);
    },
    [onNodesChange, snapshot]
  );

  const onSelectionChange = useCallback(({ nodes: sel }: { nodes: Node[] }) => {
    setSelectedNodeIds(sel.map(n => n.id));
  }, []);

  const onNodeContextMenu = useCallback((e: React.MouseEvent, node: Node) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, nodeId: node.id });
  }, []);

  function addNode(type: string, extraData?: Record<string, unknown>) {
    snapshot();
    const id = nanoid(10);
    const isStickyNote = type === "stickyNote";
    setNodes(ns => [...ns, {
      id, type,
      position: { x: 100 + Math.random() * 300, y: 100 + Math.random() * 200 },
      data: defaultNodeData(type, extraData),
      ...(isStickyNote ? { style: { width: 200, height: 150 } } : {}),
    }]);
    setTimeout(() => { fitView({ duration: 400, padding: 0.15 }).catch(() => {}); }, 60);
  }

  // ── Export JSON ───────────────────────────────────────────────────────────
  function exportWorkflow() {
    const blob = new Blob([JSON.stringify({ name: workflowName, nodes, edges }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${workflowName.replace(/\s+/g, "-")}.json`;
    a.click();
  }

  // ── Run (full / single / multi-select) ───────────────────────────────────
  // Wire handleRun into store so individual nodes can trigger it
  useEffect(() => {
    setRunNodeCallback((ids: string[]) => handleRun(ids));
    setDeleteNodeCallback((nodeId: string) => {
      const node = nodesRef.current.find(n => n.id === nodeId);
      if (!node || PROTECTED.has(node.type ?? "")) return;
      snapshot();
      setNodes(ns => ns.filter(n => n.id !== nodeId));
      setEdges(es => es.filter(e => e.source !== nodeId && e.target !== nodeId));
    });
    setDuplicateNodeCallback((nodeId: string) => {
      const node = nodesRef.current.find(n => n.id === nodeId);
      if (!node) return;
      snapshot();
      const newId = nanoid(10);
      setNodes(ns => [...ns, {
        ...node,
        id: newId,
        position: { x: node.position.x + 40, y: node.position.y + 40 },
        selected: false,
      }]);
    });
    setDuplicateWithEdgesCallback((nodeId: string) => {
      const node = nodesRef.current.find(n => n.id === nodeId);
      if (!node) return;
      snapshot();
      const newId = nanoid(10);
      const connectedEdges = edgesRef.current.filter(e => e.source === nodeId || e.target === nodeId);
      const newEdges = connectedEdges.map(e => ({
        ...e,
        ...makeEdgeStyle(((e.style as { stroke?: string } | undefined)?.stroke) ?? "#f59e0b"),
        id: `e-${nanoid(8)}`,
        source: e.source === nodeId ? newId : e.source,
        target: e.target === nodeId ? newId : e.target,
      }));
      setNodes(ns => [...ns, {
        ...node,
        id: newId,
        position: { x: node.position.x + 40, y: node.position.y + 40 },
        selected: false,
      }]);
      setEdges(es => [...es, ...newEdges]);
    });
    setLockNodeCallback((nodeId: string) => {
      setNodes(ns => ns.map(n =>
        n.id === nodeId ? { ...n, draggable: n.draggable === false ? undefined : false } : n
      ));
    });
    return () => { setRunNodeCallback(null); setDeleteNodeCallback(null); setDuplicateNodeCallback(null); setDuplicateWithEdgesCallback(null); setLockNodeCallback(null); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleRun(targetNodeIds?: string[]) {
    setIsRunning(true);
    // Reset runnable nodes immediately: clear stale output/status before new run
    setNodes(ns => ns.map(n => {
      if (n.type === "requestInputs" || n.type === "stickyNote") return n;
      if (n.type === "response") return { ...n, data: { ...n.data, results: undefined, output: null, status: "idle" } };
      if (targetNodeIds && !targetNodeIds.includes(n.id)) return n;
      return { ...n, data: { ...n.data, status: "running", output: null } };
    }));
    try {
      const res = await fetch(`/api/workflows/${workflowId}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedNodeIds: targetNodeIds ?? null }),
      });
      if (res.ok) {
        const run: Run = await res.json();
        setRuns(prev => [run, ...prev]);
        if (!isHistoryOpen) toggleHistory();
        pollRun(run.id);
      }
    } finally {
      setIsRunning(false);
    }
  }

  async function pollRun(runId: string) {
    for (let i = 0; i < 60; i++) {
      // Wake immediately on tab focus to avoid background-tab timer throttling
      await new Promise<void>(resolve => {
        const timer = setTimeout(resolve, 2000);
        const onVisible = () => { if (document.visibilityState === "visible") { clearTimeout(timer); resolve(); } };
        document.addEventListener("visibilitychange", onVisible, { once: true });
      });
      const res = await fetch(`/api/runs/${runId}`);
      if (!res.ok) break;
      const run: Run = await res.json();
      setRuns(prev => prev.map(r => r.id === runId ? run : r));

      const updates = new Map<string, { status: string; output: unknown; results?: unknown; durationMs: number | null }>();
      for (const nr of run.nodeRuns) {
        const out = nr.output as Record<string, unknown> | null;
        updates.set(nr.nodeId, {
          status: nr.status.toLowerCase(),
          output: (out && "text" in out ? out.text : out && "url" in out ? out.url : out) ?? null,
          results: (out && "results" in out ? out.results : undefined),
          durationMs: nr.durationMs,
        });
      }

      setNodes(ns => {
        const curEdges = edgesRef.current;
        const updated = ns.map(n => {
          const upd = updates.get(n.id);
          if (!upd) return n;
          return { ...n, data: { ...n.data, ...upd } };
        });

        if (run.status !== "COMPLETED") return updated;

        // Derive response node output from upstream nodes (no nodeRun needed for response)
        const outputMap: Record<string, string> = {};
        for (const n of updated) {
          if (typeof n.data.output === "string" && n.data.output) outputMap[n.id] = n.data.output;
        }
        return updated.map(n => {
          if (n.type !== "response") return n;
          if (n.data.results || n.data.output) return n;
          const parts = curEdges
            .filter(e => e.target === n.id && outputMap[e.source])
            .map(e => {
              const src = updated.find(nd => nd.id === e.source);
              return { label: (src?.data?.label as string) || src?.type || e.source, text: outputMap[e.source] };
            });
          if (!parts.length) return n;
          return { ...n, data: { ...n.data, results: parts, output: parts.map(p => p.text).join("\n\n"), status: "completed" } };
        });
      });

      if (run.status === "COMPLETED" || run.status === "FAILED") break;
    }
  }

  return (
    <div
      className="w-full h-full bg-[#f4f4f4] relative overflow-hidden"
      onClick={() => setContextMenu(null)}
    >
      {/* Floating workflow name pill — top left, matches reference */}
      <div className="absolute top-4 left-4 z-30 inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white/85 px-2 py-1.5 shadow-md backdrop-blur-sm">
        <button
          onClick={() => router.push("/flow")}
          title="Back to workflows"
          className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-800 hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <input
          value={workflowName}
          onChange={e => setWorkflowName(e.target.value)}
          placeholder="Untitled"
          className="h-8 w-[140px] bg-transparent text-[14px] font-normal text-gray-900 outline-none placeholder-gray-400"
        />
        {isSaving && <Loader2 className="w-3 h-3 text-gray-400 animate-spin shrink-0" />}
      </div>

      {/* Canvas — full height */}
      <div className="w-full h-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          isValidConnection={isValidConnection}
          nodeTypes={NODE_TYPES}
          defaultEdgeOptions={makeEdgeStyle("#f59e0b")}
          onSelectionChange={onSelectionChange}
          onNodeContextMenu={onNodeContextMenu}
          deleteKeyCode={["Delete", "Backspace"]}
          fitView
          fitViewOptions={FIT_VIEW_OPTIONS}
          minZoom={0.2}
          maxZoom={2}
          proOptions={PRO_OPTIONS}
        >
          <Panel position="top-right">
            <div className="flex items-center gap-2 mt-2 mr-2 sm:mr-4">
              {selectedNodeIds.length > 0 && (
                <button
                  onClick={() => handleRun(selectedNodeIds)}
                  disabled={isRunning}
                  className="flex h-8 items-center gap-1.5 px-2.5 rounded-lg border border-blue-400 bg-blue-500 text-white text-[11px] font-medium hover:bg-blue-600 disabled:opacity-50 transition-colors"
                >
                  <Play className="w-3 h-3 fill-current" />
                  Run {selectedNodeIds.length}
                </button>
              )}
              <span className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-gray-200 bg-white/90 px-2.5 text-[11px] font-medium text-gray-700 shadow-sm backdrop-blur">
                <Receipt className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-gray-500">Est</span>
                <span className="tabular-nums">0.00</span>
                <span className="text-gray-500">M</span>
              </span>
              <span className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-gray-200 bg-white/90 px-2.5 text-[11px] font-medium text-gray-700 shadow-sm backdrop-blur">
                <CreditCard className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-gray-500">Bal</span>
                <span className="tabular-nums">0.00</span>
                <span className="text-gray-500">M</span>
              </span>
              <button
                onClick={() => handleRun()}
                disabled={isRunning}
                className="flex h-8 w-9 items-center justify-center rounded-lg border border-indigo-400 bg-indigo-500 text-white shadow-sm hover:bg-indigo-600 disabled:opacity-50 transition-all"
              >
                {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              </button>
              <button
                onClick={exportWorkflow}
                title="Export workflow as JSON"
                aria-label="Export workflow as JSON"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white/90 shadow-sm backdrop-blur text-gray-500 hover:bg-gray-50 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={toggleHistory}
                title="History"
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg border bg-white/90 shadow-sm backdrop-blur transition-colors",
                  isHistoryOpen ? "border-indigo-400 text-indigo-500" : "border-gray-200 text-gray-500 hover:bg-gray-50"
                )}
              >
                <History className="w-3.5 h-3.5" />
              </button>
            </div>
          </Panel>
          <Background variant={BackgroundVariant.Dots} gap={24} size={1.5} color="#cacaca" />
          <Controls className="!bottom-16 !left-4" />
        </ReactFlow>
      </div>

      {/* Node popover — outside toolbar stacking context so z-50 can beat z-40 overlay */}
      {modalOpen && <div className="fixed inset-0 z-40" onClick={() => setModalOpen(false)} />}
      <div className="absolute bottom-4 left-0 right-0 z-50 flex items-center justify-center px-4 pointer-events-none">
        <div className="pointer-events-auto">
          <AddNodeModal open={modalOpen} onClose={() => setModalOpen(false)} onAdd={addNode} />
        </div>
      </div>

      {/* Bottom toolbar */}
      <div className="absolute bottom-4 left-0 right-0 z-30 flex items-center justify-center px-4">
        <div className="relative flex items-center gap-0.5 bg-white/95 border border-gray-200 rounded-xl shadow-sm backdrop-blur-sm px-1 py-1">
          <button
            onClick={() => addNode("stickyNote")}
            className="rounded-lg p-2 text-gray-700 transition-colors hover:bg-gray-100"
            title="Add sticky note"
          >
            <StickyNote className="w-4 h-4" />
          </button>
          <button
            onClick={() => setModalOpen(!modalOpen)}
            className="relative z-50 rounded p-2 transition-colors text-gray-500 hover:bg-gray-100 hover:text-gray-900"
            title="Add node"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Right-click context menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-xl py-1 min-w-[160px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={() => { handleRun([contextMenu.nodeId]); setContextMenu(null); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Play className="w-3.5 h-3.5 text-emerald-500" />
            Run this node
          </button>
          <div className="border-t border-gray-100 my-0.5" />
          <button
            onClick={() => {
              const node = nodes.find(n => n.id === contextMenu.nodeId);
              if (node && !PROTECTED.has(node.type ?? "")) {
                snapshot();
                setNodes(ns => ns.filter(n => n.id !== contextMenu.nodeId));
                setEdges(es => es.filter(e => e.source !== contextMenu.nodeId && e.target !== contextMenu.nodeId));
              }
              setContextMenu(null);
            }}
            disabled={PROTECTED.has(nodes.find(n => n.id === contextMenu.nodeId)?.type ?? "")}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Delete node
          </button>
        </div>
      )}

      <HistorySidebar runs={runs} onClose={toggleHistory} isOpen={isHistoryOpen} />
    </div>
  );
}

export function CanvasClient(props: Props) {
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  );
}
