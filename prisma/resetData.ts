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
//
// Scoped to the Demo Company only. Now that multiple companies can exist in
// the same database, an unscoped deleteMany() here would wipe every tenant's
// data, not just the demo dataset — this script is meant for resetting the
// shared demo/dev workspace, never for touching real customer data.
async function main() {
  const company = await prisma.company.findFirst({ where: { name: "Demo Company" } });
  if (!company) {
    console.log("No Demo Company found — nothing to wipe.");
    return;
  }
  const companyId = company.id;

  const counts = {
    auditLog: (await prisma.auditLogEntry.deleteMany({ where: { companyId } })).count,
    agentTraces: (await prisma.agentTrace.deleteMany({ where: { companyId } })).count,
    matches: (await prisma.match.deleteMany({ where: { companyId } })).count,
    bankTransactions: (await prisma.bankTransaction.deleteMany({ where: { companyId } })).count,
    glEntries: (await prisma.gLEntry.deleteMany({ where: { companyId } })).count,
    uploadBatches: (await prisma.uploadBatch.deleteMany({ where: { companyId } })).count,
  };

  console.log("Wiped Demo Company data:", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });