import { prisma } from "./prisma";

function daysBetween(dateA: string, dateB: string): number {
  const a = new Date(dateA).getTime();
  const b = new Date(dateB).getTime();
  return Math.abs(a - b) / (1000 * 60 * 60 * 24);
}

function calculateConfidence(bankAmountCents: number, glAmountCents: number, daysApart: number): number {
  const dateScore = Math.max(0, 1 - daysApart * 0.15);

  const amountDiffCents = Math.abs(bankAmountCents - glAmountCents);
  const amountDiffRatio = amountDiffCents / Math.abs(bankAmountCents);
  const amountScore = Math.max(0, 1 - amountDiffRatio * 5);

  const confidence = amountScore * 0.7 + dateScore * 0.3;
  return Math.round(confidence * 100) / 100;
}

export async function runExactMatchPass(): Promise<number> {
  const unmatchedBankTxns = await prisma.bankTransaction.findMany({
    where: { matches: { none: {} } },
  });
  const unmatchedGLEntries = await prisma.gLEntry.findMany({
    where: { matches: { none: {} } },
  });

  const usedGLEntryIds = new Set<string>();
  let matchCount = 0;

  for (const txn of unmatchedBankTxns) {
    const candidate = unmatchedGLEntries.find(
      (gl) =>
        !usedGLEntryIds.has(gl.id) &&
        gl.amountCents === txn.amountCents &&
        gl.date === txn.date
    );

    if (candidate) {
      const match = await prisma.match.create({
        data: {
          bankTransactionId: txn.id,
          glEntryId: candidate.id,
          matchType: "exact",
          confidenceScore: 1.0,
          status: "auto_approved",
        },
      });

      await prisma.auditLogEntry.create({
        data: {
          entityType: "Match",
          entityId: match.id,
          action: "auto_matched",
          afterState: {
            matchType: "exact",
            status: "auto_approved",
            bankTransactionId: txn.id,
            glEntryId: candidate.id,
          },
        },
      });

      usedGLEntryIds.add(candidate.id);
      matchCount++;
    }
  }

  return matchCount;
}

export async function runFuzzyMatchPass(): Promise<number> {
  const unmatchedBankTxns = await prisma.bankTransaction.findMany({
    where: { matches: { none: {} } },
  });
  const unmatchedGLEntries = await prisma.gLEntry.findMany({
    where: { matches: { none: {} } },
  });

  const usedGLEntryIds = new Set<string>();
  const AUTO_APPROVE_THRESHOLD = 0.9;
  const SUGGEST_THRESHOLD = 0.5;
  let matchCount = 0;

  for (const txn of unmatchedBankTxns) {
    let bestCandidate: (typeof unmatchedGLEntries)[number] | null = null;
    let bestConfidence = 0;

    for (const gl of unmatchedGLEntries) {
      if (usedGLEntryIds.has(gl.id)) continue;

      const daysApart = daysBetween(txn.date, gl.date);
      if (daysApart > 7) continue;

      const confidence = calculateConfidence(txn.amountCents, gl.amountCents, daysApart);
      if (confidence > bestConfidence) {
        bestConfidence = confidence;
        bestCandidate = gl;
      }
    }

    if (bestCandidate && bestConfidence >= SUGGEST_THRESHOLD) {
      const status = bestConfidence >= AUTO_APPROVE_THRESHOLD ? "auto_approved" : "pending_review";

      const match = await prisma.match.create({
        data: {
          bankTransactionId: txn.id,
          glEntryId: bestCandidate.id,
          matchType: "fuzzy",
          confidenceScore: bestConfidence,
          status,
        },
      });

      await prisma.auditLogEntry.create({
        data: {
          entityType: "Match",
          entityId: match.id,
          action: status === "auto_approved" ? "auto_matched" : "flagged_for_review",
          afterState: {
            matchType: "fuzzy",
            status,
            confidenceScore: bestConfidence,
            bankTransactionId: txn.id,
            glEntryId: bestCandidate.id,
          },
        },
      });

      usedGLEntryIds.add(bestCandidate.id);
      matchCount++;
    }
  }

  return matchCount;
}