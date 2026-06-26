"use client";

import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { Pencil, Unlink, MoreHorizontal } from "lucide-react";
import { useState } from "react";
import { NodeMenuDropdown } from "../NodeMenuDropdown";

interface ResultEntry { label: string; text: string }
interface ResponseNodeData extends Record<string, unknown> {
  output?: string | null;
  results?: ResultEntry[];
  status?: string;
}

type Props = NodeProps<Node<ResponseNodeData>>;

const isImageData = (s: string) => s.startsWith("data:image/");

export function ResponseNode({ id, data }: Props) {
  const results: ResultEntry[] = data.results && data.results.length > 0
    ? data.results
    : [{ label: "result", text: data.output ?? "" }];
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-2xl w-64 text-xs relative">
      <Handle
        type="target"
        position={Position.Left}
        style={{ width: 14, height: 14, background: "#6366f1", border: "2px solid #6366f180", boxShadow: "0 0 8px #6366f150" }}
      />

      <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100">
        <span className="font-semibold text-gray-900 text-[13px]">Response</span>
        <button
          className="p-1 rounded hover:bg-gray-100 text-gray-400"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <MoreHorizontal className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="px-3 py-2 space-y-3">
        {results.map((r, i) => (
          <div key={i}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-gray-600 font-medium">{r.label}</span>
              <div className="flex items-center gap-1">
                <button className="p-0.5 rounded hover:bg-gray-100 text-gray-400">
                  <Pencil className="w-3 h-3" />
                </button>
                <button className="p-0.5 rounded hover:bg-gray-100 text-gray-400">
                  <Unlink className="w-3 h-3" />
                </button>
              </div>
            </div>
            {r.text
              ? isImageData(r.text)
                ? // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.text} alt={r.label} className="rounded-lg border border-gray-200 object-cover max-h-24 w-full" />
                : <p className="text-[11px] text-gray-700 whitespace-pre-wrap max-h-32 overflow-y-auto">{r.text}</p>
              : <p className="text-[11px] text-gray-400">No output yet</p>
            }
          </div>
        ))}
      </div>

      <NodeMenuDropdown
        nodeId={id}
        canDelete={false}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
      />
    </div>
  );
}
