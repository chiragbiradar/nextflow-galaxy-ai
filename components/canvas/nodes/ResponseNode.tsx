"use client";

import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { Flag } from "lucide-react";
import type { ResponseNodeData } from "@/types/canvas";

type Props = NodeProps<Node<ResponseNodeData>>;

export function ResponseNode({ data: _ }: Props) {
  return (
    <div className="bg-white rounded-xl border-2 border-gray-900 shadow-sm w-56 text-xs">
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: "#3b82f6", width: 10, height: 10, border: "2px solid white" }}
      />

      <div className="flex items-center gap-2 px-3 py-3">
        <div className="w-6 h-6 rounded-lg bg-gray-900 flex items-center justify-center shrink-0">
          <Flag className="w-3.5 h-3.5 text-white" />
        </div>
        <div>
          <p className="font-semibold text-gray-900 text-[13px]">Response</p>
          <p className="text-[10px] text-gray-400">Terminal node — collects all upstream outputs</p>
        </div>
      </div>
    </div>
  );
}
