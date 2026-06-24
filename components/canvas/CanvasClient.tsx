"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  MiniMap,
  Controls,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Node,
  type Edge,
  type NodeTypes,
  MarkerType,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { nanoid } from "nanoid";
import {
  Plus,
  Play,
  Map,
  History,
  ArrowLeft,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCanvasStore } from "@/store/canvas";
import { AddNodeModal } from "./AddNodeModal";
import { HistorySidebar } from "./HistorySidebar";
import { RequestInputsNode } from "./nodes/RequestInputsNode";
import { GeminiNode } from "./nodes/GeminiNode";
import { CropImageNode } from "./nodes/CropImageNode";
import { ResponseNode } from "./nodes/ResponseNode";
import { cn } from "@/lib/utils";

const NODE_TYPES: NodeTypes = {
  requestInputs: RequestInputsNode,
  gemini: GeminiNode,
  cropImage: CropImageNode,
  response: ResponseNode,
};

const EDGE_STYLE = {
  stroke: "#f97316",
  strokeWidth: 2,
};

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

function defaultNodeData(type: string) {
  if (type === "requestInputs") return { fields: [] };
  if (type === "gemini") return { label: "LLM Call", model: "gemini-2.0-flash", systemPrompt: "", status: "idle", output: null, durationMs: null };
  if (type === "cropImage") return { label: "Crop Image", x: 0, y: 0, w: 100, h: 100, status: "idle", output: null, durationMs: null };
  if (type === "response") return {};
  return {};
}

function CanvasInner({ workflowId, initialName, initialNodes, initialEdges, initialRuns }: Props) {
  const router = useRouter();
  const { workflowName, setWorkflowName, isHistoryOpen, toggleHistory, isMiniMapVisible, toggleMiniMap } =
    useCanvasStore();

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [modalOpen, setModalOpen] = useState(false);
  const [runs, setRuns] = useState<Run[]>(initialRuns);
  const [isRunning, setIsRunning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync initial name to store
  useEffect(() => {
    setWorkflowName(initialName);
  }, [initialName, setWorkflowName]);

  // Auto-save debounced
  const save = useCallback(
    async (ns: Node[], es: Edge[], name: string) => {
      setIsSaving(true);
      await fetch(`/api/workflows/${workflowId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, nodes: ns, edges: es }),
      });
      setIsSaving(false);
    },
    [workflowId]
  );

  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => save(nodes, edges, workflowName), 1200);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [nodes, edges, workflowName, save]);

  const onConnect = useCallback(
    (connection: Connection) =>
      setEdges((es) =>
        addEdge(
          {
            ...connection,
            type: "smoothstep",
            markerEnd: { type: MarkerType.ArrowClosed, color: "#f97316" },
            style: EDGE_STYLE,
          },
          es
        )
      ),
    [setEdges]
  );

  function addNode(type: string) {
    const id = nanoid(10);
    const newNode: Node = {
      id,
      type,
      position: { x: 200 + Math.random() * 200, y: 150 + Math.random() * 150 },
      data: defaultNodeData(type),
    };
    setNodes((ns) => [...ns, newNode]);
  }

  async function handleRun() {
    setIsRunning(true);
    try {
      const res = await fetch(`/api/workflows/${workflowId}/run`, { method: "POST" });
      if (res.ok) {
        const run: Run = await res.json();
        setRuns((prev) => [run, ...prev]);
        if (!isHistoryOpen) toggleHistory();
        // Poll for updates
        pollRun(run.id);
      }
    } finally {
      setIsRunning(false);
    }
  }

  async function pollRun(runId: string) {
    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const res = await fetch(`/api/runs/${runId}`);
      if (!res.ok) break;
      const run: Run = await res.json();
      setRuns((prev) => prev.map((r) => (r.id === runId ? run : r)));

      // Sync node statuses
      for (const nr of run.nodeRuns) {
        setNodes((ns) =>
          ns.map((n) =>
            n.id === nr.nodeId
              ? { ...n, data: { ...n.data, status: nr.status.toLowerCase(), output: nr.output ?? null, durationMs: nr.durationMs } }
              : n
          )
        );
      }
      if (run.status === "COMPLETED" || run.status === "FAILED") break;
    }
  }

  return (
    <div className="w-full h-screen flex flex-col bg-gray-50 relative overflow-hidden">
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-2.5 bg-white/90 backdrop-blur border-b border-gray-200">
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push("/flow")}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
          <input
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            className="text-sm font-semibold text-gray-800 bg-transparent border-none outline-none w-48 hover:bg-gray-50 focus:bg-gray-50 rounded px-1 py-0.5 transition-colors"
          />
          {isSaving && <Loader2 className="w-3.5 h-3.5 text-gray-400 animate-spin" />}
        </div>

        <div className="flex items-center gap-1.5">
          {/* MiniMap toggle */}
          <button
            onClick={toggleMiniMap}
            className={cn(
              "p-1.5 rounded-lg transition-colors",
              isMiniMapVisible ? "bg-gray-100 text-gray-700" : "text-gray-400 hover:bg-gray-100"
            )}
            title="Toggle MiniMap"
          >
            <Map className="w-4 h-4" />
          </button>

          {/* History toggle */}
          <button
            onClick={toggleHistory}
            className={cn(
              "p-1.5 rounded-lg transition-colors",
              isHistoryOpen ? "bg-gray-100 text-gray-700" : "text-gray-400 hover:bg-gray-100"
            )}
            title="Run History"
          >
            <History className="w-4 h-4" />
          </button>

          {/* Run */}
          <button
            onClick={handleRun}
            disabled={isRunning}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-60"
          >
            {isRunning ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
            {isRunning ? "Running..." : "Run"}
          </button>
        </div>
      </div>

      {/* React Flow canvas */}
      <div className="flex-1 pt-[53px]">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={NODE_TYPES}
          defaultEdgeOptions={{
            type: "smoothstep",
            style: EDGE_STYLE,
            markerEnd: { type: MarkerType.ArrowClosed, color: "#f97316" },
          }}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.2}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#d1d5db" />
          {isMiniMapVisible && (
            <MiniMap
              nodeStrokeWidth={3}
              maskColor="rgb(0,0,0,0.05)"
              className="!bottom-16 !right-4"
            />
          )}
          <Controls className="!bottom-4 !left-4" showInteractive={false} />
        </ReactFlow>
      </div>

      {/* Bottom toolbar */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30">
        <div className="flex items-center gap-2 bg-white rounded-2xl shadow-lg border border-gray-200 px-3 py-2">
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Node
          </button>
        </div>
      </div>

      {/* Add node modal */}
      <AddNodeModal open={modalOpen} onClose={() => setModalOpen(false)} onAdd={addNode} />

      {/* History sidebar */}
      {isHistoryOpen && <HistorySidebar runs={runs} onClose={toggleHistory} />}
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
