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

  const results = await prisma.$transaction([
    prisma.user.updateMany({ where: { companyId: null }, data: { companyId } }),
    prisma.bankTransaction.updateMany({ where: { companyId: null }, data: { companyId } }),
    prisma.gLEntry.updateMany({ where: { companyId: null }, data: { companyId } }),
    prisma.match.updateMany({ where: { companyId: null }, data: { companyId } }),
    prisma.auditLogEntry.updateMany({ where: { companyId: null }, data: { companyId } }),
    prisma.agentTrace.updateMany({ where: { companyId: null }, data: { companyId } }),
    prisma.uploadBatch.updateMany({ where: { companyId: null }, data: { companyId } }),
    prisma.matchSettings.updateMany({ where: { companyId: null }, data: { companyId } }),
    prisma.fund.updateMany({ where: { companyId: null }, data: { companyId } }),
    prisma.account.updateMany({ where: { companyId: null }, data: { companyId } }),
    prisma.policyRule.updateMany({ where: { companyId: null }, data: { companyId } }),
    prisma.closePeriod.updateMany({ where: { companyId: null }, data: { companyId } }),
    prisma.issuedCheck.updateMany({ where: { companyId: null }, data: { companyId } }),
    prisma.positivePayException.updateMany({ where: { companyId: null }, data: { companyId } }),
    prisma.anomalyFlag.updateMany({ where: { companyId: null }, data: { companyId } }),
  ]);

  const labels = [
    "users", "bank transactions", "GL entries", "matches", "audit log entries",
    "agent traces", "upload batches", "match settings", "funds", "accounts",
    "policy rules", "close periods", "issued checks", "positive pay exceptions",
    "anomaly flags",
  ];

  labels.forEach((label, i) => {
    console.log(`Backfilled ${results[i].count} ${label}.`);
  });

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
