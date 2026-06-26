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
};

export type CropImageNodeData = {
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
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
