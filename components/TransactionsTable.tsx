"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import { useRole } from "../lib/useRole";
import { formatCents } from "../lib/format";
import { AgentTracePanel, type AgentTrace } from "./AgentTracePanel";
import { ManualMatchPanel } from "./ManualMatchPanel";
import { describeFuzzyConfidence } from "../lib/confidenceBreakdown";

type Transaction = {
  id: string;
  date: string;
  accountId: string;
  amountCents: number;
  memo: string;
  sourceFormat: string;
  createdAt: string;
  status: string;
  matchType: string | null;
  confidenceScore: number | null;
  glEntry: {
    id: string;
    fundId: string;
    accountCode: string;
    amountCents: number;
    date: string;
    description: string;
  } | null;
};

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

export default function TransactionsTable({
  transactions,
}: {
  transactions: Transaction[];
}) {
  const router = useRouter();
  const role = useRole();
  const canReview = role !== "viewer";

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [investigatingId, setInvestigatingId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<Record<string, string>>({});
  const [traces, setTraces] = useState<Record<string, AgentTrace>>({});

  function toggleExpand(txn: Transaction) {
    setExpandedId((prev) => (prev === txn.id ? null : txn.id));
  }

  async function handleInvestigate(txn: Transaction) {
    setInvestigatingId(txn.id);
    setRowError((prev) => ({ ...prev, [txn.id]: "" }));
    try {
      const res = await fetch(`/api/exceptions/${txn.id}/investigate`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Request failed: ${res.status}`);
      }
      const data = await res.json();
      setTraces((prev) => ({ ...prev, [txn.id]: data.trace }));
      router.refresh();
    } catch (err) {
      setRowError((prev) => ({
        ...prev,
        [txn.id]: err instanceof Error ? err.message : "Something went wrong",
      }));
    } finally {
      setInvestigatingId(null);
    }
  }

  if (transactions.length === 0) {
    return (
      <div className="mt-4 overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <table className="w-full min-w-[720px] text-sm">
          <tbody>
            <tr>
              <td className="px-4 py-6 text-center text-zinc-500">
                No transactions match this filter.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  return (
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
          {transactions.map((txn) => {
            const isExpanded = expandedId === txn.id;
            const isInvestigating = investigatingId === txn.id;
            const trace = traces[txn.id];

            return (
              <Fragment key={txn.id}>
                <tr
                  onClick={() => toggleExpand(txn)}
                  className="cursor-pointer hover:bg-zinc-50"
                >
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

                {isExpanded && (
                  <tr>
                    <td colSpan={7} className="bg-zinc-50 px-4 py-4">
                      <div className="space-y-4 text-sm">
                        <div className="grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-4">
                          <div>
                            <p className="text-xs text-zinc-500">Account</p>
                            <p className="text-zinc-900">{txn.accountId}</p>
                          </div>
                          <div>
                            <p className="text-xs text-zinc-500">Date</p>
                            <p className="text-zinc-900">{txn.date}</p>
                          </div>
                          <div>
                            <p className="text-xs text-zinc-500">Source format</p>
                            <p className="text-zinc-900 uppercase">{txn.sourceFormat}</p>
                          </div>
                          <div>
                            <p className="text-xs text-zinc-500">Ingested</p>
                            <p className="text-zinc-900">
                              {new Date(txn.createdAt).toLocaleString()}
                            </p>
                          </div>
                          <div className="col-span-2 sm:col-span-4">
                            <p className="text-xs text-zinc-500">Memo</p>
                            <p className="text-zinc-900">{txn.memo}</p>
                          </div>
                        </div>

                        {txn.glEntry ? (
                          <div className="rounded-lg border border-zinc-200 bg-white p-3">
                            <p className="text-xs font-medium text-zinc-500">
                              Matched GL entry ({txn.matchType})
                              {txn.confidenceScore !== null &&
                                ` · ${(txn.confidenceScore * 100).toFixed(0)}% confidence`}
                            </p>
                            <p className="mt-1 text-zinc-900">
                              {formatCents(txn.glEntry.amountCents)} · {txn.glEntry.accountCode} ·
                              fund {txn.glEntry.fundId} · {txn.glEntry.date}
                            </p>
                            <p className="text-zinc-500">{txn.glEntry.description}</p>
                            {txn.matchType === "fuzzy" && (
                              <p className="mt-2 border-t border-zinc-100 pt-2 text-xs text-zinc-500">
                                {
                                  describeFuzzyConfidence(
                                    txn.amountCents,
                                    txn.date,
                                    txn.glEntry.amountCents,
                                    txn.glEntry.date
                                  ).summary
                                }
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {canReview && (
                              <button
                                onClick={() => handleInvestigate(txn)}
                                disabled={isInvestigating}
                                className="rounded-md border border-blue-600 px-3 py-1 text-xs font-medium text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                {isInvestigating ? "Investigating…" : "Investigate with AI"}
                              </button>
                            )}

                            {trace && <AgentTracePanel trace={trace} />}

                            <ManualMatchPanel
                              transactionId={txn.id}
                              canReview={canReview}
                              onMatched={() => router.refresh()}
                              onRejected={() => router.refresh()}
                            />
                          </div>
                        )}

                        {rowError[txn.id] && (
                          <p className="text-xs text-red-600">{rowError[txn.id]}</p>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
