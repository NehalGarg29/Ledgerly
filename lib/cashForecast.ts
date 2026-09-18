import { prisma } from "./prisma";
import { getDashboardStats } from "./dashboardStats";

export type ForecastPoint = { date: string; balanceCents: number };

export type UpcomingOutflow = {
  checkNumber: string;
  payee: string;
  amountCents: number;
  issueDate: string;
  accountId: string;
};

export type ForecastResult = {
  currentBalanceCents: number;
  avgDailyNetFlowCents: number;
  historyDays: number;
  projection: ForecastPoint[];
  upcomingOutflows: UpcomingOutflow[];
};

// A deliberately simple, explainable forecast: today's actual balance,
// projected forward using the average daily net flow observed across all
// historical bank transactions. Not a seasonal or ML model — with only a
// few weeks of demo data there isn't enough history to responsibly claim
// more than that. Issued-but-uncleared checks are listed separately as
// known concrete outflows rather than folded into the average, so it's
// clear which numbers are "historical pattern" versus "we actually know
// this is coming."
export async function getCashForecast(companyId: string, daysAhead = 30): Promise<ForecastResult> {
  const [stats, transactions, issuedChecks] = await Promise.all([
    getDashboardStats(companyId),
    prisma.bankTransaction.findMany({ where: { companyId }, select: { date: true, amountCents: true } }),
    prisma.issuedCheck.findMany({
      where: { companyId, status: "issued" },
      orderBy: { issueDate: "asc" },
    }),
  ]);

  const currentBalanceCents = stats.totalCashCents;

  const distinctDates = new Set(transactions.map((t) => t.date));
  const historyDays = distinctDates.size;
  const netHistoricalFlow = transactions.reduce((sum, t) => sum + t.amountCents, 0);
  const avgDailyNetFlowCents = historyDays > 0 ? Math.round(netHistoricalFlow / historyDays) : 0;

  const sortedDates = Array.from(distinctDates).sort();
  const anchorDateStr = sortedDates.length > 0 ? sortedDates[sortedDates.length - 1] : new Date().toISOString().slice(0, 10);
  const anchorDate = new Date(`${anchorDateStr}T00:00:00Z`);

  const projection: ForecastPoint[] = [];
  let runningBalance = currentBalanceCents;
  for (let i = 0; i <= daysAhead; i++) {
    const d = new Date(anchorDate);
    d.setUTCDate(d.getUTCDate() + i);
    if (i > 0) runningBalance += avgDailyNetFlowCents;
    projection.push({ date: d.toISOString().slice(0, 10), balanceCents: runningBalance });
  }

  const upcomingOutflows: UpcomingOutflow[] = issuedChecks.map((c) => ({
    checkNumber: c.checkNumber,
    payee: c.payee,
    amountCents: c.amountCents,
    issueDate: c.issueDate,
    accountId: c.accountId,
  }));

  return { currentBalanceCents, avgDailyNetFlowCents, historyDays, projection, upcomingOutflows };
}
