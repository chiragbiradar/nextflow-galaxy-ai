import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const PatchBody = z.object({
  name: z.string().min(1).max(255).optional(),
  nodes: z.array(z.any()).optional(),
  edges: z.array(z.any()).optional(),
});

async function getOwned(id: string, userId: string) {
  return prisma.workflow.findFirst({ where: { id, userId } });
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const wf = await getOwned(id, userId);
  if (!wf) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(wf);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const wf = await getOwned(id, userId);
  if (!wf) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = PatchBody.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const body = parsed.data;
  const updated = await prisma.workflow.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.nodes !== undefined && { nodes: body.nodes }),
      ...(body.edges !== undefined && { edges: body.edges }),
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const wf = await getOwned(id, userId);
  if (!wf) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.workflow.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
