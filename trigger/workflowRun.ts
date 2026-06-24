import { task, tasks } from "@trigger.dev/sdk";
import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { geminiTask } from "./geminiTask";
import { cropImageTask } from "./cropImageTask";

function makePrisma() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter: new PrismaPg(pool) });
}

interface WorkflowNode {
  id: string;
  type: string;
  data: Record<string, unknown>;
}

interface WorkflowEdge {
  source: string;
  target: string;
  sourceHandle?: string;
}

export interface WorkflowRunPayload {
  runId: string;
  workflowId: string;
  userId: string;
  nodes: object[];
  edges: object[];
}

// Topological sort (Kahn's algorithm)
function topoSort(nodes: WorkflowNode[], edges: WorkflowEdge[]): WorkflowNode[] {
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();

  for (const n of nodes) {
    inDegree.set(n.id, 0);
    adj.set(n.id, []);
  }
  for (const e of edges) {
    adj.get(e.source)!.push(e.target);
    inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1);
  }

  const queue = nodes.filter((n) => inDegree.get(n.id) === 0);
  const result: WorkflowNode[] = [];

  while (queue.length > 0) {
    const node = queue.shift()!;
    result.push(node);
    for (const neighbor of adj.get(node.id) ?? []) {
      const deg = (inDegree.get(neighbor) ?? 1) - 1;
      inDegree.set(neighbor, deg);
      if (deg === 0) queue.push(nodes.find((n) => n.id === neighbor)!);
    }
  }

  return result;
}

export const workflowRunTask = task({
  id: "workflow-run",
  run: async (payload: WorkflowRunPayload) => {
    const prisma = makePrisma();
    const { runId, nodes: rawNodes, edges: rawEdges } = payload;

    const nodes = rawNodes as WorkflowNode[];
    const edges = rawEdges as WorkflowEdge[];

    // Collect input values from requestInputs nodes
    const inputValues: Record<string, string> = {};
    for (const n of nodes) {
      if (n.type === "requestInputs") {
        const fields = (n.data.fields as { id: string; name: string; value: string }[]) ?? [];
        for (const f of fields) {
          inputValues[f.name] = f.value;
        }
      }
    }

    // Map nodeId → output text/url for passing between nodes
    const nodeOutputs: Record<string, string> = {};

    const ordered = topoSort(nodes, edges);

    for (const node of ordered) {
      if (node.type === "requestInputs" || node.type === "response") continue;

      // Create NodeRun record
      const nodeRun = await prisma.nodeRun.create({
        data: {
          workflowRunId: runId,
          nodeId: node.id,
          nodeLabel: (node.data.label as string) ?? node.type,
          nodeType: node.type,
          status: "RUNNING",
        },
      });

      const nodeStart = Date.now();

      try {
        if (node.type === "gemini") {
          // Build user prompt from upstream outputs + input fields
          const incomingEdges = edges.filter((e) => e.target === node.id);
          const parts: string[] = [];
          for (const e of incomingEdges) {
            if (nodeOutputs[e.source]) parts.push(nodeOutputs[e.source]);
            // fieldId handle
            if (e.sourceHandle?.startsWith("field-")) {
              const fieldId = e.sourceHandle.replace("field-", "");
              const srcNode = nodes.find((n) => n.id === e.source);
              const field = (srcNode?.data.fields as { id: string; value: string }[] ?? []).find(
                (f) => f.id === fieldId
              );
              if (field) parts.push(field.value);
            }
          }
          const userPrompt = parts.join("\n") || Object.values(inputValues).join("\n");

          const handle = await tasks.triggerAndWait<typeof geminiTask>("gemini-call", {
            runId,
            nodeRunId: nodeRun.id,
            model: (node.data.model as string) || "gemini-2.0-flash",
            systemPrompt: (node.data.systemPrompt as string) || "",
            userPrompt,
          });

          if (!handle.ok) throw new Error("Gemini task failed");

          const { text, durationMs } = handle.output;
          nodeOutputs[node.id] = text;

          await prisma.nodeRun.update({
            where: { id: nodeRun.id },
            data: {
              status: "COMPLETED",
              output: { text },
              durationMs,
              completedAt: new Date(),
            },
          });
        } else if (node.type === "cropImage") {
          // Find image input from upstream
          const incomingEdges = edges.filter((e) => e.target === node.id);
          let imageUrl = "";
          for (const e of incomingEdges) {
            if (e.sourceHandle?.startsWith("field-")) {
              const fieldId = e.sourceHandle.replace("field-", "");
              const srcNode = nodes.find((n) => n.id === e.source);
              const field = (srcNode?.data.fields as { id: string; type: string; value: string }[] ?? []).find(
                (f) => f.id === fieldId && f.type === "image"
              );
              if (field) { imageUrl = field.value; break; }
            }
            if (nodeOutputs[e.source]) { imageUrl = nodeOutputs[e.source]; break; }
          }

          if (!imageUrl) throw new Error("No image input connected to Crop Image node");

          const handle = await tasks.triggerAndWait<typeof cropImageTask>("crop-image", {
            imageUrl,
            x: (node.data.x as number) ?? 0,
            y: (node.data.y as number) ?? 0,
            w: (node.data.w as number) ?? 100,
            h: (node.data.h as number) ?? 100,
          });

          if (!handle.ok) throw new Error("Crop image task failed");

          const { outputUrl, durationMs } = handle.output;
          if (outputUrl) nodeOutputs[node.id] = outputUrl;

          await prisma.nodeRun.update({
            where: { id: nodeRun.id },
            data: {
              status: "COMPLETED",
              output: { url: outputUrl },
              durationMs,
              completedAt: new Date(),
            },
          });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await prisma.nodeRun.update({
          where: { id: nodeRun.id },
          data: {
            status: "FAILED",
            error: msg,
            durationMs: Date.now() - nodeStart,
            completedAt: new Date(),
          },
        });
        // Mark run failed and stop
        await prisma.workflowRun.update({
          where: { id: runId },
          data: { status: "FAILED", completedAt: new Date() },
        });
        return { status: "FAILED", error: msg };
      }
    }

    await prisma.workflowRun.update({
      where: { id: runId },
      data: { status: "COMPLETED", completedAt: new Date() },
    });

    return { status: "COMPLETED" };
  },
});
