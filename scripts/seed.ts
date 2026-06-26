import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const DEMO_USER_ID = process.env.SEED_USER_ID;

if (!DEMO_USER_ID) {
  console.error("Set SEED_USER_ID env var to your Clerk userId (user_...)");
  process.exit(1);
}

// Purple animated edges
const EDGE = {
  type: "smoothstep",
  animated: true,
  style: { stroke: "#a855f7", strokeWidth: 2 },
  markerEnd: { type: "arrowclosed", color: "#a855f7" },
};

// 7-node Product Marketing workflow per spec
const nodes = [
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
          value: "",
        },
      ],
    },
  },
  {
    id: "n-crop1",
    type: "cropImage",
    position: { x: 420, y: 80 },
    data: {
      label: "Crop Image #1",
      x: 20,
      y: 20,
      w: 60,
      h: 60,
      status: "idle",
      output: null,
      durationMs: null,
    },
  },
  {
    id: "n-crop2",
    type: "cropImage",
    position: { x: 420, y: 280 },
    data: {
      label: "Crop Image #2",
      x: 0,
      y: 0,
      w: 100,
      h: 50,
      status: "idle",
      output: null,
      durationMs: null,
    },
  },
  {
    id: "n-gem1",
    type: "gemini",
    position: { x: 420, y: 480 },
    data: {
      label: "Gemini #1",
      model: "gemini-2.0-flash",
      systemPrompt:
        "You are a marketing copywriter. Write a one-paragraph product description.",
      status: "idle",
      output: null,
      durationMs: null,
    },
  },
  {
    id: "n-gem2",
    type: "gemini",
    position: { x: 800, y: 360 },
    data: {
      label: "Gemini #2",
      model: "gemini-2.0-flash",
      systemPrompt:
        "Condense the following product description into a tweet-length hook (under 240 characters).",
      status: "idle",
      output: null,
      durationMs: null,
    },
  },
  {
    id: "n-gem3",
    type: "gemini",
    position: { x: 1160, y: 200 },
    data: {
      label: "Final Gemini",
      model: "gemini-2.0-flash",
      systemPrompt:
        "You are a social media manager. Combine the tweet hook and the two product crops into a final marketing post.",
      status: "idle",
      output: null,
      durationMs: null,
    },
  },
  {
    id: "n-response",
    type: "response",
    position: { x: 1480, y: 300 },
    data: {},
  },
];

const edges = [
  // image_field → Crop #1 and Crop #2
  { id: "e1", source: "n-inputs", sourceHandle: "field-f-image", target: "n-crop1", ...EDGE },
  { id: "e2", source: "n-inputs", sourceHandle: "field-f-image", target: "n-crop2", ...EDGE },
  // text_field → Gemini #1 prompt
  { id: "e3", source: "n-inputs", sourceHandle: "field-f-text", target: "n-gem1", targetHandle: "prompt", ...EDGE },
  // Gemini #1 → Gemini #2 prompt
  { id: "e4", source: "n-gem1", target: "n-gem2", targetHandle: "prompt", ...EDGE },
  // Gemini #2 → Final Gemini prompt
  { id: "e5", source: "n-gem2", target: "n-gem3", targetHandle: "prompt", ...EDGE },
  // Crop #1 + Crop #2 → Final Gemini vision
  { id: "e6", source: "n-crop1", target: "n-gem3", targetHandle: "image-vision", ...EDGE },
  { id: "e7", source: "n-crop2", target: "n-gem3", targetHandle: "image-vision", ...EDGE },
  // Final Gemini + Crop #2 → Response
  { id: "e8", source: "n-gem3", target: "n-response", ...EDGE },
  { id: "e9", source: "n-crop2", target: "n-response", ...EDGE },
];

async function main() {
  const workflow = await prisma.workflow.create({
    data: {
      userId: DEMO_USER_ID!,
      name: "Product Marketing Campaign",
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
    },
  });

  console.log(`Created workflow: ${workflow.id} — "${workflow.name}"`);
  console.log(`Open: http://localhost:3000/workflows/${workflow.id}/canvas`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
