import Link from "next/link";
import { cookies } from "next/headers";
import { getDashboardStats } from "../lib/dashboardStats";
import { getAnalyticsStats } from "../lib/analyticsStats";
import { AnalyticsCharts } from "../components/AnalyticsCharts";
import { formatCents } from "../lib/format";
import { verifySessionToken } from "../lib/session";
import Avatar from "../components/Avatar";

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
  iconBg: string;
  icon: React.ReactNode;
  progress?: number;
};

const CashIcon = (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
    <rect x="2" y="5" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="10" cy="10" r="2" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

const CheckIcon = (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
    <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.5" />
    <path
      d="M6.5 10.2l2.2 2.2 4.8-5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const AlertIcon = (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
    <path d="M10 3.5l7.5 13h-15L10 3.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M10 8.5v3.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="10" cy="14" r="0.75" fill="currentColor" />
  </svg>
);

const LinkIcon = (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
    <path d="M8 12l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M7 13.5a3 3 0 010-4.2l1.5-1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M13 6.5a3 3 0 010 4.2l-1.5 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export default async function Dashboard() {
  const stats = await getDashboardStats();
  const analytics = await getAnalyticsStats();
  const cookieStore = await cookies();
  const session = verifySessionToken(cookieStore.get("session")?.value);
  const reconciliationPct = stats.reconciliationRate * 100;
  const isFullyReconciled = stats.pendingExceptionsCount === 0;

  const cards: Card[] = [
    {
      label: "Total Cash",
      value: formatCents(stats.totalCashCents),
      href: "#accounts",
      accent: "text-emerald-600",
      iconBg: "bg-emerald-50 text-emerald-600",
      icon: CashIcon,
    },
    {
      label: "Reconciliation Rate",
      value: `${reconciliationPct.toFixed(1)}%`,
      sub: `${stats.reconciledCount} of ${stats.totalTransactions} transactions`,
      href: "/transactions",
      accent: "text-emerald-600",
      iconBg: "bg-emerald-50 text-emerald-600",
      icon: CheckIcon,
      progress: reconciliationPct,
    },
    {
      label: "Pending Exceptions",
      value: stats.pendingExceptionsCount.toString(),
      href: "/exceptions",
      accent: isFullyReconciled ? "text-emerald-600" : "text-amber-600",
      iconBg: isFullyReconciled ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600",
      icon: AlertIcon,
    },
    {
      label: "Connected Accounts",
      value: stats.connectedAccountsCount.toString(),
      href: "#accounts",
      accent: "text-zinc-900",
      iconBg: "bg-zinc-100 text-zinc-600",
      icon: LinkIcon,
    },
  ];

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <p className="text-sm text-zinc-500">
          Cash position and reconciliation status across connected accounts.
        </p>
        {session && (
          <div className="flex items-center gap-2.5">
            <Avatar email={session.email} role={session.role} size="sm" />
            <span className="text-sm text-zinc-600">
              Welcome back,{" "}
              <span className="font-medium text-zinc-900">{session.email.split("@")[0]}</span>
            </span>
          </div>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const content = (
            <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition-colors hover:border-emerald-300">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-zinc-500">{card.label}</p>
                <span className={`flex h-8 w-8 items-center justify-center rounded-full ${card.iconBg}`}>
                  {card.icon}
                </span>
              </div>
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
