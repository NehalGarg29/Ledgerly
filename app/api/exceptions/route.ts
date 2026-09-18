import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { getCompanyIdFromRequest } from "../../../lib/getRoleFromRequest";

export async function GET(request: NextRequest) {
  const companyId = getCompanyIdFromRequest(request);
  if (!companyId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const pendingMatches = await prisma.match.findMany({
    where: { status: "pending_review", companyId },
    include: {
      bankTransaction: true,
      glEntry: true,
    },
  });

  const unmatchedTransactions = await prisma.bankTransaction.findMany({
    where: { companyId, matches: { none: {} } },
  });

  const exceptions = [
    ...pendingMatches.map((match) => ({
      id: match.id,
      bankTransaction: match.bankTransaction,
      glEntry: match.glEntry,
      matchType: match.matchType,
      confidenceScore: match.confidenceScore,
      kind: "pending_review" as const,
      createdAt: match.createdAt,
    })),
    ...unmatchedTransactions.map((txn) => ({
      id: txn.id,
      bankTransaction: txn,
      glEntry: null,
      matchType: null,
      confidenceScore: null,
      kind: "unmatched" as const,
      createdAt: txn.createdAt,
    })),
  ];

  return NextResponse.json({ exceptions });
}