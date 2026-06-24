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

const nodes = [
  {
    id: "node-inputs",
    type: "requestInputs",
    position: { x: 80, y: 200 },
    data: {
      fields: [
        { id: "f1", name: "product_name", type: "text", value: "NextFlow" },
        { id: "f2", name: "target_audience", type: "text", value: "indie hackers and startup founders" },
        { id: "f3", name: "key_benefit", type: "text", value: "build LLM workflows visually in minutes" },
      ],
    },
  },
  {
    id: "node-headline",
    type: "gemini",
    position: { x: 440, y: 100 },
    data: {
      label: "Generate Headline",
      model: "gemini-2.0-flash",
      systemPrompt: "You are a world-class copywriter. Write a single punchy product headline (max 12 words). No quotes, no punctuation at the end.",
      status: "idle",
      output: null,
      durationMs: null,
    },
  },
  {
    id: "node-body",
    type: "gemini",
    position: { x: 440, y: 320 },
    data: {
      label: "Generate Body Copy",
      model: "gemini-2.0-flash",
      systemPrompt: "You are a marketing copywriter. Write 3 short punchy bullet points (each max 15 words) that highlight the product benefit. Use • as the bullet character.",
      status: "idle",
      output: null,
      durationMs: null,
    },
  },
  {
    id: "node-cta",
    type: "gemini",
    position: { x: 440, y: 540 },
    data: {
      label: "Generate CTA",
      model: "gemini-2.0-flash",
      systemPrompt: "You are a conversion copywriter. Write a single compelling call-to-action button label (max 5 words). No punctuation.",
      status: "idle",
      output: null,
      durationMs: null,
    },
  },
  {
    id: "node-response",
    type: "response",
    position: { x: 820, y: 320 },
    data: {},
  },
];

const edges = [
  {
    id: "e1",
    source: "node-inputs",
    sourceHandle: "field-f1",
    target: "node-headline",
    type: "smoothstep",
    style: { stroke: "#f97316", strokeWidth: 2 },
    markerEnd: { type: "arrowclosed", color: "#f97316" },
  },
  {
    id: "e2",
    source: "node-inputs",
    sourceHandle: "field-f2",
    target: "node-body",
    type: "smoothstep",
    style: { stroke: "#f97316", strokeWidth: 2 },
    markerEnd: { type: "arrowclosed", color: "#f97316" },
  },
  {
    id: "e3",
    source: "node-inputs",
    sourceHandle: "field-f3",
    target: "node-cta",
    type: "smoothstep",
    style: { stroke: "#f97316", strokeWidth: 2 },
    markerEnd: { type: "arrowclosed", color: "#f97316" },
  },
  {
    id: "e4",
    source: "node-headline",
    target: "node-response",
    type: "smoothstep",
    style: { stroke: "#f97316", strokeWidth: 2 },
    markerEnd: { type: "arrowclosed", color: "#f97316" },
  },
  {
    id: "e5",
    source: "node-body",
    target: "node-response",
    type: "smoothstep",
    style: { stroke: "#f97316", strokeWidth: 2 },
    markerEnd: { type: "arrowclosed", color: "#f97316" },
  },
  {
    id: "e6",
    source: "node-cta",
    target: "node-response",
    type: "smoothstep",
    style: { stroke: "#f97316", strokeWidth: 2 },
    markerEnd: { type: "arrowclosed", color: "#f97316" },
  },
];

async function main() {
  const workflow = await prisma.workflow.create({
    data: {
      userId: DEMO_USER_ID!,
      name: "Product Marketing Copy",
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
