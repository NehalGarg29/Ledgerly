import { Suspense } from "react";
import { getAuditLog, getAuditLogSummary, ACTION_LABELS } from "../../lib/getAuditLog";
import { Pagination } from "../../components/Pagination";
import StatCard, { StatCardGrid } from "../../components/StatCard";
import { AuditLogBreakdownChart } from "../../components/AuditLogBreakdownChart";
import { ListIcon, ClockIcon, HashIcon } from "../../components/icons";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

const ACTION_STYLES: Record<string, string> = {
  agent_proposed_match: "bg-blue-100 text-blue-700",
  match_approved: "bg-emerald-100 text-emerald-700",
  match_rejected: "bg-red-100 text-red-700",
  manual_match_created: "bg-purple-100 text-purple-700",
  manual_gl_entry_created: "bg-amber-100 text-amber-700",
  match_thresholds_updated: "bg-blue-100 text-blue-700",
  upload_batch_voided: "bg-zinc-200 text-zinc-700",
  fund_created: "bg-teal-100 text-teal-700",
  fund_updated: "bg-teal-100 text-teal-700",
  account_created: "bg-teal-100 text-teal-700",
  account_updated: "bg-teal-100 text-teal-700",
  policy_rule_created: "bg-indigo-100 text-indigo-700",
  policy_rule_updated: "bg-indigo-100 text-indigo-700",
  policy_blocked_approval: "bg-red-100 text-red-700",
  period_closed: "bg-zinc-800 text-white",
  period_reopened: "bg-amber-100 text-amber-700",
  check_issued: "bg-blue-100 text-blue-700",
  check_voided: "bg-zinc-200 text-zinc-700",
  check_cleared: "bg-emerald-100 text-emerald-700",
  positive_pay_flagged: "bg-red-100 text-red-700",
  positive_pay_paid: "bg-emerald-100 text-emerald-700",
  positive_pay_returned: "bg-red-100 text-red-700",
  anomaly_flagged: "bg-orange-100 text-orange-700",
  anomaly_dismissed: "bg-zinc-200 text-zinc-700",
  anomaly_confirmed: "bg-red-100 text-red-700",
};

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const [{ rows, totalCount }, summary] = await Promise.all([
    getAuditLog({
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    getAuditLogSummary(),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8">
      <p className="text-sm text-zinc-500">
        Every action taken on a transaction or GL entry, in the order it happened. Nothing here is ever edited or deleted.
      </p>

      <div className="mt-6">
        <StatCardGrid>
          <StatCard
            label="Total Actions Logged"
            value={summary.totalCount.toLocaleString()}
            icon={ListIcon}
            iconBg="bg-zinc-100 text-zinc-600"
          />
          <StatCard
            label="Last 24 Hours"
            value={summary.last24hCount.toLocaleString()}
            icon={ClockIcon}
            accent="text-teal-700"
            iconBg="bg-teal-50 text-teal-700"
          />
          <StatCard
            label="Distinct Action Types"
            value={summary.distinctActions.toLocaleString()}
            icon={HashIcon}
            iconBg="bg-zinc-100 text-zinc-600"
          />
        </StatCardGrid>
      </div>

      <AuditLogBreakdownChart breakdown={summary.breakdown} />

      {rows.length === 0 ? (
        <p className="mt-6 text-sm text-zinc-500">No activity yet.</p>
      ) : (
        <>
          <div className="mt-8 overflow-x-auto rounded-xl border border-zinc-200 bg-white">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-zinc-50 text-left text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-4 py-2 font-medium">When</th>
                  <th className="px-4 py-2 font-medium">Action</th>
                  <th className="px-4 py-2 font-medium">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-2 text-xs text-zinc-500">
                      {new Date(row.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          ACTION_STYLES[row.action] ?? "bg-zinc-100 text-zinc-600"
                        }`}
                      >
                        {ACTION_LABELS[row.action] ?? row.action}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-zinc-900">{row.summary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Suspense fallback={null}>
            <Pagination page={page} totalPages={totalPages} />
          </Suspense>
        </>
      )}
    </main>
  );
}
