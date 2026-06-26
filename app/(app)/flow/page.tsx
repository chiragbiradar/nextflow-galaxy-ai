import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { FlowDashboard } from "./FlowDashboard";

export default async function FlowPage() {
  const { userId } = await auth();

  const workflows = await prisma.workflow.findMany({
    where: { userId: userId! },
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true, createdAt: true, updatedAt: true },
  });

  return (
    <FlowDashboard
      workflows={workflows.map((w) => ({
        ...w,
        createdAt: w.createdAt.toISOString(),
        updatedAt: w.updatedAt.toISOString(),
      }))}
    />
  );
}
