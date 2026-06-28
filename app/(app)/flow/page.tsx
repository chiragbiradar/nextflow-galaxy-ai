import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { SAMPLE_NODES, SAMPLE_EDGES, SAMPLE_WORKFLOW_NAME } from "@/lib/sampleWorkflow";
import { FlowDashboard } from "./FlowDashboard";

export default async function FlowPage() {
  const { userId } = await auth();

  // Auto-create system workflow on first ever load if none exists
  const systemCount = await prisma.workflow.count({ where: { isSystem: true } });
  if (systemCount === 0) {
    await prisma.workflow.create({
      data: {
        userId: "system",
        name: SAMPLE_WORKFLOW_NAME,
        isSystem: true,
        nodes: JSON.parse(JSON.stringify(SAMPLE_NODES)),
        edges: JSON.parse(JSON.stringify(SAMPLE_EDGES)),
      },
    });
  }

  const all = await prisma.workflow.findMany({
    where: { OR: [{ userId: userId!, isSystem: false }, { isSystem: true }] },
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true, createdAt: true, updatedAt: true, coverImage: true, isSystem: true, userId: true },
  });

  const fmt = (w: typeof all[0]) => ({
    id: w.id, name: w.name, isSystem: w.isSystem,
    coverImage: w.coverImage ?? null,
    createdAt: w.createdAt.toISOString(),
    updatedAt: w.updatedAt.toISOString(),
  });

  return (
    <FlowDashboard
      workflows={all.filter(w => !w.isSystem).map(fmt)}
      systemWorkflows={all.filter(w => w.isSystem).map(fmt)}
    />
  );
}
