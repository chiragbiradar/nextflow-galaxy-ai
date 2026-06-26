"use client";

import dynamic from "next/dynamic";
import type { Node, Edge } from "@xyflow/react";

interface Run {
  id: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  nodeRuns: {
    id: string;
    nodeId: string;
    nodeLabel: string;
    nodeType: string;
    status: string;
    durationMs: number | null;
    output?: unknown;
    startedAt: string;
  }[];
}

interface Props {
  workflowId: string;
  initialName: string;
  initialNodes: Node[];
  initialEdges: Edge[];
  initialRuns: Run[];
}

const CanvasClientDynamic = dynamic(
  () => import("@/components/canvas/CanvasClient").then((m) => ({ default: m.CanvasClient })),
  { ssr: false }
);

export function CanvasLoader(props: Props) {
  return <CanvasClientDynamic {...props} />;
}
