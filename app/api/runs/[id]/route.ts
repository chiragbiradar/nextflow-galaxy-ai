import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();

  const run = await prisma.workflowRun.findFirst({
    where: { id, userId: userId! },
    include: { nodeRuns: { orderBy: { startedAt: "asc" } } },
  });

  if (!run) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    id: run.id,
    status: run.status,
    startedAt: run.startedAt.toISOString(),
    completedAt: run.completedAt?.toISOString() ?? null,
    nodeRuns: run.nodeRuns.map((nr) => ({
      id: nr.id,
      nodeId: nr.nodeId,
      nodeLabel: nr.nodeLabel,
      nodeType: nr.nodeType,
      status: nr.status,
      durationMs: nr.durationMs,
      output: nr.output,
      error: nr.error,
      startedAt: nr.startedAt.toISOString(),
    })),
  });
}
