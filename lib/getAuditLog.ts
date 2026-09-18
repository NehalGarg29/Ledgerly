import { prisma } from "./prisma";
import { formatCents } from "./format";

export const ACTION_LABELS: Record<string, string> = {
  agent_proposed_match: "AI proposed a match",
  match_approved: "Match approved",
  match_rejected: "Match rejected",
  manual_match_created: "Manually matched",
  manual_gl_entry_created: "GL entry added manually",
  match_thresholds_updated: "Match thresholds updated",
  upload_batch_voided: "Upload batch voided",
  fund_created: "Fund created",
  fund_updated: "Fund updated",
  account_created: "Account created",
  account_updated: "Account updated",
  policy_rule_created: "Policy rule created",
  policy_rule_updated: "Policy rule updated",
  policy_blocked_approval: "Blocked by policy",
  period_closed: "Month closed",
  period_reopened: "Month reopened",
  check_issued: "Check issued",
  check_voided: "Check voided",
  check_cleared: "Check cleared",
  positive_pay_flagged: "Positive pay flagged",
  positive_pay_paid: "Positive pay: paid",
  positive_pay_returned: "Positive pay: returned",
  anomaly_flagged: "Anomaly flagged",
  anomaly_dismissed: "Anomaly dismissed",
  anomaly_confirmed: "Anomaly confirmed",
};

export type AuditLogRow = {
  id: string;
  timestamp: string;
  action: string;
  entityType: string;
  summary: string;
};

export async function getAuditLog({
  companyId,
  skip = 0,
  take = 50,
}: { companyId: string; skip?: number; take?: number }): Promise<{ rows: AuditLogRow[]; totalCount: number }> {
  const [entries, totalCount] = await Promise.all([
    prisma.auditLogEntry.findMany({
      where: { companyId },
      orderBy: { timestamp: "desc" },
      skip,
      take,
    }),
    prisma.auditLogEntry.count({ where: { companyId } }),
  ]);

  const matchIds = entries.filter((e) => e.entityType === "Match").map((e) => e.entityId);
  const matches = await prisma.match.findMany({
    where: { id: { in: matchIds }, companyId },
    include: { bankTransaction: true, glEntry: true },
  });
  const matchMap = new Map(matches.map((m) => [m.id, m]));

  const rows = entries.map((e) => {
    const after = (e.afterState ?? {}) as Record<string, unknown>;
    let summary = "—";

    if (e.entityType === "Match") {
      const match = matchMap.get(e.entityId);
      if (match) {
        summary = `${formatCents(match.bankTransaction.amountCents)} · ${match.bankTransaction.accountId} · ${match.bankTransaction.date}`;
        if (match.glEntry) summary += ` → ${match.glEntry.accountCode} (${match.glEntry.description})`;
        if (typeof after.confidenceScore === "number") {
          summary += ` · ${(after.confidenceScore * 100).toFixed(0)}% confidence`;
        }
        if (typeof after.reason === "string" && after.reason) {
          summary += ` — "${after.reason}"`;
        }
      }
    } else if (e.entityType === "GLEntry") {
      summary = `${formatCents(Number(after.amountCents ?? 0))} · ${after.accountCode ?? ""} — ${after.description ?? ""}`;
    } else if (e.entityType === "MatchSettings") {
      summary = `Auto-approve ≥ ${((Number(after.autoApproveThreshold) || 0) * 100).toFixed(0)}%, suggest ≥ ${((Number(after.suggestThreshold) || 0) * 100).toFixed(0)}%`;
    } else if (e.entityType === "UploadBatch") {
      const before = (e.beforeState ?? {}) as Record<string, unknown>;
      summary = `"${before.filename ?? "unknown file"}" · removed ${after.removedBankTransactions ?? 0} txns, ${after.removedGlEntries ?? 0} GL entries`;
    } else if (e.entityType === "Fund") {
      summary = `${after.code ?? ""} — ${after.name ?? ""}`;
      if (after.parentCode) summary += ` (under ${after.parentCode})`;
      if (typeof after.isActive === "boolean") summary += after.isActive ? "" : " · deactivated";
    } else if (e.entityType === "Account") {
      summary = `${after.code ?? ""} — ${after.name ?? ""}${after.type ? ` (${after.type})` : ""}`;
      if (after.parentCode) summary += ` (under ${after.parentCode})`;
      if (typeof after.isActive === "boolean") summary += after.isActive ? "" : " · deactivated";
    } else if (e.entityType === "PolicyRule") {
      if (e.action === "policy_rule_updated") {
        summary = after.isActive === false ? "Deactivated" : "Activated";
      } else {
        summary = `${after.name ?? ""} (${after.ruleType ?? ""}, ${after.severity ?? ""}${after.fundCode ? `, fund ${after.fundCode}` : ", all funds"})`;
      }
    } else if (e.action === "policy_blocked_approval") {
      const flags = Array.isArray(after.flags) ? (after.flags as { message: string }[]) : [];
      summary = flags.map((f) => f.message).join(" ") || "Approval blocked by policy.";
    } else if (e.entityType === "ClosePeriod") {
      summary = `${after.period ?? ""}`;
    } else if (e.entityType === "IssuedCheck") {
      if (e.action === "check_issued") {
        summary = `#${after.checkNumber ?? ""} — ${after.payee ?? ""} — ${formatCents(Number(after.amountCents ?? 0))}`;
      } else {
        summary = `#${after.checkNumber ?? ""} — ${after.status ?? ""}`;
      }
    } else if (e.action === "positive_pay_flagged") {
      const type = String(after.exceptionType ?? "").replace(/_/g, " ");
      summary = `${type} — check #${after.checkNumber ?? "?"} — ${formatCents(Number(after.amountCents ?? after.actualAmountCents ?? 0))}`;
    } else if (e.entityType === "PositivePayException") {
      summary = after.reason ? `${after.status} — "${after.reason}"` : String(after.status ?? "");
    } else if (e.action === "anomaly_flagged") {
      summary = String(after.explanation ?? "");
    } else if (e.entityType === "AnomalyFlag") {
      summary = after.reason ? `${after.status} — "${after.reason}"` : String(after.status ?? "");
    }

    return {
      id: e.id,
      timestamp: e.timestamp.toISOString(),
      action: e.action,
      entityType: e.entityType,
      summary,
    };
  });

  return { rows, totalCount };
}

const CATEGORY_LABELS: Record<string, string> = {
  Match: "Matching",
  GLEntry: "GL entries",
  MatchSettings: "Settings",
  UploadBatch: "Uploads",
  Fund: "Chart of accounts",
  Account: "Chart of accounts",
  PolicyRule: "Policy",
  ClosePeriod: "Month-end close",
  IssuedCheck: "Positive pay",
  PositivePayException: "Positive pay",
  AnomalyFlag: "Anomalies",
};

export async function getAuditLogSummary(companyId: string) {
  const [totalCount, last24hCount, byEntity] = await Promise.all([
    prisma.auditLogEntry.count({ where: { companyId } }),
    prisma.auditLogEntry.count({
      where: { companyId, timestamp: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    }),
    prisma.auditLogEntry.groupBy({
      by: ["entityType"],
      where: { companyId },
      _count: { _all: true },
    }),
  ]);

  const distinctActions = new Set(
    (
      await prisma.auditLogEntry.findMany({
        where: { companyId },
        select: { action: true },
        distinct: ["action"],
      })
    ).map((e) => e.action)
  ).size;

  const byCategory = new Map<string, number>();
  for (const row of byEntity) {
    const label = CATEGORY_LABELS[row.entityType] ?? row.entityType;
    byCategory.set(label, (byCategory.get(label) ?? 0) + row._count._all);
  }

  const breakdown = Array.from(byCategory.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);

  return { totalCount, last24hCount, distinctActions, breakdown };
}
