export interface LLMModel {
  id: string;
  label: string;
  vision: boolean;
  audio: boolean;
  video: boolean;
}

export const LLM_MODELS: LLMModel[] = [
  { id: "gemini-3.5-flash",      label: "Gemini 3.5 Flash",      vision: true, audio: true,  video: true  },
  { id: "gemini-3.1-pro-preview", label: "Gemini 3.1 Pro Preview ★", vision: true, audio: true, video: true },
  { id: "gemini-3.1-flash-lite", label: "Gemini 3.1 Flash-Lite",  vision: true, audio: false, video: false },
  { id: "gemini-2.5-pro",        label: "Gemini 2.5 Pro",        vision: true, audio: true,  video: true  },
  { id: "gemini-2.5-flash",      label: "Gemini 2.5 Flash",      vision: true, audio: true,  video: true  },
  { id: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash-Lite", vision: true, audio: false, video: false },
  { id: "gemini-2.0-flash",      label: "Gemini 2.0 Flash",      vision: true, audio: true,  video: false },
];

export function getModel(id: string): LLMModel {
  return LLM_MODELS.find(m => m.id === id) ?? LLM_MODELS[0];
}
