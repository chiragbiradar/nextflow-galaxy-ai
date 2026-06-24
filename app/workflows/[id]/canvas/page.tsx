import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { CanvasClient } from "@/components/canvas/CanvasClient";
import type { Node, Edge } from "@xyflow/react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CanvasPage({ params }: PageProps) {
  const { id } = await params;
  const { userId } = await auth();

  const workflow = await prisma.workflow.findFirst({
    where: { id, userId: userId! },
    include: {
      runs: {
        orderBy: { startedAt: "desc" },
        take: 20,
        include: {
          nodeRuns: { orderBy: { startedAt: "asc" } },
        },
      },
    },
  });

  if (!workflow) notFound();

  return (
    <CanvasClient
      workflowId={workflow.id}
      initialName={workflow.name}
      initialNodes={((workflow.nodes as unknown) as Node[]) ?? []}
      initialEdges={((workflow.edges as unknown) as Edge[]) ?? []}
      initialRuns={workflow.runs.map((r) => ({
        id: r.id,
        status: r.status,
        startedAt: r.startedAt.toISOString(),
        completedAt: r.completedAt?.toISOString() ?? null,
        nodeRuns: r.nodeRuns.map((nr) => ({
          id: nr.id,
          nodeId: nr.nodeId,
          nodeLabel: nr.nodeLabel,
          nodeType: nr.nodeType,
          status: nr.status,
          durationMs: nr.durationMs,
          startedAt: nr.startedAt.toISOString(),
        })),
      }))}
    />
  );
}
