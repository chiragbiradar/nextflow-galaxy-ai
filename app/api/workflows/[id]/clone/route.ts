import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  // Allow cloning own workflows OR system workflows
  const wf = await prisma.workflow.findFirst({
    where: { id, OR: [{ userId }, { isSystem: true }] },
  });
  if (!wf) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const cloned = await prisma.workflow.create({
    data: {
      userId,
      name: `${wf.name} (copy)`,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      nodes: (wf.nodes ?? []) as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      edges: (wf.edges ?? []) as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      coverImage: (wf as any).coverImage ?? null,
      isSystem: false,
    },
  });
  return NextResponse.json(cloned, { status: 201 });
}
