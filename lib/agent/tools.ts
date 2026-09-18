import { prisma } from "../prisma";
import { checkPolicyFlags as evaluatePolicy } from "../policyEngine";

// --- Tool 1: search_gl_entries ---
export interface SearchGlEntriesArgs {
  minAmountCents?: number;
  maxAmountCents?: number;
  dateFrom?: string;
  dateTo?: string;
  fundId?: string;
}

export async function searchGlEntries(companyId: string, args: SearchGlEntriesArgs) {
  const entries = await prisma.gLEntry.findMany({
    where: {
      companyId,
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
export async function getTransactionHistory(companyId: string, vendorPattern: string) {
  const transactions = await prisma.bankTransaction.findMany({
    where: {
      companyId,
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
export async function checkPolicyFlags(
  companyId: string,
  fundId: string,
  accountCode?: string,
  amountCents?: number
) {
  const { flags, blocked } = await evaluatePolicy(companyId, fundId, accountCode, amountCents);
  if (flags.length === 0) {
    return { fundId, blocked: false, flags: [], message: "No policy flags for this fund/account/amount." };
  }
  return { fundId, blocked, flags };
}

// --- Tool 4 (terminal): propose_match ---
export async function proposeMatch(
  companyId: string,
  bankTransactionId: string,
  glEntryId: string,
  confidence: number,
  reasoning: string
) {
  const glEntry = await prisma.gLEntry.findFirst({ where: { id: glEntryId, companyId } });
  if (!glEntry) {
    throw new Error(`GL entry ${glEntryId} does not exist — cannot propose a match to a fabricated ID.`);
  }

  const existingMatch = await prisma.match.findFirst({ where: { glEntryId, companyId } });
  if (existingMatch) {
    throw new Error(`GL entry ${glEntryId} is already matched to another transaction.`);
  }

  // Policy is enforced here regardless of whether the agent bothered to call
  // check_policy_flags itself — an LLM tool call is advisory, this is not.
  const { flags, blocked } = await evaluatePolicy(
    companyId,
    glEntry.fundId,
    glEntry.accountCode,
    glEntry.amountCents
  );
  if (blocked) {
    const blockingMessages = flags
      .filter((f) => f.severity === "block")
      .map((f) => f.message)
      .join(" ");
    throw new Error(`Policy violation — cannot propose this match: ${blockingMessages}`);
  }

  const match = await prisma.match.create({
    data: {
      bankTransactionId,
      glEntryId,
      matchType: "ai_suggested",
      confidenceScore: confidence,
      status: "pending_review",
      companyId,
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
        policyFlags: flags,
      },
      companyId,
    },
  });

  return { matchId: match.id, glEntryId, confidence, reasoning, policyFlags: flags };
}

// --- Tool 5 (terminal): escalate_to_human ---
export async function escalateToHuman(reason: string) {
  return { escalated: true, reason };
}