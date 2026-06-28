import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const CreateBody = z.object({
  name: z.string().min(1).max(255).optional(),
  nodes: z.array(z.any()).optional(),
  edges: z.array(z.any()).optional(),
}).optional();

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

  const parsed = CreateBody.safeParse(await req.json().catch(() => undefined));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const body = parsed.data;

  let name = "Untitled";
  let nodes: object[] = [
    { id: "request-inputs-default", type: "requestInputs", position: { x: 80, y: 200 }, data: { fields: [] } },
    { id: "response-default", type: "response", position: { x: 600, y: 200 }, data: {} },
  ];
  let edges: object[] = [];

  if (body) {
    if (body.name) name = body.name;
    if (body.nodes && body.nodes.length > 0) nodes = body.nodes;
    if (body.edges) edges = body.edges;
  }

  const workflow = await prisma.workflow.create({
    data: { userId, name, nodes, edges },
  });

  return NextResponse.json(workflow, { status: 201 });
}
