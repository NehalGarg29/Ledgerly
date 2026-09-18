import { prisma } from "./prisma";

export function periodFromDate(dateStr: string): string {
  return dateStr.slice(0, 7); // "YYYY-MM"
}

export async function getClosedPeriodsAmong(companyId: string, periods: string[]): Promise<string[]> {
  const distinct = Array.from(new Set(periods));
  if (distinct.length === 0) return [];
  const rows = await prisma.closePeriod.findMany({
    where: { companyId, period: { in: distinct }, status: "closed" },
    select: { period: true },
  });
  return rows.map((r) => r.period);
}

export async function isPeriodClosed(companyId: string, period: string): Promise<boolean> {
  const cp = await prisma.closePeriod.findFirst({ where: { companyId, period } });
  return cp?.status === "closed";
}

export type PeriodChecklist = {
  period: string;
  status: "open" | "closed";
  pendingReviewCount: number;
  unmatchedCount: number;
  canClose: boolean;
  closedAt: string | null;
  closedByEmail: string | null;
};

export async function getPeriodChecklist(companyId: string, period: string): Promise<PeriodChecklist> {
  const [closePeriod, pendingCount, unmatchedCount] = await Promise.all([
    prisma.closePeriod.findFirst({ where: { companyId, period }, include: { closedBy: true } }),
    prisma.match.count({
      where: { companyId, status: "pending_review", bankTransaction: { date: { startsWith: period } } },
    }),
    prisma.bankTransaction.count({
      where: { companyId, date: { startsWith: period }, matches: { none: {} } },
    }),
  ]);

  return {
    period,
    status: closePeriod?.status ?? "open",
    pendingReviewCount: pendingCount,
    unmatchedCount,
    canClose: pendingCount === 0 && unmatchedCount === 0,
    closedAt: closePeriod?.closedAt?.toISOString() ?? null,
    closedByEmail: closePeriod?.closedBy?.email ?? null,
  };
}

export async function listRecentPeriods(companyId: string, limit = 12): Promise<string[]> {
  const [bankDates, glDates] = await Promise.all([
    prisma.bankTransaction.findMany({ where: { companyId }, select: { date: true }, distinct: ["date"] }),
    prisma.gLEntry.findMany({ where: { companyId }, select: { date: true }, distinct: ["date"] }),
  ]);

  const periods = new Set<string>();
  for (const d of bankDates) periods.add(periodFromDate(d.date));
  for (const d of glDates) periods.add(periodFromDate(d.date));

  return Array.from(periods)
    .sort()
    .reverse()
    .slice(0, limit);
}
