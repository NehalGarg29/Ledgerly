import { prisma } from "./prisma";

export async function getAnalyticsStats(companyId: string) {
  const [autoApproved, pendingReview, approved, rejected, unmatchedTxns] =
    await Promise.all([
      prisma.match.count({ where: { companyId, status: "auto_approved" } }),
      prisma.match.count({ where: { companyId, status: "pending_review" } }),
      prisma.match.count({ where: { companyId, status: "approved" } }),
      prisma.match.count({ where: { companyId, status: "rejected" } }),
      prisma.bankTransaction.count({ where: { companyId, matches: { none: {} } } }),
    ]);

  const statusBreakdown = [
    { label: "Auto-matched", value: autoApproved },
    { label: "Pending Review", value: pendingReview },
    { label: "Approved", value: approved },
    { label: "Rejected", value: rejected },
    { label: "Unmatched", value: unmatchedTxns },
  ];

  const [humanApprovedFuzzy, humanRejectedFuzzy] = await Promise.all([
    prisma.match.count({
      where: { companyId, status: "approved", matchType: { in: ["fuzzy", "ai_suggested"] } },
    }),
    prisma.match.count({
      where: { companyId, status: "rejected", matchType: { in: ["fuzzy", "ai_suggested"] } },
    }),
  ]);

  const humanReview = [
    { label: "Approved", value: humanApprovedFuzzy },
    { label: "Rejected", value: humanRejectedFuzzy },
  ];

  const totalTxns =
    autoApproved + pendingReview + approved + rejected + unmatchedTxns;

  return { statusBreakdown, humanReview, totalTxns };
}