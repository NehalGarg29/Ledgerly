import { prisma } from "./prisma";
import { formatCents } from "./format";

export const ACTION_LABELS: Record<string, string> = {
  agent_proposed_match: "AI proposed a match",
  match_approved: "Match approved",
  match_rejected: "Match rejected",
  manual_match_created: "Manually matched",
  manual_gl_entry_created: "GL entry added manually",
};

export type AuditLogRow = {
  id: string;
  timestamp: string;
  action: string;
  entityType: string;
  summary: string;
};

export async function getAuditLog(): Promise<AuditLogRow[]> {
  const entries = await prisma.auditLogEntry.findMany({
    orderBy: { timestamp: "desc" },
    take: 200,
  });

  const matchIds = entries.filter((e) => e.entityType === "Match").map((e) => e.entityId);
  const matches = await prisma.match.findMany({
    where: { id: { in: matchIds } },
    include: { bankTransaction: true, glEntry: true },
  });
  const matchMap = new Map(matches.map((m) => [m.id, m]));

  return entries.map((e) => {
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
      }
    } else if (e.entityType === "GLEntry") {
      summary = `${formatCents(Number(after.amountCents ?? 0))} · ${after.accountCode ?? ""} — ${after.description ?? ""}`;
    }

    return {
      id: e.id,
      timestamp: e.timestamp.toISOString(),
      action: e.action,
      entityType: e.entityType,
      summary,
    };
  });
}
