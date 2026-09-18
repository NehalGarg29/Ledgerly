import { Suspense } from "react";
import { getAllTransactions, getTransactionsSummary } from "../../lib/getAllTransactions";
import TransactionStatusFilter from "../../components/TransactionStatusFilter";
import TransactionsTable from "../../components/TransactionsTable";
import { Pagination } from "../../components/Pagination";
import StatCard, { StatCardGrid } from "../../components/StatCard";
import { ListIcon, ArrowUpCircleIcon, ArrowDownCircleIcon, CheckCircleIcon } from "../../components/icons";
import { formatCents } from "../../lib/format";
import { getServerSession } from "../../lib/getServerSession";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const session = await getServerSession();
  if (!session) return null;

  const { status, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const [{ transactions, totalCount }, summary] = await Promise.all([
    getAllTransactions({
      companyId: session.companyId,
      status,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    getTransactionsSummary(session.companyId),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const reconciliationPct = summary.reconciliationRate * 100;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8">
      <p className="text-sm text-zinc-500">
        Every ingested bank transaction and its current reconciliation status. Click a row for
        details.
      </p>

      <div className="mt-6">
        <StatCardGrid>
          <StatCard
            label="Total Transactions"
            value={summary.totalCount.toLocaleString()}
            icon={ListIcon}
            iconBg="bg-zinc-100 text-zinc-600"
          />
          <StatCard
            label="Total Inflow"
            value={formatCents(summary.inflowCents)}
            icon={ArrowUpCircleIcon}
            accent="text-emerald-600"
            iconBg="bg-emerald-50 text-emerald-600"
          />
          <StatCard
            label="Total Outflow"
            value={formatCents(summary.outflowCents)}
            icon={ArrowDownCircleIcon}
            accent="text-red-600"
            iconBg="bg-red-50 text-red-600"
          />
          <StatCard
            label="Reconciliation Rate"
            value={`${reconciliationPct.toFixed(1)}%`}
            sub={`${summary.reconciledCount} of ${summary.totalCount} reconciled`}
            icon={CheckCircleIcon}
            accent="text-emerald-600"
            iconBg="bg-emerald-50 text-emerald-600"
            progress={reconciliationPct}
          />
        </StatCardGrid>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-900">All transactions</h2>
        <Suspense fallback={null}>
          <TransactionStatusFilter />
        </Suspense>
      </div>

      <p className="mt-1 text-xs text-zinc-400">
        Showing {transactions.length} of {totalCount} transactions
      </p>

      <TransactionsTable transactions={transactions} />

      <Suspense fallback={null}>
        <Pagination page={page} totalPages={totalPages} />
      </Suspense>
    </main>
  );
}
