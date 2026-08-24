import { prisma } from "../prisma";

// --- Tool 1: search_gl_entries ---
export interface SearchGlEntriesArgs {
  minAmountCents?: number;
  maxAmountCents?: number;
  dateFrom?: string;
  dateTo?: string;
  fundId?: string;
}

export async function searchGlEntries(args: SearchGlEntriesArgs) {
  const entries = await prisma.gLEntry.findMany({
    where: {
      matches: { none: {} },
      ...(args.fundId ? { fundId: args.fundId } : {}),
      ...(args.minAmountCents !== undefined || args.maxAmountCents !== undefined
        ? {
            amountCents: {
              ...(args.minAmountCents !== undefined ? { gte: args.minAmountCents } : {}),
              ...(args.maxAmountCents !== undefined ? { lte: args.maxAmountCents } : {}),
            },
          }
        : {}),
      ...(args.dateFrom || args.dateTo
        ? {
            date: {
              ...(args.dateFrom ? { gte: args.dateFrom } : {}),
              ...(args.dateTo ? { lte: args.dateTo } : {}),
            },
          }
        : {}),
    },
    take: 20,
  });

  return entries.map((e) => ({
    id: e.id,
    fundId: e.fundId,
    accountCode: e.accountCode,
    amountCents: e.amountCents,
    date: e.date,
    description: e.description,
  }));
}

// --- Tool 2: get_transaction_history ---
export async function getTransactionHistory(vendorPattern: string) {
  const transactions = await prisma.bankTransaction.findMany({
    where: {
      memo: { contains: vendorPattern, mode: "insensitive" },
      matches: { some: {} },
    },
    include: { matches: { include: { glEntry: true } } },
    take: 10,
  });

  return transactions.map((txn) => {
    const match = txn.matches[0];
    return {
      memo: txn.memo,
      amountCents: txn.amountCents,
      date: txn.date,
      matchType: match?.matchType ?? null,
      status: match?.status ?? null,
      glAccountCode: match?.glEntry?.accountCode ?? null,
      glDescription: match?.glEntry?.description ?? null,
    };
  });
}

// --- Tool 3: check_policy_flags ---
export async function checkPolicyFlags(fundId: string) {
  return {
    fundId,
    checked: false,
    message: "No policy rules are configured for this fund yet. Compliance checking is not implemented.",
  };
}

// --- Tool 4 (terminal): propose_match ---
export async function proposeMatch(
  bankTransactionId: string,
  glEntryId: string,
  confidence: number,
  reasoning: string
) {
  const glEntry = await prisma.gLEntry.findUnique({ where: { id: glEntryId } });
  if (!glEntry) {
    throw new Error(`GL entry ${glEntryId} does not exist — cannot propose a match to a fabricated ID.`);
  }

  const existingMatch = await prisma.match.findFirst({ where: { glEntryId } });
  if (existingMatch) {
    throw new Error(`GL entry ${glEntryId} is already matched to another transaction.`);
  }

  const match = await prisma.match.create({
    data: {
      bankTransactionId,
      glEntryId,
      matchType: "ai_suggested",
      confidenceScore: confidence,
      status: "pending_review",
    },
  });

  await prisma.auditLogEntry.create({
    data: {
      entityType: "Match",
      entityId: match.id,
      action: "agent_proposed_match",
      afterState: {
        matchType: "ai_suggested",
        status: "pending_review",
        bankTransactionId,
        glEntryId,
        confidenceScore: confidence,
        reasoning,
      },
    },
  });

  return { matchId: match.id, glEntryId, confidence, reasoning };
}

// --- Tool 5 (terminal): escalate_to_human ---
export async function escalateToHuman(reason: string) {
  return { escalated: true, reason };
}