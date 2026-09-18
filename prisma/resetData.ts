import { config } from "dotenv";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

config({ path: ".env.local" });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Wipes every reconciliation table so you can start fresh, without touching
// migrations or dropping the schema itself. Deletes in FK-safe order: the
// audit log and agent traces first (they reference transactions/matches),
// then matches, then the two source tables, then upload batches last (since
// bank transactions and GL entries point to their batch, not the reverse).
async function main() {
  const counts = {
    auditLog: (await prisma.auditLogEntry.deleteMany()).count,
    agentTraces: (await prisma.agentTrace.deleteMany()).count,
    matches: (await prisma.match.deleteMany()).count,
    bankTransactions: (await prisma.bankTransaction.deleteMany()).count,
    glEntries: (await prisma.gLEntry.deleteMany()).count,
    uploadBatches: (await prisma.uploadBatch.deleteMany()).count,
  };

  console.log("Wiped:", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });