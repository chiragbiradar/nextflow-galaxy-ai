import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { tasks } from "@trigger.dev/sdk";
import type { workflowRunTask } from "@/trigger/workflowRun";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();

  const workflow = await prisma.workflow.findFirst({
    where: { id, userId: userId! },
  });

  if (!workflow) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const run = await prisma.workflowRun.create({
    data: { workflowId: workflow.id, userId: userId!, status: "RUNNING" },
    include: { nodeRuns: true },
  });

  await tasks.trigger<typeof workflowRunTask>("workflow-run", {
    runId: run.id,
    workflowId: workflow.id,
    userId: userId!,
    nodes: workflow.nodes as object[],
    edges: workflow.edges as object[],
  });

  return NextResponse.json({
    id: run.id,
    status: run.status,
    startedAt: run.startedAt.toISOString(),
    completedAt: null,
    nodeRuns: [],
  });
}
