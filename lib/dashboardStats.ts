import { prisma } from "./prisma";

export async function getDashboardStats(companyId: string) {
  const [
    totalTransactions,
    reconciledCount,
    pendingReviewCount,
    unmatchedTransactions,
    accountTotals,
  ] = await Promise.all([
    prisma.bankTransaction.count({ where: { companyId } }),
    prisma.match.count({ where: { companyId, status: { in: ["auto_approved", "approved"] } } }),
    prisma.match.count({ where: { companyId, status: "pending_review" } }),
    prisma.bankTransaction.findMany({
      where: { companyId, matches: { none: {} } },
      select: { id: true },
    }),
    prisma.bankTransaction.groupBy({
      by: ["accountId"],
      where: { companyId },
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