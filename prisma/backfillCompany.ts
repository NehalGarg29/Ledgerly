import { config } from "dotenv";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { generateInviteCode } from "../lib/inviteCode";

config({ path: ".env.local" });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// One-time migration helper for introducing multi-tenancy. Everything in
// this database predates the Company model, so it's all effectively one
// shared workspace already — this just makes that explicit by creating a
// single "Demo Company" and stamping every existing row (across every table
// that now has a companyId column) with its id. Safe to re-run: every step
// only touches rows where companyId is still null, so it's a no-op the
// second time.
async function main() {
  let company = await prisma.company.findFirst({ where: { name: "Demo Company" } });

  if (!company) {
    company = await prisma.company.create({
      data: { name: "Demo Company", inviteCode: generateInviteCode() },
    });
    console.log(`Created Demo Company (invite code: ${company.inviteCode}).`);
  } else {
    console.log(`Demo Company already exists (invite code: ${company.inviteCode}).`);
  }

  const companyId = company.id;

  // Raw SQL, not prisma.<model>.updateMany({ where: { companyId: null } }):
  // schema.prisma already declares companyId as required (the codebase has
  // moved on to the post-require_company state), so the generated Prisma
  // Client rejects `companyId: null` as an invalid filter at runtime even
  // though the actual Postgres column has no NOT NULL constraint yet on a
  // database that's still mid-backfill. Raw SQL talks to the real column
  // directly and sidesteps that mismatch.
  const tables = [
    { table: "User", label: "users" },
    { table: "BankTransaction", label: "bank transactions" },
    { table: "GLEntry", label: "GL entries" },
    { table: "Match", label: "matches" },
    { table: "AuditLogEntry", label: "audit log entries" },
    { table: "AgentTrace", label: "agent traces" },
    { table: "UploadBatch", label: "upload batches" },
    { table: "MatchSettings", label: "match settings" },
    { table: "Fund", label: "funds" },
    { table: "Account", label: "accounts" },
    { table: "PolicyRule", label: "policy rules" },
    { table: "ClosePeriod", label: "close periods" },
    { table: "IssuedCheck", label: "issued checks" },
    { table: "PositivePayException", label: "positive pay exceptions" },
    { table: "AnomalyFlag", label: "anomaly flags" },
  ];

  for (const { table, label } of tables) {
    const count = await prisma.$executeRawUnsafe(
      `UPDATE "${table}" SET "companyId" = $1 WHERE "companyId" IS NULL`,
      companyId
    );
    console.log(`Backfilled ${count} ${label}.`);
  }

  console.log(`\nDone. Everything existing now belongs to Demo Company (${companyId}).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
