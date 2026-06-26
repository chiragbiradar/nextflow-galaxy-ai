import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workflows = await prisma.workflow.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true, createdAt: true, updatedAt: true },
  });

  return NextResponse.json(workflows);
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let name = "Untitled";
  let nodes: object[] = [];
  let edges: object[] = [];

  const body = await req.json().catch(() => null) as { name?: string; nodes?: object[]; edges?: object[] } | null;
  if (body) {
    if (body.name) name = body.name;
    if (body.nodes) nodes = body.nodes;
    if (body.edges) edges = body.edges;
  }

  const workflow = await prisma.workflow.create({
    data: { userId, name, nodes, edges },
  });

  return NextResponse.json(workflow, { status: 201 });
}
