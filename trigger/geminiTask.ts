import { task } from "@trigger.dev/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";

export interface GeminiTaskPayload {
  runId: string;
  nodeRunId: string;
  model: string;
  systemPrompt: string;
  userPrompt: string;
}

export const geminiTask = task({
  id: "gemini-call",
  run: async (payload: GeminiTaskPayload) => {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({
      model: payload.model,
      systemInstruction: payload.systemPrompt || undefined,
    });

    const start = Date.now();
    const result = await model.generateContent(payload.userPrompt);
    const text = result.response.text();
    const durationMs = Date.now() - start;

    return { text, durationMs };
  },
});
