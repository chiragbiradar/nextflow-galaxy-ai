"use client";

import { useReactFlow, type NodeProps, type Node } from "@xyflow/react";
import { MoreHorizontal } from "lucide-react";
import { useState } from "react";
import { NodeMenuDropdown } from "../NodeMenuDropdown";

interface StickyNoteData { text?: string; [key: string]: unknown }
type Props = NodeProps<Node<StickyNoteData>>;

export function StickyNoteNode({ id, data }: Props) {
  const { updateNodeData } = useReactFlow();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="h-full w-full rounded-xl bg-yellow-100 shadow-sm cursor-grab active:cursor-grabbing relative">
      <div className="flex items-center justify-end px-2 pt-1.5 pb-0">
        <button
          className="p-0.5 rounded hover:bg-yellow-200 text-yellow-600 nodrag"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <MoreHorizontal className="w-3.5 h-3.5" />
        </button>
      </div>
      <textarea
        value={data.text ?? ""}
        onChange={e => updateNodeData(id, { text: e.target.value })}
        placeholder="Type a note..."
        className="h-full w-full resize-none rounded-lg border-none bg-transparent px-3 pb-3 pt-0 leading-relaxed text-gray-800 outline-none placeholder:text-gray-400/60 nodrag"
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
