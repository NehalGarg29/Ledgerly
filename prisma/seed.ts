import "dotenv/config";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.gLEntry.deleteMany();

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
    ],
  });

  console.log("Seeded GL entries.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });