import { Suspense } from "react";
import { getAllTransactions } from "../../lib/getAllTransactions";
import TransactionStatusFilter from "../../components/TransactionStatusFilter";
import TransactionsTable from "../../components/TransactionsTable";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const allTransactions = await getAllTransactions();
  const transactions =
    status && status !== "all"
      ? allTransactions.filter((txn) => txn.status === status)
      : allTransactions;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">
          Every ingested bank transaction and its current reconciliation status.
          Click a row for details.
        </p>
        <Suspense fallback={null}>
          <TransactionStatusFilter />
        </Suspense>
      </div>

      <p className="mt-3 text-xs text-zinc-400">
        Showing {transactions.length} of {allTransactions.length} transactions
      </p>

      <TransactionsTable transactions={transactions} />
    </main>
  );
}
