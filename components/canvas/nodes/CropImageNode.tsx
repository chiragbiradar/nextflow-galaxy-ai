"use client";

import { Handle, Position, useReactFlow, type NodeProps, type Node } from "@xyflow/react";
import { Loader2, XCircle, Info, MoreHorizontal, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CropImageNodeData, NodeStatus } from "@/types/canvas";
import { useState } from "react";
import { NodeMenuDropdown } from "../NodeMenuDropdown";

type Props = NodeProps<Node<CropImageNodeData>>;

function RunBadge({ status }: { status: NodeStatus }) {
  return (
    <div className={cn(
      "nodrag flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
      status === "running" ? "bg-emerald-50 text-emerald-600"
        : status === "failed" ? "bg-red-50 text-red-600"
        : "bg-emerald-50 text-emerald-600"
    )}>
      {status === "running" ? <Loader2 className="w-3 h-3 animate-spin" />
        : status === "failed" ? <XCircle className="w-3 h-3" />
        : <Play className="w-2.5 h-2.5 fill-emerald-500" />}
      <span>{status === "running" ? "Running" : status === "failed" ? "Failed" : "Run"}</span>
    </div>
  );
}

function NumInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-0.5 block">{label}</label>
      <input
        type="number"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full text-[11px] text-gray-700 border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-gray-300"
      />
    </div>
  );
}

const IMAGE_HANDLE = { width: 14, height: 14, background: "#3b82f6", border: "2px solid #3b82f680", boxShadow: "0 0 8px #3b82f650" };

export function CropImageNode({ id, data }: Props) {
  const { updateNodeData } = useReactFlow();
  const status = (data.status ?? "idle") as NodeStatus;
  const [menuOpen, setMenuOpen] = useState(false);

  function set(patch: Partial<CropImageNodeData>) {
    updateNodeData(id, patch);
  }

  return (
    <div className={cn(
      "bg-white rounded-xl border w-72 text-xs transition-shadow relative",
      status === "running"
        ? "border-amber-400 shadow-2xl shadow-amber-100 ring-2 ring-amber-300 ring-opacity-60 animate-pulse"
        : "border-gray-200 shadow-2xl"
    )}>
      <Handle type="target" position={Position.Left} style={IMAGE_HANDLE} />

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded-sm bg-amber-500 flex items-center justify-center">
            <span className="text-white text-[8px] font-bold">✂</span>
          </div>
          <input
            value={data.label ?? "Crop Image"}
            onChange={(e) => set({ label: e.target.value })}
            className="font-semibold text-gray-800 text-[13px] bg-transparent border-none outline-none w-28"
          />
          <Info className="w-3 h-3 text-gray-400" />
        </div>
        <div className="flex items-center gap-1.5">
          <RunBadge status={status} />
          <button
            className="p-1 rounded hover:bg-gray-100 text-gray-400"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="px-3 py-2.5 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <NumInput label="X %" value={data.x ?? 0} onChange={(v) => set({ x: v })} />
          <NumInput label="Y %" value={data.y ?? 0} onChange={(v) => set({ y: v })} />
          <NumInput label="Width %" value={data.w ?? 100} onChange={(v) => set({ w: v })} />
          <NumInput label="Height %" value={data.h ?? 100} onChange={(v) => set({ h: v })} />
        </div>

        {/* FFmpeg badge */}
        <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
          Powered by FFmpeg (async, min 30s)
        </div>

        {/* Output image */}
        {status === "completed" && data.output && (
          <div>
            <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1 block">
              Result
              {data.durationMs != null && (
                <span className="text-gray-400 normal-case ml-1">({data.durationMs}ms)</span>
              )}
            </label>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={data.output}
              alt="Cropped output"
              className="w-full rounded-lg border border-gray-200 object-cover max-h-32"
            />
          </div>
        )}

        {status === "failed" && (
          <div className="text-[11px] border border-red-200 bg-red-50 text-red-700 rounded-lg px-2 py-1.5">
            {data.output ?? "Crop failed"}
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Right} style={IMAGE_HANDLE} />

      <NodeMenuDropdown
        nodeId={id}
        canDelete={true}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
      />
    </div>
  );
}
