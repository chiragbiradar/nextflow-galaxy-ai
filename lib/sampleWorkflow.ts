const EDGE = {
  type: "smoothstep",
  animated: true,
  style: { stroke: "#a855f7", strokeWidth: 2 },
  markerEnd: { type: "arrowclosed", color: "#a855f7" },
};

export const SAMPLE_WORKFLOW_NAME = "Product Marketing Campaign";

export const SAMPLE_NODES = [
  {
    id: "n-inputs",
    type: "requestInputs",
    position: { x: 80, y: 300 },
    data: {
      fields: [
        {
          id: "f-text",
          name: "text_field",
          type: "text",
          value:
            "Product: Wireless Bluetooth Headphones. Features: Noise cancellation, 30-hour battery, foldable design.",
        },
        {
          id: "f-image",
          name: "image_field",
          type: "image",
          value: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80",
        },
      ],
    },
  },
  {
    id: "n-crop1",
    type: "cropImage",
    position: { x: 420, y: 80 },
    data: { label: "Crop Image #1", x: 20, y: 20, w: 60, h: 60, status: "idle", output: null, durationMs: null },
  },
  {
    id: "n-crop2",
    type: "cropImage",
    position: { x: 420, y: 280 },
    data: { label: "Crop Image #2", x: 0, y: 0, w: 100, h: 50, status: "idle", output: null, durationMs: null },
  },
  {
    id: "n-gem1",
    type: "gemini",
    position: { x: 420, y: 480 },
    data: {
      label: "Gemini #1",
      model: "gemini-2.0-flash",
      systemPrompt: "You are a marketing copywriter. Write a one-paragraph product description.",
      status: "idle", output: null, durationMs: null,
    },
  },
  {
    id: "n-gem2",
    type: "gemini",
    position: { x: 800, y: 360 },
    data: {
      label: "Gemini #2",
      model: "gemini-2.0-flash",
      systemPrompt: "Condense the following product description into a tweet-length hook (under 240 characters).",
      status: "idle", output: null, durationMs: null,
    },
  },
  {
    id: "n-gem3",
    type: "gemini",
    position: { x: 1160, y: 200 },
    data: {
      label: "Final Gemini",
      model: "gemini-2.0-flash",
      systemPrompt: "You are a social media manager. Combine the tweet hook and the two product crops into a final marketing post.",
      status: "idle", output: null, durationMs: null,
    },
  },
  { id: "n-response", type: "response", position: { x: 1480, y: 300 }, data: {} },
];

export const SAMPLE_EDGES = [
  { id: "e1", source: "n-inputs", sourceHandle: "field-f-image", target: "n-crop1", ...EDGE },
  { id: "e2", source: "n-inputs", sourceHandle: "field-f-image", target: "n-crop2", ...EDGE },
  { id: "e3", source: "n-inputs", sourceHandle: "field-f-text", target: "n-gem1", targetHandle: "prompt", ...EDGE },
  { id: "e4", source: "n-gem1", target: "n-gem2", targetHandle: "prompt", ...EDGE },
  { id: "e5", source: "n-gem2", target: "n-gem3", targetHandle: "prompt", ...EDGE },
  { id: "e6", source: "n-crop1", target: "n-gem3", targetHandle: "image-vision", ...EDGE },
  { id: "e7", source: "n-crop2", target: "n-gem3", targetHandle: "image-vision", ...EDGE },
  { id: "e8", source: "n-gem3", target: "n-response", ...EDGE },
  { id: "e9", source: "n-crop2", target: "n-response", ...EDGE },
];
