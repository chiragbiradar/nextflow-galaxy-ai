"use client";

import { Handle, Position, useReactFlow, type NodeProps, type Node } from "@xyflow/react";
import { Loader2, XCircle, Info, MoreHorizontal, Play, RotateCcw, Plus, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CropImageNodeData, NodeStatus } from "@/types/canvas";
import { useState, useRef, useLayoutEffect } from "react";
import { NodeMenuDropdown } from "../NodeMenuDropdown";

type Props = NodeProps<Node<CropImageNodeData>>;

const IMAGE_HANDLE = { width: 14, height: 14, background: "#3b82f6", border: "2px solid #3b82f680", boxShadow: "0 0 8px #3b82f650" };
const PARAM_HANDLE = { width: 14, height: 14, background: "#ec4899", border: "2px solid #ec489980", boxShadow: "0 0 8px #ec489950" };
const DEFAULTS = { x: 20, y: 20, w: 60, h: 60 };

export function CropImageNode({ id, data }: Props) {
  const { updateNodeData } = useReactFlow();
  const status = (data.status ?? "idle") as NodeStatus;
  const [menuOpen, setMenuOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // refs for each row to measure actual offsetTop for handle positioning
  const rootRef = useRef<HTMLDivElement>(null);
  const imageInputRowRef = useRef<HTMLDivElement>(null);
  const xRowRef = useRef<HTMLDivElement>(null);
  const yRowRef = useRef<HTMLDivElement>(null);
  const wRowRef = useRef<HTMLDivElement>(null);
  const hRowRef = useRef<HTMLDivElement>(null);
  const outputRowRef = useRef<HTMLDivElement>(null);

  const [tops, setTops] = useState({ imageInput: 50, x: 100, y: 136, w: 172, h: 208, output: 280 });

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    function measure() {
      if (!root) return;
      const rows = [
        { key: "imageInput", ref: imageInputRowRef },
        { key: "x", ref: xRowRef },
        { key: "y", ref: yRowRef },
        { key: "w", ref: wRowRef },
        { key: "h", ref: hRowRef },
        { key: "output", ref: outputRowRef },
      ] as const;
      const next: Record<string, number> = {};
      for (const { key, ref } of rows) {
        if (ref.current) {
          next[key] = ref.current.offsetTop + ref.current.offsetHeight / 2;
        }
      }
      setTops(prev => ({ ...prev, ...next }));
    }
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    return () => ro.disconnect();
  }, []);

  function set(patch: Partial<CropImageNodeData>) {
    updateNodeData(id, patch);
  }

  const isRunning = status === "running";
  const isFailed = status === "failed";

  return (
    <div
      ref={rootRef}
      className={cn(
        "bg-white rounded-xl border w-[340px] text-xs transition-shadow relative",
        isRunning
          ? "border-amber-400 shadow-2xl shadow-amber-100 ring-2 ring-amber-300 ring-opacity-60 animate-pulse"
          : "border-gray-200 shadow-2xl"
      )}
    >
      {/* All handles at node level with measured top values */}
      <Handle type="target" position={Position.Left} id="image-input" style={{ ...IMAGE_HANDLE, top: tops.imageInput }} />
      <Handle type="target" position={Position.Left} id="x"           style={{ ...PARAM_HANDLE, top: tops.x }} />
      <Handle type="target" position={Position.Left} id="y"           style={{ ...PARAM_HANDLE, top: tops.y }} />
      <Handle type="target" position={Position.Left} id="w"           style={{ ...PARAM_HANDLE, top: tops.w }} />
      <Handle type="target" position={Position.Left} id="h"           style={{ ...PARAM_HANDLE, top: tops.h }} />
      <Handle type="source" position={Position.Right} id="image-output" style={{ ...IMAGE_HANDLE, top: tops.output }} />

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
          <button className={cn(
            "nodrag flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium",
            isRunning ? "bg-emerald-50 text-emerald-600" : isFailed ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
          )}>
            {isRunning ? <Loader2 className="w-3 h-3 animate-spin" /> : isFailed ? <XCircle className="w-3 h-3" /> : <Play className="w-2.5 h-2.5 fill-emerald-500" />}
            <span>{isRunning ? "Running" : isFailed ? "Failed" : "Run"}</span>
          </button>
          <button className="nodrag p-1 rounded hover:bg-gray-100 text-gray-400" onClick={() => setMenuOpen(!menuOpen)}>
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Input Image row */}
      <div ref={imageInputRowRef} className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-100">
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

      {/* Sliders */}
      <div className="px-3 divide-y divide-gray-50">
        {/* X Position */}
        <div ref={xRowRef} className="flex items-center gap-2 py-1.5">
          <span className="text-[11px] text-gray-700 w-28 shrink-0 flex items-center gap-1">
            X Position (%) <Info className="w-3 h-3 text-gray-400" />
          </span>
          <input type="range" min={0} max={100} value={data.x ?? DEFAULTS.x} onChange={(e) => set({ x: Number(e.target.value) })} className="nodrag flex-1 min-w-0 h-1.5 accent-indigo-500 cursor-pointer" />
          <input type="number" min={0} max={100} value={data.x ?? DEFAULTS.x} onChange={(e) => set({ x: Number(e.target.value) })} className="nodrag w-9 shrink-0 text-[11px] text-gray-700 border border-gray-200 rounded px-1 py-0.5 text-center focus:outline-none focus:ring-1 focus:ring-indigo-300 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
          <button onClick={() => set({ x: DEFAULTS.x })} className="nodrag shrink-0 p-1 rounded border border-gray-200 hover:bg-gray-100 text-gray-400"><RotateCcw className="w-3 h-3" /></button>
          <button onClick={() => set({ x: Math.min(100, (data.x ?? DEFAULTS.x) + 1) })} className="nodrag shrink-0 p-1 rounded border border-gray-200 hover:bg-gray-100 text-gray-400"><Plus className="w-3 h-3" /></button>
        </div>
        {/* Y Position */}
        <div ref={yRowRef} className="flex items-center gap-2 py-1.5">
          <span className="text-[11px] text-gray-700 w-28 shrink-0 flex items-center gap-1">
            Y Position (%) <Info className="w-3 h-3 text-gray-400" />
          </span>
          <input type="range" min={0} max={100} value={data.y ?? DEFAULTS.y} onChange={(e) => set({ y: Number(e.target.value) })} className="nodrag flex-1 min-w-0 h-1.5 accent-indigo-500 cursor-pointer" />
          <input type="number" min={0} max={100} value={data.y ?? DEFAULTS.y} onChange={(e) => set({ y: Number(e.target.value) })} className="nodrag w-9 shrink-0 text-[11px] text-gray-700 border border-gray-200 rounded px-1 py-0.5 text-center focus:outline-none focus:ring-1 focus:ring-indigo-300 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
          <button onClick={() => set({ y: DEFAULTS.y })} className="nodrag shrink-0 p-1 rounded border border-gray-200 hover:bg-gray-100 text-gray-400"><RotateCcw className="w-3 h-3" /></button>
          <button onClick={() => set({ y: Math.min(100, (data.y ?? DEFAULTS.y) + 1) })} className="nodrag shrink-0 p-1 rounded border border-gray-200 hover:bg-gray-100 text-gray-400"><Plus className="w-3 h-3" /></button>
        </div>
        {/* Width */}
        <div ref={wRowRef} className="flex items-center gap-2 py-1.5">
          <span className="text-[11px] text-gray-700 w-28 shrink-0 flex items-center gap-1">
            Width (%) <Info className="w-3 h-3 text-gray-400" />
          </span>
          <input type="range" min={0} max={100} value={data.w ?? DEFAULTS.w} onChange={(e) => set({ w: Number(e.target.value) })} className="nodrag flex-1 min-w-0 h-1.5 accent-indigo-500 cursor-pointer" />
          <input type="number" min={0} max={100} value={data.w ?? DEFAULTS.w} onChange={(e) => set({ w: Number(e.target.value) })} className="nodrag w-9 shrink-0 text-[11px] text-gray-700 border border-gray-200 rounded px-1 py-0.5 text-center focus:outline-none focus:ring-1 focus:ring-indigo-300 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
          <button onClick={() => set({ w: DEFAULTS.w })} className="nodrag shrink-0 p-1 rounded border border-gray-200 hover:bg-gray-100 text-gray-400"><RotateCcw className="w-3 h-3" /></button>
          <button onClick={() => set({ w: Math.min(100, (data.w ?? DEFAULTS.w) + 1) })} className="nodrag shrink-0 p-1 rounded border border-gray-200 hover:bg-gray-100 text-gray-400"><Plus className="w-3 h-3" /></button>
        </div>
        {/* Height */}
        <div ref={hRowRef} className="flex items-center gap-2 py-1.5">
          <span className="text-[11px] text-gray-700 w-28 shrink-0 flex items-center gap-1">
            Height (%) <Info className="w-3 h-3 text-gray-400" />
          </span>
          <input type="range" min={0} max={100} value={data.h ?? DEFAULTS.h} onChange={(e) => set({ h: Number(e.target.value) })} className="nodrag flex-1 min-w-0 h-1.5 accent-indigo-500 cursor-pointer" />
          <input type="number" min={0} max={100} value={data.h ?? DEFAULTS.h} onChange={(e) => set({ h: Number(e.target.value) })} className="nodrag w-9 shrink-0 text-[11px] text-gray-700 border border-gray-200 rounded px-1 py-0.5 text-center focus:outline-none focus:ring-1 focus:ring-indigo-300 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
          <button onClick={() => set({ h: DEFAULTS.h })} className="nodrag shrink-0 p-1 rounded border border-gray-200 hover:bg-gray-100 text-gray-400"><RotateCcw className="w-3 h-3" /></button>
          <button onClick={() => set({ h: Math.min(100, (data.h ?? DEFAULTS.h) + 1) })} className="nodrag shrink-0 p-1 rounded border border-gray-200 hover:bg-gray-100 text-gray-400"><Plus className="w-3 h-3" /></button>
        </div>
      </div>

      {/* Output Image */}
      <div ref={outputRowRef} className="px-3 pt-3 pb-2 border-t border-gray-100 mt-1">
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
