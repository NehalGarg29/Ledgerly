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
      status: match ? match.status : "unmatched",
      confidenceScore: match ? match.confidenceScore : null,
      glEntry: match?.glEntry
        ? {
            accountCode: match.glEntry.accountCode,
            description: match.glEntry.description,
          }
        : null,
    };
  });
}