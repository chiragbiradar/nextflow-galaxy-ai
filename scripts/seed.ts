import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { SAMPLE_NODES, SAMPLE_EDGES, SAMPLE_WORKFLOW_NAME } from "../lib/sampleWorkflow";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

// SEED_USER_ID is optional — omit to create a system workflow visible to all users
const userId = process.env.SEED_USER_ID ?? "system";

async function main() {
  const workflow = await prisma.workflow.create({
    data: {
      userId,
      name: SAMPLE_WORKFLOW_NAME,
      isSystem: true,
      nodes: JSON.parse(JSON.stringify(SAMPLE_NODES)),
      edges: JSON.parse(JSON.stringify(SAMPLE_EDGES)),
    },
  });

  console.log(`Created workflow: ${workflow.id} — "${workflow.name}"`);
  console.log(`Open: http://localhost:3000/workflows/${workflow.id}/canvas`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
