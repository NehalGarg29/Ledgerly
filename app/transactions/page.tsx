import { Suspense } from "react";
import { getAllTransactions } from "../../lib/getAllTransactions";
import TransactionStatusFilter from "../../components/TransactionStatusFilter";

function formatCents(cents: number) {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

const STATUS_STYLES: Record<string, string> = {
  auto_approved: "bg-emerald-100 text-emerald-700",
  approved: "bg-emerald-100 text-emerald-700",
  pending_review: "bg-amber-100 text-amber-700",
  rejected: "bg-red-100 text-red-700",
  unmatched: "bg-zinc-100 text-zinc-600",
};

const STATUS_LABELS: Record<string, string> = {
  auto_approved: "Auto-matched",
  approved: "Approved",
  pending_review: "Pending review",
  rejected: "Rejected",
  unmatched: "Unmatched",
};

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
        </p>
        <Suspense fallback={null}>
          <TransactionStatusFilter />
        </Suspense>
      </div>

      <p className="mt-3 text-xs text-zinc-400">
        Showing {transactions.length} of {allTransactions.length} transactions
      </p>

      <div className="mt-4 overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-zinc-50 text-left text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-4 py-2 font-medium">Date</th>
              <th className="px-4 py-2 font-medium">Account</th>
              <th className="px-4 py-2 font-medium">Memo</th>
              <th className="px-4 py-2 font-medium">Source</th>
              <th className="px-4 py-2 font-medium text-right">Amount</th>
              <th className="px-4 py-2 font-medium">GL Entry</th>
              <th className="px-4 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-zinc-500">
                  No transactions match this filter.
                </td>
              </tr>
            ) : (
              transactions.map((txn) => (
                <tr key={txn.id}>
                  <td className="px-4 py-2 text-zinc-900">{txn.date}</td>
                  <td className="px-4 py-2 text-zinc-900">{txn.accountId}</td>
                  <td className="px-4 py-2 text-zinc-500">{txn.memo}</td>
                  <td className="px-4 py-2 text-xs uppercase text-zinc-500">
                    {txn.sourceFormat}
                  </td>
                  <td
                    className={`px-4 py-2 text-right font-medium ${
                      txn.amountCents < 0 ? "text-red-600" : "text-zinc-900"
                    }`}
                  >
                    {formatCents(txn.amountCents)}
                  </td>
                  <td className="px-4 py-2 text-zinc-500">
                    {txn.glEntry
                      ? `${txn.glEntry.accountCode} — ${txn.glEntry.description}`
                      : "—"}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        STATUS_STYLES[txn.status] ?? STATUS_STYLES.unmatched
                      }`}
                    >
                      {STATUS_LABELS[txn.status] ?? txn.status}
                      {txn.confidenceScore !== null
                        ? ` · ${(txn.confidenceScore * 100).toFixed(0)}%`
                        : ""}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}