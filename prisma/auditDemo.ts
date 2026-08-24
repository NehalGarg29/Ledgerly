import "dotenv/config";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function getStateAtTime(entityType: string, entityId: string, asOf: Date) {
  const entries = await prisma.auditLogEntry.findMany({
    where: {
      entityType,
      entityId,
      timestamp: { lte: asOf },
    },
    orderBy: { timestamp: "asc" },
  });

  let state: Record<string, unknown> = {};
  for (const entry of entries) {
    if (entry.afterState && typeof entry.afterState === "object") {
      state = { ...state, ...(entry.afterState as Record<string, unknown>) };
    }
  }
  return state;
}

async function main() {
  const entityId = "demo-match-1";

  await prisma.auditLogEntry.createMany({
    data: [
      {
        entityType: "Match",
        entityId,
        action: "created",
        afterState: { status: "pending_review", confidenceScore: 0.82 },
        timestamp: new Date("2026-08-20T10:00:00Z"),
      },
      {
        entityType: "Match",
        entityId,
        action: "reviewed",
        beforeState: { status: "pending_review" },
        afterState: { status: "approved" },
        timestamp: new Date("2026-08-20T14:30:00Z"),
      },
    ],
  });

  const stateAtNoon = await getStateAtTime("Match", entityId, new Date("2026-08-20T12:00:00Z"));
  console.log("State at noon (before review):", stateAtNoon);

  const stateAt3pm = await getStateAtTime("Match", entityId, new Date("2026-08-20T15:00:00Z"));
  console.log("State at 3pm (after review):", stateAt3pm);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });