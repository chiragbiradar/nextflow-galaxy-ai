"use client";

import { Handle, Position, useEdges, useNodes, type NodeProps, type Node } from "@xyflow/react";
import { Info, Pencil, Trash2, MoreHorizontal } from "lucide-react";
import { useState } from "react";
import { NodeMenuDropdown } from "../NodeMenuDropdown";

interface ResultEntry { label: string; text: string }
interface ResponseNodeData extends Record<string, unknown> {
  output?: string | null;
  results?: ResultEntry[];
  status?: string;
}

type Props = NodeProps<Node<ResponseNodeData>>;

const isImageUrl = (s: string) =>
  s.startsWith("data:image/") || /\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(s);

export function ResponseNode({ id, data }: Props) {
  const edges = useEdges();
  const nodes = useNodes();
  const [menuOpen, setMenuOpen] = useState(false);

  // All source nodes connected to this response node
  const connectedSources = edges
    .filter(e => e.target === id)
    .map(e => nodes.find(n => n.id === e.source))
    .filter(Boolean) as Node[];

  // Map nodeId → output text: prefer data.results (full run), then read directly from source nodes
  const resultByNodeId: Record<string, string> = {};
  // Direct read from source nodes (individual runs)
  for (const src of connectedSources) {
    const out = (src.data as Record<string, unknown>).output;
    if (typeof out === "string" && out) resultByNodeId[src.id] = out;
  }
  // Full-run results override (keyed by label → map back to nodeId)
  if (data.results) {
    for (const r of data.results) {
      const match = connectedSources.find(s => {
        const lbl = (s.data as Record<string, unknown>).label as string ?? s.id;
        return lbl === r.label || s.id === r.label;
      });
      if (match) resultByNodeId[match.id] = r.text;
    }
  } else if (data.output && connectedSources[0] && !resultByNodeId[connectedSources[0].id]) {
    resultByNodeId[connectedSources[0].id] = data.output;
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-2xl w-64 text-xs relative">
      {/* Single target handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="result"
        style={{ width: 14, height: 14, background: "#6366f1", border: "2px solid #6366f180", boxShadow: "0 0 8px #6366f150", top: "50%" }}
      />

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded bg-indigo-50 flex items-center justify-center">
            <svg className="w-3 h-3 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <span className="font-semibold text-gray-900 text-[13px]">Response</span>
          <Info className="w-3 h-3 text-gray-400" />
        </div>
        <button className="p-1 rounded hover:bg-gray-100 text-gray-400" onClick={() => setMenuOpen(!menuOpen)}>
          <MoreHorizontal className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Handle label row */}
      <div className="flex items-center gap-1.5 px-3 pt-2 pb-1">
        <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0" />
        <span className="text-[11px] text-gray-500">result</span>
      </div>

      {/* Connected source cards */}
      <div className="px-3 pb-3 pt-1 space-y-2">
        {connectedSources.length === 0 && (
          <p className="text-[11px] text-gray-400 text-center py-3">Connect a node to see output</p>
        )}
        {connectedSources.map(src => {
          const nodeData = src.data as Record<string, unknown>;
          const label = (nodeData?.label as string) ?? src.id;
          const text = resultByNodeId[src.id] ?? "";
          return (
            <div key={src.id} className="rounded-lg border border-gray-100 overflow-hidden">
              <div className="flex items-center justify-between px-2.5 py-1.5 bg-gray-50 border-b border-gray-100">
                <span className="text-[11px] font-medium text-gray-700 truncate">{label}</span>
                <div className="flex items-center gap-0.5 shrink-0">
                  <button className="p-0.5 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600">
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button className="p-0.5 rounded hover:bg-gray-200 text-gray-400 hover:text-red-500">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <div className="px-2.5 py-2 bg-white">
                {text
                  ? isImageUrl(text)
                    ? // eslint-disable-next-line @next/next/no-img-element
                      <img src={text} alt={label} className="rounded object-cover max-h-24 w-full border border-gray-100" />
                    : <p className="text-[11px] text-gray-700 whitespace-pre-wrap max-h-28 overflow-y-auto">{text}</p>
                  : <p className="text-[11px] text-gray-400">No output yet</p>
                }
              </div>
            </div>
          );
        })}
      </div>

      <NodeMenuDropdown nodeId={id} canDelete={false} open={menuOpen} onClose={() => setMenuOpen(false)} />
    </div>
  );
}
