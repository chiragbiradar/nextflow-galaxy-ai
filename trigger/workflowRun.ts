import { task } from "@trigger.dev/sdk";
import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { runGemini } from "./geminiTask";
import { runCropImage } from "./cropImageTask";
import { runImageGen } from "./imageGenTask";

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
  id?: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface WorkflowRunPayload {
  runId: string;
  workflowId: string;
  userId: string;
  nodes: object[];
  edges: object[];
  selectedNodeIds?: string[] | null;
}

export const workflowRunTask = task({
  id: "workflow-run",
  run: async (payload: WorkflowRunPayload) => {
    const prisma = makePrisma();
    const { runId, nodes: rawNodes, edges: rawEdges, selectedNodeIds } = payload;
    const allNodes = rawNodes as WorkflowNode[];
    const edges = rawEdges as WorkflowEdge[];

    // Collect input values from requestInputs nodes
    const inputValues: Record<string, string> = {};
    for (const n of allNodes) {
      if (n.type === "requestInputs") {
        for (const f of (n.data.fields as { id: string; name: string; value: string }[]) ?? []) {
          inputValues[`field-${f.id}`] = f.value;
          inputValues[f.name] = f.value;
        }
      }
    }

    // If selective execution, only run specified nodes (still use all nodes for input context)
    const selectedSet = selectedNodeIds ? new Set(selectedNodeIds) : null;
    const nodes = selectedSet
      ? allNodes.filter(n => selectedSet.has(n.id) || n.type === "requestInputs" || n.type === "response")
      : allNodes;

    // Build adjacency map and dependency counts
    const adj = new Map<string, string[]>();
    const pendingDeps = new Map<string, number>();
    const nodeOutputs: Record<string, string> = {};

    for (const n of nodes) { adj.set(n.id, []); pendingDeps.set(n.id, 0); }
    for (const e of edges) {
      if (!adj.has(e.source) || !adj.has(e.target)) continue;
      adj.get(e.source)!.push(e.target);
      pendingDeps.set(e.target, (pendingDeps.get(e.target) ?? 0) + 1);
    }

    // requestInputs and response are instantly resolved — pre-decrement their dependents
    for (const n of nodes) {
      if (n.type === "requestInputs" || n.type === "response") {
        for (const depId of adj.get(n.id) ?? []) {
          pendingDeps.set(depId, (pendingDeps.get(depId) ?? 1) - 1);
        }
      }
    }

    let hasFailed = false;
    let hasCompleted = false;

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
          const incomingEdges = edges.filter(e => e.target === node.id);
          const promptEdges = incomingEdges.filter(e => e.targetHandle === "prompt" || !e.targetHandle);
          const visionEdges = incomingEdges.filter(e => e.targetHandle === "image-vision");

          const promptParts: string[] = [];
          for (const e of promptEdges) {
            if (nodeOutputs[e.source]) promptParts.push(nodeOutputs[e.source]);
            if (e.sourceHandle?.startsWith("field-")) {
              const fieldId = e.sourceHandle.replace("field-", "");
              const srcNode = allNodes.find(n => n.id === e.source);
              const field = (srcNode?.data.fields as { id: string; value: string }[] ?? []).find(f => f.id === fieldId);
              if (field?.value) promptParts.push(field.value);
            }
          }

          const visionUrls: string[] = [];
          for (const e of visionEdges) {
            if (nodeOutputs[e.source]) visionUrls.push(nodeOutputs[e.source]);
            if (e.sourceHandle?.startsWith("field-")) {
              const fieldId = e.sourceHandle.replace("field-", "");
              const srcNode = allNodes.find(n => n.id === e.source);
              const field = (srcNode?.data.fields as { id: string; type: string; value: string }[] ?? []).find(
                f => f.id === fieldId && f.type === "image"
              );
              if (field?.value) visionUrls.push(field.value);
            }
          }

          const userPrompt = promptParts.join("\n") || Object.values(inputValues).join("\n");

          // Direct call, not triggerAndWait — child-task waits inside Promise.all
          // resume one at a time and serialize the DAG's parallel branches.
          const { text, durationMs } = await runGemini({
            runId,
            nodeRunId: nodeRun.id,
            model: (node.data.model as string) || "gemini-3.1-pro-preview",
            systemPrompt: (node.data.systemPrompt as string) || "",
            userPrompt,
            visionUrls: visionUrls.length > 0 ? visionUrls : undefined,
          });
          nodeOutputs[node.id] = text;

          await prisma.nodeRun.update({
            where: { id: nodeRun.id },
            data: { status: "COMPLETED", output: { text }, durationMs, completedAt: new Date() },
          });

        } else if (node.type === "cropImage") {
          const incomingEdges = edges.filter(e => e.target === node.id);
          let imageUrl = "";
          for (const e of incomingEdges) {
            if (e.sourceHandle?.startsWith("field-")) {
              const fieldId = e.sourceHandle.replace("field-", "");
              const srcNode = allNodes.find(n => n.id === e.source);
              const field = (srcNode?.data.fields as { id: string; type: string; value: string }[] ?? []).find(
                f => f.id === fieldId && f.type === "image"
              );
              if (field?.value) { imageUrl = field.value; break; }
            }
            if (nodeOutputs[e.source]) { imageUrl = nodeOutputs[e.source]; break; }
          }
          if (!imageUrl) throw new Error("No image input connected to Crop Image node");

          const { outputUrl, durationMs } = await runCropImage({
            imageUrl,
            x: (node.data.x as number) ?? 0,
            y: (node.data.y as number) ?? 0,
            w: (node.data.w as number) ?? 100,
            h: (node.data.h as number) ?? 100,
          });
          if (outputUrl) nodeOutputs[node.id] = outputUrl;

          await prisma.nodeRun.update({
            where: { id: nodeRun.id },
            data: { status: "COMPLETED", output: { url: outputUrl }, durationMs, completedAt: new Date() },
          });

        } else if (node.type === "imageGen") {
          const incomingEdges = edges.filter(e => e.target === node.id);
          const promptParts: string[] = [];
          for (const e of incomingEdges) {
            if (nodeOutputs[e.source]) promptParts.push(nodeOutputs[e.source]);
            if (e.sourceHandle?.startsWith("field-")) {
              const fieldId = e.sourceHandle.replace("field-", "");
              const srcNode = allNodes.find(n => n.id === e.source);
              const field = (srcNode?.data.fields as { id: string; value: string }[] ?? []).find(f => f.id === fieldId);
              if (field?.value) promptParts.push(field.value);
            }
          }
          const prompt = promptParts.join("\n") || (node.data.prompt as string) || "Generate an image";

          const { imageDataUrl, durationMs } = await runImageGen({
            nodeRunId: nodeRun.id,
            prompt,
            model: (node.data.model as string) || "gemini-2.0-flash-preview-image-generation",
            aspectRatio: (node.data.aspectRatio as string) || "1:1",
          });
          if (imageDataUrl) nodeOutputs[node.id] = imageDataUrl;

          await prisma.nodeRun.update({
            where: { id: nodeRun.id },
            data: { status: "COMPLETED", output: { url: imageDataUrl }, durationMs, completedAt: new Date() },
          });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        hasFailed = true;
        await prisma.nodeRun.update({
          where: { id: nodeRun.id },
          data: { status: "FAILED", error: msg, durationMs: Date.now() - nodeStart, completedAt: new Date() },
        });
        return; // stop this branch; siblings in concurrent Promise.all continue unaffected
      }
      hasCompleted = true;

      // Fan out: collect all dependents that are now unblocked, launch them in parallel.
      // pendingDeps mutation is safe — JS single-threaded, no interleave between get+set.
      const fanOut: WorkflowNode[] = [];
      for (const depId of adj.get(node.id) ?? []) {
        const remaining = (pendingDeps.get(depId) ?? 1) - 1;
        pendingDeps.set(depId, remaining);
        if (remaining === 0) {
          const dep = nodes.find(n => n.id === depId);
          if (dep && dep.type !== "requestInputs" && dep.type !== "response") {
            fanOut.push(dep);
          }
        }
      }
      await Promise.all(fanOut.map(executeNode));
    };

    // Launch all initially-ready nodes in parallel (no unmet dependencies).
    const initialReady = nodes.filter(
      n => (pendingDeps.get(n.id) ?? 0) === 0 && n.type !== "requestInputs" && n.type !== "response"
    );

    await Promise.all(initialReady.map(executeNode));

    // Write nodeRun for each response node with collected upstream outputs
    const responseNodes = nodes.filter(n => n.type === "response");
    for (const resNode of responseNodes) {
      const incomingEdges = edges.filter(e => e.target === resNode.id);
      const resultParts: { label: string; text: string }[] = [];
      for (const e of incomingEdges) {
        const srcNode = allNodes.find(n => n.id === e.source);
        const out = nodeOutputs[e.source];
        if (out) resultParts.push({ label: srcNode?.data?.label as string || srcNode?.type || e.source, text: out });
      }
      const combinedText = resultParts.map(r => r.text).join("\n\n");
      await prisma.nodeRun.create({
        data: {
          workflowRunId: runId,
          nodeId: resNode.id,
          nodeLabel: "Response",
          nodeType: "response",
          status: "COMPLETED",
          output: { text: combinedText, results: resultParts },
          durationMs: 0,
          completedAt: new Date(),
        },
      });
    }

    const finalStatus = hasFailed && hasCompleted ? "PARTIAL" : hasFailed ? "FAILED" : "COMPLETED";
    await prisma.workflowRun.update({
      where: { id: runId },
      data: { status: finalStatus, completedAt: new Date() },
    });

    return { status: finalStatus };
  },
});
