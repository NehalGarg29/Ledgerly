import { prisma } from "./prisma";
import { formatCents } from "./format";

const ROUND_NUMBER_UNIT_CENTS = 50000; // $500
const ROUND_NUMBER_MIN_CENTS = 100000; // $1,000
const DUPLICATE_WINDOW_DAYS = 3;
const OUTLIER_Z_THRESHOLD = 2.5;
const MIN_TRANSACTIONS_FOR_STATS = 5;

type AnomalyType = "round_number" | "duplicate_transaction" | "statistical_outlier";

type NewFlag = {
  bankTransactionId: string;
  anomalyType: AnomalyType;
  severity: number;
  explanation: string;
};

function daysBetween(a: string, b: string): number {
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) / (1000 * 60 * 60 * 24);
}

export type AnomalyScanResult = { flagged: number; skipped: number };

// Three explainable, math-backed checks over bank transactions — deliberately
// not a black-box model. Every flag's explanation shows the actual numbers
// behind it, same philosophy as the fuzzy-match confidence breakdown
// elsewhere in this app. Safe to call repeatedly: only ever creates flags
// for (transaction, anomalyType) pairs that don't already have one.
export async function detectAnomalies(): Promise<AnomalyScanResult> {
  const [transactions, existingFlags] = await Promise.all([
    prisma.bankTransaction.findMany({ orderBy: { date: "asc" } }),
    prisma.anomalyFlag.findMany({ select: { bankTransactionId: true, anomalyType: true } }),
  ]);

  const alreadyFlagged = new Set(existingFlags.map((f) => `${f.bankTransactionId}:${f.anomalyType}`));
  const toCreate: NewFlag[] = [];

  function markIfNew(txnId: string, type: AnomalyType, severity: number, explanation: string) {
    const key = `${txnId}:${type}`;
    if (alreadyFlagged.has(key)) return;
    alreadyFlagged.add(key);
    toCreate.push({ bankTransactionId: txnId, anomalyType: type, severity, explanation });
  }

  // 1. Round-dollar amounts — genuine vendor invoices rarely land on an
  // exact multiple of $500; fabricated or manually-keyed entries often do.
  for (const txn of transactions) {
    const abs = Math.abs(txn.amountCents);
    if (abs >= ROUND_NUMBER_MIN_CENTS && abs % ROUND_NUMBER_UNIT_CENTS === 0) {
      markIfNew(
        txn.id,
        "round_number",
        1,
        `${formatCents(abs)} is an exact multiple of $500 — round-dollar amounts are uncommon in genuine vendor invoices and can indicate a fabricated or manually-keyed entry.`
      );
    }
  }

  // 2. Duplicate transactions — same account, same amount, dates close
  // together. Catches double-payments and accidental double-uploads.
  const byAccountAndAmount = new Map<string, typeof transactions>();
  for (const txn of transactions) {
    const key = `${txn.accountId}:${txn.amountCents}`;
    const list = byAccountAndAmount.get(key) ?? [];
    list.push(txn);
    byAccountAndAmount.set(key, list);
  }
  for (const list of byAccountAndAmount.values()) {
    if (list.length < 2) continue;
    const sorted = [...list].sort((a, b) => a.date.localeCompare(b.date));
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      const gap = daysBetween(prev.date, curr.date);
      if (gap <= DUPLICATE_WINDOW_DAYS) {
        markIfNew(
          curr.id,
          "duplicate_transaction",
          1,
          `${formatCents(Math.abs(curr.amountCents))} on ${curr.accountId} matches another transaction dated ${prev.date} (${gap.toFixed(0)} day(s) apart) — possible duplicate payment or duplicate upload.`
        );
      }
    }
  }

  // 3. Statistical outliers — per account, flag transactions more than
  // 2.5 standard deviations from that account's own historical mean.
  // Skipped for accounts with too few transactions to make the stats
  // meaningful.
  const byAccount = new Map<string, typeof transactions>();
  for (const txn of transactions) {
    const list = byAccount.get(txn.accountId) ?? [];
    list.push(txn);
    byAccount.set(txn.accountId, list);
  }
  for (const [accountId, list] of byAccount.entries()) {
    if (list.length < MIN_TRANSACTIONS_FOR_STATS) continue;
    const amounts = list.map((t) => Math.abs(t.amountCents));
    const mean = amounts.reduce((s, a) => s + a, 0) / amounts.length;
    const variance = amounts.reduce((s, a) => s + (a - mean) ** 2, 0) / amounts.length;
    const stdev = Math.sqrt(variance);
    if (stdev === 0) continue;

    for (const txn of list) {
      const abs = Math.abs(txn.amountCents);
      const z = (abs - mean) / stdev;
      if (z > OUTLIER_Z_THRESHOLD) {
        markIfNew(
          txn.id,
          "statistical_outlier",
          z,
          `${accountId}'s transactions typically run ${formatCents(Math.round(mean))} ± ${formatCents(Math.round(stdev))}; this one is ${formatCents(abs)}, a ${z.toFixed(1)}σ outlier.`
        );
      }
    }
  }

  if (toCreate.length === 0) {
    return { flagged: 0, skipped: transactions.length };
  }

  await prisma.anomalyFlag.createMany({ data: toCreate, skipDuplicates: true });

  await prisma.auditLogEntry.createMany({
    data: toCreate.map((f) => ({
      entityType: "BankTransaction",
      entityId: f.bankTransactionId,
      action: "anomaly_flagged",
      afterState: { anomalyType: f.anomalyType, severity: f.severity, explanation: f.explanation },
    })),
  });

  return { flagged: toCreate.length, skipped: transactions.length - toCreate.length };
}
