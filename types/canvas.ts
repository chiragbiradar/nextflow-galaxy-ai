export type FieldType = "text" | "image";
export type NodeStatus = "idle" | "running" | "completed" | "failed";

export type RequestInputField = {
  id: string;
  name: string;
  type: FieldType;
  value: string;
};

export type RequestInputsNodeData = {
  fields: RequestInputField[];
};

export type GeminiNodeData = {
  label: string;
  model: string;
  systemPrompt: string;
  prompt?: string;
  status: NodeStatus;
  output: string | null;
  durationMs: number | null;
  // settings
  temperature?: number;
  maxTokens?: number;
  reasoning?: boolean;
  topP?: number;
  topK?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  repetitionPenalty?: number;
  minP?: number;
  topA?: number;
  seed?: number;
  stopSequences?: string;
  jsonMode?: boolean;
};

export type CropImageNodeData = {
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  inputImageUrl?: string;
  status: NodeStatus;
  output: string | null;
  durationMs: number | null;
};

export type ResponseNodeData = Record<string, unknown>;

export type ImageGenNodeData = {
  label: string;
  model: string;
  prompt?: string;
  aspectRatio?: string;
  status: NodeStatus;
  output: string | null;
  durationMs: number | null;
};
