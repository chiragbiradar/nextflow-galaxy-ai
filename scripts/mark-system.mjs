import { PrismaClient } from "../app/generated/prisma/index.js";

const prisma = new PrismaClient();
const name = process.argv[2];
if (!name) { console.error("Usage: node scripts/mark-system.mjs <workflow-name>"); process.exit(1); }

const wf = await prisma.workflow.findFirst({ where: { name: { contains: name, mode: "insensitive" } } });
if (!wf) { console.error("Not found:", name); process.exit(1); }

await prisma.workflow.update({ where: { id: wf.id }, data: { isSystem: true } });
console.log("Marked as system:", wf.name, `(${wf.id})`);
await prisma.$disconnect();
