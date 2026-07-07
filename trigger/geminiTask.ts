import { task } from "@trigger.dev/sdk";
import { GoogleGenerativeAI, type Part } from "@google/generative-ai";

export interface GeminiTaskPayload {
  runId: string;
  nodeRunId: string;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  visionUrls?: string[];
}

async function urlToInlinePart(url: string): Promise<Part> {
  if (url.startsWith("data:")) {
    // data:image/jpeg;base64,<data>
    const [header, data] = url.split(",");
    const mimeType = header.split(":")[1].split(";")[0];
    return { inlineData: { mimeType, data } };
  }
  const res = await fetch(url);
  const buf = await res.arrayBuffer();
  const mimeType = res.headers.get("content-type") ?? "image/jpeg";
  const data = Buffer.from(buf).toString("base64");
  return { inlineData: { mimeType, data } };
}

export async function runGemini(payload: GeminiTaskPayload): Promise<{ text: string; durationMs: number }> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({
    model: payload.model,
    systemInstruction: payload.systemPrompt || undefined,
  });

  const parts: Part[] = [{ text: payload.userPrompt }];

  if (payload.visionUrls?.length) {
    const imageParts = await Promise.all(payload.visionUrls.map(urlToInlinePart));
    parts.push(...imageParts);
  }

  const start = Date.now();
  let result;
  try {
    result = await model.generateContent(parts);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("429") || msg.toLowerCase().includes("quota") || msg.toLowerCase().includes("resource_exhausted")) {
      throw new Error(`Quota exceeded for model "${payload.model}". This model requires a paid Gemini API plan — switch to Gemini 2.5 Flash or 3.5 Flash (free tier).`);
    }
    throw err;
  }
  const text = result.response.text();
  const durationMs = Date.now() - start;

  return { text, durationMs };
}

export const geminiTask = task({
  id: "gemini-call",
  run: (payload: GeminiTaskPayload) => runGemini(payload),
});
