import { task } from "@trigger.dev/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";

export interface ImageGenTaskPayload {
  nodeRunId: string;
  prompt: string;
  model: string;
  aspectRatio?: string;
}

export async function runImageGen(payload: ImageGenTaskPayload): Promise<{ imageDataUrl: string; durationMs: number }> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: payload.model });

  const start = Date.now();
  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: payload.prompt }] }],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    generationConfig: { responseModalities: ["IMAGE", "TEXT"] } as any,
  });
  const durationMs = Date.now() - start;

  let imageDataUrl = "";
  const parts = result.response.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    if ("inlineData" in part && part.inlineData?.data) {
      imageDataUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      break;
    }
  }

  return { imageDataUrl, durationMs };
}

export const imageGenTask = task({
  id: "image-gen",
  run: (payload: ImageGenTaskPayload) => runImageGen(payload),
});
