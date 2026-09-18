import { config } from "dotenv";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { generateInviteCode } from "../lib/inviteCode";

config({ path: ".env.local" });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Everything below lives inside one shared "Demo Company" — this script is
  // meant to set up (or reset) the demo/dev workspace, not touch any other
  // company that might exist in the same database.
  let company = await prisma.company.findFirst({ where: { name: "Demo Company" } });
  if (!company) {
    company = await prisma.company.create({
      data: { name: "Demo Company", inviteCode: generateInviteCode() },
    });
    console.log(`Created Demo Company (invite code: ${company.inviteCode}).`);
  }
  const companyId = company.id;

  // Only seed the demo GL entries on a database that doesn't have real data
  // yet. This used to unconditionally wipe every GL entry on every run,
  // which — combined with the Match.glEntryId foreign key's default
  // ON DELETE SET NULL behavior — silently orphaned any real matches you'd
  // created since the last seed, leaving zombie pending-review matches with
  // no candidate GL entry. Re-running seed.ts (e.g. after a schema change)
  // should never destroy live reconciliation data.
  const existingGlCount = await prisma.gLEntry.count({ where: { companyId } });
  if (existingGlCount === 0) {
    await prisma.gLEntry.createMany({
      data: [
        { fundId: "100", accountCode: "100-4400", amountCents: 1245000, date: "2026-08-12", description: "Wire transfer receipt" },
        { fundId: "100", accountCode: "100-5100", amountCents: 319850, date: "2026-08-14", description: "Payroll expense batch" },
        { fundId: "200", accountCode: "200-4100", amountCents: 500000, date: "2026-08-15", description: "Tax receipt" },
        { fundId: "100", accountCode: "100-6200", amountCents: -15050, date: "2026-08-16", description: "Bank service charge" },
        { fundId: "200", accountCode: "200-4100", amountCents: 500000, date: "2026-08-17", description: "Tax collection Q3" },
        { fundId: "100", accountCode: "100-6300", amountCents: -220000, date: "2026-08-18", description: "Utility vendor payment" },
        { fundId: "100", accountCode: "100-4500", amountCents: 75000, date: "2026-08-19", description: "Rebate received" },
        { fundId: "100", accountCode: "100-4200", amountCents: 215000, date: "2026-08-24", description: "Grant disbursement (est.)" },
        { fundId: "200", accountCode: "200-4300", amountCents: 100000, date: "2026-08-22", description: "Interest income" },
        { fundId: "100", accountCode: "100-4600", amountCents: 180000, date: "2026-08-17", description: "Vendor refund" },
        { fundId: "400", accountCode: "400-6100", amountCents: -12500, date: "2026-08-24", description: "Bank fee" },
      ].map((entry) => ({ ...entry, companyId })),
    });
    console.log("Seeded GL entries.");
  } else {
    console.log(`Skipped GL entry seeding — ${existingGlCount} GL entries already exist.`);
  }

  const passwordHash = await bcrypt.hash("ledgerly", 10);
  const demoUsers: { email: string; role: "admin" | "analyst" | "viewer" }[] = [
    { email: "admin@ledgerly.demo", role: "admin" },
    { email: "analyst@ledgerly.demo", role: "analyst" },
    { email: "viewer@ledgerly.demo", role: "viewer" },
  ];

  for (const u of demoUsers) {
    await prisma.user.upsert({
      where: { email: u.email },
      create: { email: u.email, passwordHash, role: u.role, companyId },
      update: { passwordHash, role: u.role },
    });
  }

  console.log("Seeded demo users (password: ledgerly).");

  const funds: { code: string; name: string }[] = [
    { code: "100", name: "General Fund" },
    { code: "200", name: "Special Revenue Fund" },
    { code: "400", name: "Capital Projects Fund" },
  ];

  for (const f of funds) {
    await prisma.fund.upsert({
      where: { companyId_code: { companyId, code: f.code } },
      create: { code: f.code, name: f.name, companyId },
      update: { name: f.name },
    });
  }

  console.log("Seeded funds.");

  // Category headers (parents) — nothing posts directly to these, they just
  // roll up their children's balances.
  const categories: { code: string; name: string; type: "revenue" | "expense" }[] = [
    { code: "4000", name: "Revenue", type: "revenue" },
    { code: "5000", name: "Payroll Expenses", type: "expense" },
    { code: "6000", name: "Operating Expenses", type: "expense" },
  ];

  for (const c of categories) {
    await prisma.account.upsert({
      where: { companyId_code: { companyId, code: c.code } },
      create: { code: c.code, name: c.name, type: c.type, companyId },
      update: { name: c.name, type: c.type },
    });
  }

  const accounts: { code: string; name: string; type: "revenue" | "expense"; parentCode: string }[] = [
    { code: "100-4400", name: "Wire Transfer Receipts", type: "revenue", parentCode: "4000" },
    { code: "200-4100", name: "Tax Receipts", type: "revenue", parentCode: "4000" },
    { code: "100-4500", name: "Rebates Received", type: "revenue", parentCode: "4000" },
    { code: "100-4200", name: "Grant Disbursements", type: "revenue", parentCode: "4000" },
    { code: "200-4300", name: "Interest Income", type: "revenue", parentCode: "4000" },
    { code: "100-4600", name: "Vendor Refunds", type: "revenue", parentCode: "4000" },
    { code: "100-5100", name: "Payroll Expense", type: "expense", parentCode: "5000" },
    { code: "100-6200", name: "Bank Service Charges", type: "expense", parentCode: "6000" },
    { code: "100-6300", name: "Utility Vendor Payments", type: "expense", parentCode: "6000" },
    { code: "400-6100", name: "Bank Fees", type: "expense", parentCode: "6000" },
  ];

  for (const a of accounts) {
    const parent = await prisma.account.findFirst({ where: { companyId, code: a.parentCode } });
    await prisma.account.upsert({
      where: { companyId_code: { companyId, code: a.code } },
      create: { code: a.code, name: a.name, type: a.type, parentAccountId: parent?.id, companyId },
      update: { name: a.name, type: a.type, parentAccountId: parent?.id },
    });
  }

  console.log("Seeded chart of accounts.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
