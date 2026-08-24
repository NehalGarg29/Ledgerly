import { prisma } from "./prisma";

export async function getDashboardStats() {
  const [
    totalTransactions,
    reconciledCount,
    pendingReviewCount,
    unmatchedTransactions,
    accountTotals,
  ] = await Promise.all([
    prisma.bankTransaction.count(),
    prisma.match.count({ where: { status: { in: ["auto_approved", "approved"] } } }),
    prisma.match.count({ where: { status: "pending_review" } }),
    prisma.bankTransaction.findMany({
      where: { matches: { none: {} } },
      select: { id: true },
    }),
    prisma.bankTransaction.groupBy({
      by: ["accountId"],
      _sum: { amountCents: true },
    }),
  ]);

  const unmatchedCount = unmatchedTransactions.length;
  const pendingExceptionsCount = pendingReviewCount + unmatchedCount;
  const reconciliationRate =
    totalTransactions === 0 ? 0 : reconciledCount / totalTransactions;

  const accounts = accountTotals.map((a) => ({
    accountId: a.accountId,
    balanceCents: a._sum.amountCents ?? 0,
  }));

  const totalCashCents = accounts.reduce((sum, a) => sum + a.balanceCents, 0);

  return {
    reconciliationRate,
    reconciledCount,
    pendingExceptionsCount,
    totalTransactions,
    connectedAccountsCount: accounts.length,
    totalCashCents,
    accounts,
  };
}