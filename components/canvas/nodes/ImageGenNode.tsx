"use client";

import { Handle, Position, useReactFlow, useEdges, useNodes, type NodeProps, type Node } from "@xyflow/react";
import { Loader2, XCircle, Play, MoreHorizontal, ChevronDown, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useCanvasStore } from "@/store/canvas";
import { NodeMenuDropdown } from "../NodeMenuDropdown";
import type { RequestInputsNodeData } from "@/types/canvas";

type ImageGenData = {
  label?: string;
  model?: string;
  prompt?: string;
  aspectRatio?: string;
  status?: string;
  output?: string | null;
  durationMs?: number | null;
} & Record<string, unknown>;

type Props = NodeProps<Node<ImageGenData>>;

const MODELS = ["gemini-2.0-flash-preview-image-generation"];
const ASPECT_RATIOS = ["1:1", "16:9", "9:16", "4:3", "3:4"];

const PROMPT_HANDLE = {
  width: 14, height: 14,
  background: "#f59e0b",
  border: "2px solid #f59e0b80",
  boxShadow: "0 0 8px #f59e0b50",
};

const IMAGE_HANDLE = {
  width: 14, height: 14,
  background: "#3b82f6",
  border: "2px solid #3b82f680",
  boxShadow: "0 0 8px #3b82f650",
};

export function ImageGenNode({ id, data }: Props) {
  const { updateNodeData } = useReactFlow();
  const edges = useEdges();
  const allNodes = useNodes();
  const status = (data.status ?? "idle") as string;
  const [menuOpen, setMenuOpen] = useState(false);
  const runNodeCallback = useCanvasStore(s => s.runNodeCallback);

  const promptEdge = edges.find(e => e.target === id && e.targetHandle === "prompt");
  const isPromptConnected = !!promptEdge;

  let connectedPromptValue = "";
  if (isPromptConnected && promptEdge) {
    const srcNode = allNodes.find(n => n.id === promptEdge.source);
    if (srcNode?.type === "requestInputs") {
      const fieldId = promptEdge.sourceHandle?.replace("field-", "");
      const field = ((srcNode.data as RequestInputsNodeData).fields ?? []).find(f => f.id === fieldId);
      connectedPromptValue = field?.value ?? "";
    } else if (typeof srcNode?.data?.output === "string") {
      connectedPromptValue = srcNode.data.output;
    }
  }

  const isRunning = status === "running";
  const isCompleted = status === "completed";
  const isFailed = status === "failed";

  return (
    <div className={cn(
      "bg-white rounded-xl border w-72 text-xs transition-shadow relative",
      isRunning
        ? "border-blue-400 shadow-2xl shadow-blue-100 ring-2 ring-blue-300 ring-opacity-60 animate-pulse"
        : "border-gray-200 shadow-2xl"
    )}>
      <Handle type="target" id="prompt" position={Position.Left} style={{ ...PROMPT_HANDLE, top: 96 }} />

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="w-4 h-4 rounded-sm bg-blue-500 flex items-center justify-center shrink-0">
            <ImageIcon className="w-2.5 h-2.5 text-white" />
          </div>
          <div className="relative nodrag">
            <select
              value={data.model ?? "gemini-2.0-flash-preview-image-generation"}
              onChange={(e) => updateNodeData(id, { model: e.target.value })}
              className="font-semibold text-gray-900 text-[13px] bg-transparent border-none outline-none appearance-none pr-4 cursor-pointer hover:text-blue-600 max-w-[150px] truncate"
            >
              {MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            className={cn(
              "nodrag flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
              isRunning ? "bg-blue-50 text-blue-600 cursor-not-allowed"
                : isFailed ? "bg-red-50 text-red-600 hover:bg-red-100"
                : "bg-blue-50 text-blue-600 hover:bg-blue-100"
            )}
            disabled={isRunning}
            onClick={() => runNodeCallback?.([id])}
          >
            {isRunning ? <Loader2 className="w-3 h-3 animate-spin" />
              : isFailed ? <XCircle className="w-3 h-3" />
              : <Play className="w-2.5 h-2.5 fill-blue-500" />}
            <span>{isRunning ? "Running" : isFailed ? "Failed" : "Run"}</span>
          </button>
          <button className="p-1 rounded hover:bg-gray-100 text-gray-400" onClick={() => setMenuOpen(!menuOpen)}>
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="px-3 py-2.5 space-y-3">
        {/* Prompt */}
        <div>
          <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wide flex items-center gap-0.5">
            Prompt <span className="text-red-400">*</span>
            {isPromptConnected && <span className="ml-1 text-amber-500 text-[9px] normal-case">← connected</span>}
          </span>
          <textarea
            placeholder={isPromptConnected ? "Connected from input..." : "Describe the image to generate..."}
            disabled={isPromptConnected}
            value={isPromptConnected ? connectedPromptValue : (data.prompt ?? "")}
            onChange={(e) => updateNodeData(id, { prompt: e.target.value })}
            rows={2}
            className={cn(
              "mt-1 w-full text-[11px] border rounded-lg px-2 py-1.5 resize-none",
              isPromptConnected
                ? "text-gray-700 border-amber-200 bg-amber-50 cursor-default"
                : "text-gray-700 border-gray-200 focus:outline-none focus:ring-1 focus:ring-gray-300"
            )}
          />
        </div>

        {/* Aspect ratio */}
        <div>
          <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-0.5 block">
            Aspect Ratio
          </label>
          <select
            value={data.aspectRatio ?? "1:1"}
            onChange={(e) => updateNodeData(id, { aspectRatio: e.target.value })}
            className="nodrag w-full text-[11px] text-gray-700 border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-gray-300 bg-white"
          >
            {ASPECT_RATIOS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        {/* Output */}
        <div className="border-t border-gray-100 pt-2">
          <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Generated Image</span>
          {isCompleted && data.output ? (
            <div className="mt-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={data.output} alt="Generated" className="w-full rounded-lg border border-gray-200 object-cover max-h-40" />
              {data.durationMs != null && (
                <span className="block mt-0.5 text-[10px] text-gray-400">({data.durationMs}ms)</span>
              )}
            </div>
          ) : isFailed ? (
            <div className="mt-1 text-[11px] border border-red-200 bg-red-50 text-red-700 rounded-lg px-2 py-1.5">
              Generation failed
            </div>
          ) : (
            <p className="text-[11px] text-gray-400 mt-0.5">No output yet</p>
          )}
        </div>
      </div>

      <Handle type="source" position={Position.Right} style={IMAGE_HANDLE} />

      <NodeMenuDropdown nodeId={id} canDelete={true} open={menuOpen} onClose={() => setMenuOpen(false)} />
    </div>
  );
}
