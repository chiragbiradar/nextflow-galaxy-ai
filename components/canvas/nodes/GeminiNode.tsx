"use client";

import { Handle, Position, useReactFlow, type NodeProps, type Node } from "@xyflow/react";
import { Loader2, CheckCircle2, XCircle, Info, MoreHorizontal, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GeminiNodeData, NodeStatus } from "@/types/canvas";

type Props = NodeProps<Node<GeminiNodeData>>;

const MODELS = [
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-1.5-pro",
  "gemini-1.5-flash",
];

function StatusIcon({ status }: { status: NodeStatus }) {
  if (status === "running") return <Loader2 className="w-3 h-3 animate-spin text-blue-500" />;
  if (status === "completed") return <CheckCircle2 className="w-3 h-3 text-green-500" />;
  if (status === "failed") return <XCircle className="w-3 h-3 text-red-500" />;
  return null;
}

export function GeminiNode({ id, data }: Props) {
  const { updateNodeData } = useReactFlow();
  const status = data.status ?? "idle";

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm w-80 text-xs">
      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: "#3b82f6", width: 10, height: 10, border: "2px solid white" }}
      />

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded-sm bg-blue-600 flex items-center justify-center">
            <span className="text-white text-[8px] font-bold">G</span>
          </div>
          <input
            value={data.label ?? "LLM Call"}
            onChange={(e) => updateNodeData(id, { label: e.target.value })}
            className="font-semibold text-gray-800 text-[13px] bg-transparent border-none outline-none w-28"
          />
          <StatusIcon status={status} />
          <Info className="w-3 h-3 text-gray-400" />
        </div>
        <button className="p-1 rounded hover:bg-gray-100 text-gray-500">
          <MoreHorizontal className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="px-3 py-2.5 space-y-2.5">
        {/* Model selector */}
        <div>
          <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1 block">Model</label>
          <div className="relative">
            <select
              value={data.model ?? "gemini-2.0-flash"}
              onChange={(e) => updateNodeData(id, { model: e.target.value })}
              className="w-full text-[11px] text-gray-700 border border-gray-200 rounded-lg px-2 py-1.5 pr-6 appearance-none bg-white focus:outline-none focus:ring-1 focus:ring-gray-300"
            >
              {MODELS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* System Prompt */}
        <div>
          <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1 block">System Prompt</label>
          <textarea
            value={data.systemPrompt ?? ""}
            onChange={(e) => updateNodeData(id, { systemPrompt: e.target.value })}
            placeholder="You are a helpful assistant..."
            rows={3}
            className="w-full text-[11px] text-gray-700 border border-gray-200 rounded-lg px-2 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-gray-300"
          />
        </div>

        {/* Output */}
        {(status === "completed" || status === "failed") && (
          <div>
            <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1 block flex items-center gap-1">
              Output
              {data.durationMs != null && (
                <span className="text-gray-400 normal-case">({data.durationMs}ms)</span>
              )}
            </label>
            <div
              className={cn(
                "text-[11px] border rounded-lg px-2 py-1.5 max-h-24 overflow-y-auto whitespace-pre-wrap",
                status === "failed"
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-gray-200 bg-gray-50 text-gray-700"
              )}
            >
              {data.output ?? "No output"}
            </div>
          </div>
        )}
      </div>

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: "#f97316", width: 10, height: 10, border: "2px solid white" }}
      />
    </div>
  );
}
