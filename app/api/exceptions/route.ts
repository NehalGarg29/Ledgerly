import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export async function GET() {
  const pendingMatches = await prisma.match.findMany({
    where: { status: "pending_review" },
    include: {
      bankTransaction: true,
      glEntry: true,
    },
  });

  const unmatchedTransactions = await prisma.bankTransaction.findMany({
    where: { matches: { none: {} } },
  });

  const exceptions = [
    ...pendingMatches.map((match) => ({
      id: match.id,
      bankTransaction: match.bankTransaction,
      glEntry: match.glEntry,
      matchType: match.matchType,
      confidenceScore: match.confidenceScore,
      kind: "pending_review" as const,
    })),
    ...unmatchedTransactions.map((txn) => ({
      id: txn.id,
      bankTransaction: txn,
      glEntry: null,
      matchType: null,
      confidenceScore: null,
      kind: "unmatched" as const,
    })),
  ];

  return NextResponse.json({ exceptions });
}