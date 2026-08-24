import { prisma } from "./prisma";

export async function getAllTransactions() {
  const transactions = await prisma.bankTransaction.findMany({
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    include: {
      matches: {
        include: { glEntry: true },
      },
    },
  });

  return transactions.map((txn) => {
    const match = txn.matches[0] ?? null;
    return {
      id: txn.id,
      date: txn.date,
      accountId: txn.accountId,
      amountCents: txn.amountCents,
      memo: txn.memo,
      sourceFormat: txn.sourceFormat,
      createdAt: txn.createdAt.toISOString(),
      status: match ? match.status : "unmatched",
      matchType: match ? match.matchType : null,
      confidenceScore: match ? match.confidenceScore : null,
      glEntry: match?.glEntry
        ? {
            id: match.glEntry.id,
            fundId: match.glEntry.fundId,
            accountCode: match.glEntry.accountCode,
            amountCents: match.glEntry.amountCents,
            date: match.glEntry.date,
            description: match.glEntry.description,
          }
        : null,
    };
  });
}