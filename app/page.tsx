import Link from "next/link";
import { getDashboardStats } from "../lib/dashboardStats";
import { getAnalyticsStats } from "../lib/analyticsStats";
import { AnalyticsCharts } from "../components/AnalyticsCharts";
import { formatCents } from "../lib/format";

// This page reads live data straight from Postgres on every load. Without
// this, Next.js statically prerenders it at build time and would serve a
// frozen snapshot of whatever the database looked like when you last ran
// `next build`, not the actual current numbers.
export const dynamic = "force-dynamic";

type Card = {
  label: string;
  value: string;
  sub?: string;
  href?: string;
  accent: string;
  progress?: number;
};

export default async function Dashboard() {
  const stats = await getDashboardStats();
  const analytics = await getAnalyticsStats();
  const reconciliationPct = stats.reconciliationRate * 100;
  const isFullyReconciled = stats.pendingExceptionsCount === 0;

  const cards: Card[] = [
    {
      label: "Total Cash",
      value: formatCents(stats.totalCashCents),
      href: "#accounts",
      accent: "text-emerald-600",
    },
    {
      label: "Reconciliation Rate",
      value: `${reconciliationPct.toFixed(1)}%`,
      sub: `${stats.reconciledCount} of ${stats.totalTransactions} transactions`,
      href: "/transactions",
      accent: "text-emerald-600",
      progress: reconciliationPct,
    },
    {
      label: "Pending Exceptions",
      value: stats.pendingExceptionsCount.toString(),
      href: "/exceptions",
      accent: isFullyReconciled ? "text-emerald-600" : "text-amber-600",
    },
    {
      label: "Connected Accounts",
      value: stats.connectedAccountsCount.toString(),
      href: "#accounts",
      accent: "text-zinc-900",
    },
  ];

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8">
      <p className="text-sm text-zinc-500">
        Cash position and reconciliation status across connected accounts.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const content = (
            <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition-colors hover:border-emerald-300">
              <p className="text-sm font-medium text-zinc-500">{card.label}</p>
              <p className={`mt-2 text-3xl font-semibold tracking-tight ${card.accent}`}>
                {card.value}
              </p>
              {card.sub && <p className="mt-1 text-xs text-zinc-500">{card.sub}</p>}
              {card.progress !== undefined && (
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{ width: `${Math.min(card.progress, 100)}%` }}
                  />
                </div>
              )}
            </div>
          );

          return card.href ? (
            <Link key={card.label} href={card.href}>
              {content}
            </Link>
          ) : (
            <div key={card.label}>{content}</div>
          );
        })}
      </div>

      <div id="accounts" className="mt-8 scroll-mt-24">
        <h2 className="text-sm font-semibold text-zinc-900">Accounts</h2>
        <div className="mt-3 overflow-x-auto rounded-xl border border-zinc-200 bg-white">
          <table className="w-full min-w-[420px] text-sm">
            <thead className="bg-zinc-50 text-left text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-4 py-2 font-medium">Account</th>
                <th className="px-4 py-2 font-medium text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {stats.accounts.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-4 py-6 text-center text-zinc-500">
                    No accounts yet.
                  </td>
                </tr>
              ) : (
                stats.accounts.map((account) => (
                  <tr key={account.accountId}>
                    <td className="px-4 py-2 text-zinc-900">{account.accountId}</td>
                    <td className="px-4 py-2 text-right font-medium text-zinc-900">
                      {formatCents(account.balanceCents)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <AnalyticsCharts
        statusBreakdown={analytics.statusBreakdown}
        humanReview={analytics.humanReview}
        totalTxns={analytics.totalTxns}
        reconciliationRate={stats.reconciliationRate}
      />
    </main>
  );
}