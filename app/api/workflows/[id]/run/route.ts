import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { tasks } from "@trigger.dev/sdk";
import { z } from "zod";
import type { workflowRunTask } from "@/trigger/workflowRun";

const RunBody = z.object({
  selectedNodeIds: z.array(z.string()).nullable().optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();

  const workflow = await prisma.workflow.findFirst({
    where: { id, userId: userId! },
  });

  if (!workflow) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = RunBody.safeParse(await req.json().catch(() => ({})));
  const selectedNodeIds = body.success ? (body.data.selectedNodeIds ?? null) : null;

  const run = await prisma.workflowRun.create({
    data: { workflowId: workflow.id, userId: userId!, status: "RUNNING" },
    include: { nodeRuns: true },
  });

  const runnableNodes = (workflow.nodes as { id: string; type?: string }[])
    .filter(n => n.type !== "stickyNote");
  const runnableNodeIds = new Set(runnableNodes.map(n => n.id));
  const runnableEdges = (workflow.edges as { source: string; target: string }[])
    .filter(e => runnableNodeIds.has(e.source) && runnableNodeIds.has(e.target));

  await tasks.trigger<typeof workflowRunTask>("workflow-run", {
    runId: run.id,
    workflowId: workflow.id,
    userId: userId!,
    nodes: runnableNodes,
    edges: runnableEdges,
    selectedNodeIds: selectedNodeIds?.filter(id => runnableNodeIds.has(id)) ?? null,
  });

  return NextResponse.json({
    id: run.id,
    status: run.status,
    startedAt: run.startedAt.toISOString(),
    completedAt: null,
    nodeRuns: [],
  });
}
