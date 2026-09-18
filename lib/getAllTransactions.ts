import { prisma } from "./prisma";

type StatusFilter =
  | "all"
  | "auto_approved"
  | "pending_review"
  | "approved"
  | "rejected"
  | "unmatched";

export async function getAllTransactions({
  status,
  skip = 0,
  take,
}: {
  status?: string;
  skip?: number;
  take?: number;
} = {}) {
  const normalizedStatus = (status as StatusFilter) || "all";

  const where =
    normalizedStatus === "all"
      ? {}
      : normalizedStatus === "unmatched"
        ? { matches: { none: {} } }
        : {
            matches: {
              some: {
                status: normalizedStatus as "auto_approved" | "pending_review" | "approved" | "rejected",
              },
            },
          };

  const [rows, totalCount] = await Promise.all([
    prisma.bankTransaction.findMany({
      where,
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
      skip,
      take,
      include: {
        matches: {
          include: { glEntry: true },
        },
      },
    }),
    prisma.bankTransaction.count({ where }),
  ]);

  const transactions = rows.map((txn) => {
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

  return { transactions, totalCount };
}

export async function getTransactionsSummary() {
  const [totalCount, reconciledCount, inflow, outflow] = await Promise.all([
    prisma.bankTransaction.count(),
    prisma.match.count({ where: { status: { in: ["auto_approved", "approved"] } } }),
    prisma.bankTransaction.aggregate({
      _sum: { amountCents: true },
      where: { amountCents: { gt: 0 } },
    }),
    prisma.bankTransaction.aggregate({
      _sum: { amountCents: true },
      where: { amountCents: { lt: 0 } },
    }),
  ]);

  const reconciliationRate = totalCount === 0 ? 0 : reconciledCount / totalCount;

  return {
    totalCount,
    reconciledCount,
    reconciliationRate,
    inflowCents: inflow._sum.amountCents ?? 0,
    outflowCents: Math.abs(outflow._sum.amountCents ?? 0),
  };
}
