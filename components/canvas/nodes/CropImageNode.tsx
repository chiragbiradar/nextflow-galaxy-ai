"use client";

import { Handle, Position, useReactFlow, type NodeProps, type Node } from "@xyflow/react";
import { Loader2, XCircle, Info, MoreHorizontal, Play, RotateCcw, Plus, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CropImageNodeData, NodeStatus } from "@/types/canvas";
import { useState, useRef } from "react";
import { NodeMenuDropdown } from "../NodeMenuDropdown";

type Props = NodeProps<Node<CropImageNodeData>>;

const IMAGE_HANDLE = { width: 14, height: 14, background: "#3b82f6", border: "2px solid #3b82f680", boxShadow: "0 0 8px #3b82f650" };
const PARAM_HANDLE = { width: 14, height: 14, background: "#ec4899", border: "2px solid #ec489980", boxShadow: "0 0 8px #ec489950" };

const DEFAULTS = { x: 20, y: 20, w: 60, h: 60 };

interface SliderRowProps {
  label: string;
  handleId: string;
  handleTopPx: number;
  value: number;
  defaultValue: number;
  onChange: (v: number) => void;
}

function SliderRow({ label, handleId, handleTopPx, value, defaultValue, onChange }: SliderRowProps) {
  return (
    <div className="relative flex items-center gap-2 py-1.5">
      <Handle
        type="target"
        position={Position.Left}
        id={handleId}
        style={{ ...PARAM_HANDLE, top: handleTopPx, left: -7 }}
      />
      <div className="flex items-center gap-1 w-28 shrink-0 pl-1">
        <span className="text-[11px] text-gray-700">{label}</span>
        <Info className="w-3 h-3 text-gray-400 shrink-0" />
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="nodrag flex-1 h-1.5 accent-indigo-500 cursor-pointer"
      />
      <input
        type="number"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="nodrag w-10 text-[11px] text-gray-700 border border-gray-200 rounded px-1 py-0.5 text-center focus:outline-none focus:ring-1 focus:ring-indigo-300"
      />
      <button
        onClick={() => onChange(defaultValue)}
        className="nodrag p-1 rounded hover:bg-gray-100 text-gray-400"
        title="Reset"
      >
        <RotateCcw className="w-3 h-3" />
      </button>
      <button
        onClick={() => onChange(Math.min(100, value + 1))}
        className="nodrag p-1 rounded hover:bg-gray-100 text-gray-400"
      >
        <Plus className="w-3 h-3" />
      </button>
    </div>
  );
}

export function CropImageNode({ id, data }: Props) {
  const { updateNodeData } = useReactFlow();
  const status = (data.status ?? "idle") as NodeStatus;
  const [menuOpen, setMenuOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function set(patch: Partial<CropImageNodeData>) {
    updateNodeData(id, patch);
  }

  const isRunning = status === "running";
  const isFailed = status === "failed";

  return (
    <div className={cn(
      "bg-white rounded-xl border w-[340px] text-xs transition-shadow relative",
      isRunning
        ? "border-amber-400 shadow-2xl shadow-amber-100 ring-2 ring-amber-300 ring-opacity-60 animate-pulse"
        : "border-gray-200 shadow-2xl"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-gray-800 text-[13px]">Crop Image</span>
          <Info className="w-3.5 h-3.5 text-gray-400" />
        </div>
        <div className="flex items-center gap-1.5">
          <button className="nodrag p-1 rounded hover:bg-gray-100 text-gray-400" onClick={() => set({ x: DEFAULTS.x, y: DEFAULTS.y, w: DEFAULTS.w, h: DEFAULTS.h })}>
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            className={cn(
              "nodrag flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium",
              isRunning ? "bg-emerald-50 text-emerald-600" : isFailed ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
            )}
          >
            {isRunning ? <Loader2 className="w-3 h-3 animate-spin" /> : isFailed ? <XCircle className="w-3 h-3" /> : <Play className="w-2.5 h-2.5 fill-emerald-500" />}
            <span>{isRunning ? "Running" : isFailed ? "Failed" : "Run"}</span>
          </button>
          <button className="nodrag p-1 rounded hover:bg-gray-100 text-gray-400" onClick={() => setMenuOpen(!menuOpen)}>
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Input Image row */}
      <div className="relative flex items-center gap-2 px-3 py-2.5 border-b border-gray-100">
        <Handle type="target" position={Position.Left} id="image-input" style={{ ...IMAGE_HANDLE, top: 88 }} />
        <span className="text-[11px] text-gray-700 font-medium">
          Input Image<span className="text-red-400">*</span>
        </span>
        <div className="flex-1" />
        <button
          className="nodrag flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 text-[11px]"
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="w-3 h-3" />
          Upload Image
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = (ev) => set({ inputImageUrl: ev.target?.result as string });
          reader.readAsDataURL(file);
        }} />
      </div>

      {/* Sliders — handleTopPx = header(44) + inputRow(44) + rowIndex*36 + 18 (row center) */}
      <div className="px-3 divide-y divide-gray-50">
        <SliderRow label="X Position (%)" handleId="x" handleTopPx={124} value={data.x ?? DEFAULTS.x} defaultValue={DEFAULTS.x} onChange={(v) => set({ x: v })} />
        <SliderRow label="Y Position (%)" handleId="y" handleTopPx={160} value={data.y ?? DEFAULTS.y} defaultValue={DEFAULTS.y} onChange={(v) => set({ y: v })} />
        <SliderRow label="Width (%)"      handleId="w" handleTopPx={196} value={data.w ?? DEFAULTS.w} defaultValue={DEFAULTS.w} onChange={(v) => set({ w: v })} />
        <SliderRow label="Height (%)"     handleId="h" handleTopPx={232} value={data.h ?? DEFAULTS.h} defaultValue={DEFAULTS.h} onChange={(v) => set({ h: v })} />
      </div>

      {/* Output Image */}
      <div className="relative px-3 pt-3 pb-2 border-t border-gray-100 mt-1">
        <Handle type="source" position={Position.Right} id="image-output" style={{ ...IMAGE_HANDLE, top: 280 }} />
        <span className="text-[11px] text-gray-700 font-medium">Output Image</span>

        {status === "completed" && data.output ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={data.output} alt="Cropped" className="mt-2 w-full rounded-lg border border-gray-200 object-cover max-h-40" />
        ) : (
          <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 h-24 flex items-center justify-center">
            {isFailed
              ? <span className="text-[11px] text-red-500">{data.output ?? "Crop failed"}</span>
              : <span className="text-[11px] text-gray-400">No output yet</span>
            }
          </div>
        )}

        <div className="flex justify-end mt-1.5">
          <span className="text-[9px] text-gray-400">-0.005 M</span>
        </div>
      </div>

      <NodeMenuDropdown nodeId={id} canDelete={true} open={menuOpen} onClose={() => setMenuOpen(false)} />
    </div>
  );
}
