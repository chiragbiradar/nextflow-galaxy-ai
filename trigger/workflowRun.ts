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
        for (const f of (n.data.fields as { id: string; name: string; value: string }[]) ?? []) {
          inputValues[f.name] = f.value;
        }
      }
    }

    // Build adjacency map and dependency counts (for parallel execution)
    const adj = new Map<string, string[]>();          // nodeId -> downstream ids
    const pendingDeps = new Map<string, number>();    // nodeId -> # unresolved deps
    const nodeOutputs: Record<string, string> = {};

    for (const n of nodes) { adj.set(n.id, []); pendingDeps.set(n.id, 0); }
    for (const e of edges) {
      adj.get(e.source)!.push(e.target);
      pendingDeps.set(e.target, (pendingDeps.get(e.target) ?? 0) + 1);
    }

    // requestInputs and response are instantly resolved — pre-decrement their dependents
    const preResolved = new Set<string>();
    for (const n of nodes) {
      if (n.type === "requestInputs" || n.type === "response") {
        preResolved.add(n.id);
        for (const depId of adj.get(n.id) ?? []) {
          pendingDeps.set(depId, (pendingDeps.get(depId) ?? 1) - 1);
        }
      }
    }

    // Execute a node and immediately fan out to newly unblocked dependents
    const executeNode = async (node: WorkflowNode): Promise<void> => {
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
          // Build user prompt from upstream outputs or input fields
          const incomingEdges = edges.filter((e) => e.target === node.id);
          const parts: string[] = [];
          for (const e of incomingEdges) {
            if (nodeOutputs[e.source]) parts.push(nodeOutputs[e.source]);
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
            data: { status: "COMPLETED", output: { text }, durationMs, completedAt: new Date() },
          });

        } else if (node.type === "cropImage") {
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
            data: { status: "COMPLETED", output: { url: outputUrl }, durationMs, completedAt: new Date() },
          });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await prisma.nodeRun.update({
          where: { id: nodeRun.id },
          data: { status: "FAILED", error: msg, durationMs: Date.now() - nodeStart, completedAt: new Date() },
        });
        await prisma.workflowRun.update({
          where: { id: runId },
          data: { status: "FAILED", completedAt: new Date() },
        });
        throw err; // propagate so Promise.all catches it
      }

      // Fan out: decrement each dependent's pending count; fire any that become ready
      const readyDeps: WorkflowNode[] = [];
      for (const depId of adj.get(node.id) ?? []) {
        const remaining = (pendingDeps.get(depId) ?? 1) - 1;
        pendingDeps.set(depId, remaining);
        if (remaining === 0) {
          const dep = nodes.find((n) => n.id === depId);
          if (dep && dep.type !== "requestInputs" && dep.type !== "response") {
            readyDeps.push(dep);
          }
        }
      }
      // Fire newly ready dependents concurrently
      await Promise.all(readyDeps.map(executeNode));
    };

    // Kick off all initially-ready executable nodes in parallel
    const initialReady = nodes.filter(
      (n) => (pendingDeps.get(n.id) ?? 0) === 0 && n.type !== "requestInputs" && n.type !== "response"
    );

    try {
      await Promise.all(initialReady.map(executeNode));
    } catch {
      // Individual node failures already marked the run as FAILED above
      return { status: "FAILED" };
    }

    await prisma.workflowRun.update({
      where: { id: runId },
      data: { status: "COMPLETED", completedAt: new Date() },
    });

    return { status: "COMPLETED" };
  },
});
