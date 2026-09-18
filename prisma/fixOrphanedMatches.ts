import { config } from "dotenv";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

config({ path: ".env.local" });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// One-off cleanup: removes pending-review matches whose GL entry was deleted
// out from under them (glEntryId got nulled by the ON DELETE SET NULL
// foreign key, most likely from re-running seed.ts on a database that
// already had real matches in it). Deleting the match — rather than leaving
// it stranded — returns the bank transaction to "unmatched" so it can be
// investigated or manually reviewed again.
async function main() {
  const result = await prisma.match.deleteMany({
    where: { status: "pending_review", glEntryId: null },
  });
  console.log(
    `Removed ${result.count} orphaned pending-review match(es). Their transactions are unmatched again.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
