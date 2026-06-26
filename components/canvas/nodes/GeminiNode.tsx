"use client";

import { Handle, Position, useReactFlow, useEdges, useNodes, type NodeProps, type Node } from "@xyflow/react";
import { Loader2, XCircle, Info, MoreHorizontal, ChevronDown, ChevronRight, Play, Settings, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GeminiNodeData, NodeStatus } from "@/types/canvas";
import { useState } from "react";
import { useCanvasStore } from "@/store/canvas";
import type { RequestInputsNodeData } from "@/types/canvas";
import { NodeMenuDropdown } from "../NodeMenuDropdown";

type Props = NodeProps<Node<GeminiNodeData>>;

const MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-pro",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-1.5-pro",
  "gemini-1.5-flash",
];

const HANDLE_STYLE = { background: "#f59e0b", width: 10, height: 10, border: "2px solid white" };

export function GeminiNode({ id, data }: Props) {
  const { updateNodeData } = useReactFlow();
  const edges = useEdges();
  const allNodes = useNodes();
  const status = (data.status ?? "idle") as NodeStatus;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const runNodeCallback = useCanvasStore(s => s.runNodeCallback);

  const promptEdge = edges.find(e => e.target === id && (e.targetHandle === "prompt" || !e.targetHandle));
  const isPromptConnected = !!promptEdge;
  const visionEdges = edges.filter(e => e.target === id && e.targetHandle === "image-vision");
  const isVisionConnected = visionEdges.length > 0;

  // Resolve live value from connected requestInputs field
  let connectedPromptValue = "";
  if (isPromptConnected && promptEdge) {
    const srcNode = allNodes.find(n => n.id === promptEdge.source);
    if (srcNode?.type === "requestInputs") {
      const fieldId = promptEdge.sourceHandle?.replace("field-", "");
      const field = ((srcNode.data as RequestInputsNodeData).fields ?? []).find(f => f.id === fieldId);
      connectedPromptValue = field?.value ?? "";
    }
  }

  // Resolve connected vision image URLs
  const connectedVisionImages: string[] = [];
  for (const ve of visionEdges) {
    const srcNode = allNodes.find(n => n.id === ve.source);
    if (!srcNode) continue;
    // Output from completed cropImage or gemini nodes
    if (typeof srcNode.data.output === "string" && srcNode.data.output) {
      connectedVisionImages.push(srcNode.data.output);
    }
    // Direct from requestInputs image field
    if (srcNode.type === "requestInputs" && ve.sourceHandle?.startsWith("field-")) {
      const fieldId = ve.sourceHandle.replace("field-", "");
      const field = ((srcNode.data as RequestInputsNodeData).fields ?? []).find(f => f.id === fieldId);
      if (field?.value) connectedVisionImages.push(field.value);
    }
  }

  return (
    <div className={cn(
      "bg-white rounded-xl border w-72 text-xs transition-shadow relative",
      status === "running"
        ? "border-amber-400 shadow-2xl shadow-amber-100 ring-2 ring-amber-300 ring-opacity-60 animate-pulse"
        : "border-gray-200 shadow-2xl"
    )}>
      {/* Prompt input handle */}
      <Handle
        type="target"
        id="prompt"
        position={Position.Left}
        style={{ ...HANDLE_STYLE, top: 96 }}
      />
      {/* Image Vision input handle */}
      <Handle
        type="target"
        id="image-vision"
        position={Position.Left}
        style={{ ...HANDLE_STYLE, top: 156, background: "#f59e0b" }}
      />

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="relative nodrag">
            <select
              value={data.model ?? "gemini-2.5-flash"}
              onChange={(e) => updateNodeData(id, { model: e.target.value })}
              className="font-semibold text-gray-900 text-[13px] bg-transparent border-none outline-none appearance-none pr-4 cursor-pointer hover:text-indigo-600 max-w-[140px] truncate"
            >
              {MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
          </div>
          <Info className="w-3 h-3 text-gray-400 shrink-0" />
          <Settings className="w-3 h-3 text-gray-400 shrink-0" />
        </div>
        <div className="flex items-center gap-1.5">
          <button
            className={cn(
              "nodrag flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
              status === "running" ? "bg-emerald-50 text-emerald-600 cursor-not-allowed"
                : status === "failed" ? "bg-red-50 text-red-600 hover:bg-red-100"
                : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
            )}
            disabled={status === "running"}
            onClick={() => runNodeCallback?.([id])}
          >
            {status === "running" ? <Loader2 className="w-3 h-3 animate-spin" />
              : status === "failed" ? <XCircle className="w-3 h-3" />
              : <Play className="w-2.5 h-2.5 fill-emerald-500" />}
            <span>{status === "running" ? "Running" : status === "failed" ? "Failed" : "Run"}</span>
          </button>
          <button
            className="p-1 rounded hover:bg-gray-100 text-gray-400"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="px-3 py-2.5 space-y-3">
        {/* Prompt — left handle target */}
        <div>
          <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wide flex items-center gap-0.5">
            Prompt <span className="text-red-400">*</span>
            {isPromptConnected && <span className="ml-1 text-purple-500 text-[9px] normal-case">← connected</span>}
          </span>
          <textarea
            placeholder={isPromptConnected ? "Connected from input..." : "Enter your prompt..."}
            disabled={isPromptConnected}
            value={isPromptConnected ? connectedPromptValue : (data.prompt ?? "")}
            onChange={(e) => updateNodeData(id, { prompt: e.target.value })}
            rows={2}
            className={cn(
              "mt-1 w-full text-[11px] border rounded-lg px-2 py-1.5 resize-none",
              isPromptConnected
                ? "text-gray-700 border-purple-200 bg-purple-50 cursor-default"
                : "text-gray-700 border-gray-200 focus:outline-none focus:ring-1 focus:ring-gray-300"
            )}
          />
        </div>

        {/* Image (Vision) — left handle target */}
        <div>
          <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wide flex items-center gap-0.5">
            Image (Vision)
            {isVisionConnected && <span className="ml-1 text-blue-500 text-[9px] normal-case">← {visionEdges.length} connected</span>}
          </span>
          {isVisionConnected && connectedVisionImages.length > 0 ? (
            <div className="mt-1 flex gap-1.5 flex-wrap">
              {connectedVisionImages.map((url, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={url} alt={`Vision input ${i + 1}`}
                  className="rounded-lg border border-blue-200 object-cover h-16 w-16" />
              ))}
            </div>
          ) : (
            <div className={cn(
              "mt-1 flex items-center justify-center h-8 rounded-lg border text-[10px]",
              isVisionConnected
                ? "border-blue-200 bg-blue-50 text-blue-400"
                : "border-dashed border-gray-200 text-gray-300"
            )}>
              {isVisionConnected ? "Waiting for image..." : "Connect an image output"}
            </div>
          )}
        </div>

        {/* System Prompt */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">System Prompt</span>
            <button className="p-0.5 rounded hover:bg-gray-100 text-gray-400">
              <ChevronDown className="w-3 h-3" />
            </button>
          </div>
          <div className="relative">
            <textarea
              value={data.systemPrompt ?? ""}
              onChange={(e) => updateNodeData(id, { systemPrompt: e.target.value })}
              placeholder="You are a helpful assistant..."
              rows={3}
              className="w-full text-[11px] text-gray-700 border border-gray-200 rounded-lg px-2 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-gray-300"
            />
            <button className="absolute bottom-1.5 right-1.5 p-0.5 rounded text-gray-300 hover:text-gray-500">
              <Maximize2 className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Settings collapsible — placeholder for future settings */}
        <button
          onClick={() => setSettingsOpen(!settingsOpen)}
          className="nodrag flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-700"
        >
          <ChevronRight className={cn("w-3 h-3 transition-transform", settingsOpen && "rotate-90")} />
          Settings
        </button>

        {/* Response */}
        <div className="border-t border-gray-100 pt-2">
          <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Response</span>
          {(status === "completed" || status === "failed") ? (
            <div className={cn(
              "mt-1 text-[11px] border rounded-lg px-2 py-1.5 max-h-24 overflow-y-auto whitespace-pre-wrap",
              status === "failed" ? "border-red-200 bg-red-50 text-red-700" : "border-gray-200 bg-gray-50 text-gray-700"
            )}>
              {data.output ?? "No output"}
              {data.durationMs != null && (
                <span className="block mt-1 text-[10px] text-gray-400">({data.durationMs}ms)</span>
              )}
            </div>
          ) : (
            <p className="text-[11px] text-gray-400 mt-0.5">No output yet</p>
          )}
        </div>
      </div>

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Right}
        style={HANDLE_STYLE}
      />

      <NodeMenuDropdown
        nodeId={id}
        canDelete={true}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
      />
    </div>
  );
}
