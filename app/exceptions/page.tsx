"use client";

import { Fragment, useEffect, useState } from "react";
import { useRole } from "../../lib/useRole";
import { formatCents } from "../../lib/format";
import { AgentTracePanel, type AgentTrace } from "../../components/AgentTracePanel";
import { ManualMatchPanel } from "../../components/ManualMatchPanel";
import { describeFuzzyConfidence } from "../../lib/confidenceBreakdown";

type Exception = {
  id: string;
  bankTransaction: {
    id: string;
    accountId: string;
    date: string;
    amountCents: number;
    memo: string;
    sourceFormat: string;
  };
  glEntry: {
    id: string;
    fundId: string;
    accountCode: string;
    amountCents: number;
    date: string;
    description: string;
  } | null;
  matchType: "exact" | "fuzzy" | "ai_suggested" | "manual" | null;
  confidenceScore: number | null;
  kind: "pending_review" | "unmatched";
};

function MatchBadge({ kind, matchType }: { kind: string; matchType: string | null }) {
  const label = kind === "unmatched" ? "unmatched" : matchType ?? "unknown";
  const styles: Record<string, string> = {
    exact: "bg-emerald-100 text-emerald-700",
    fuzzy: "bg-amber-100 text-amber-700",
    ai_suggested: "bg-blue-100 text-blue-700",
    manual: "bg-purple-100 text-purple-700",
    unmatched: "bg-zinc-100 text-zinc-600",
  };
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
        styles[label] ?? styles.unmatched
      }`}
    >
      {label}
    </span>
  );
}

export default function ExceptionsPage() {
  const role = useRole();
  const canReview = role !== "viewer";

  const [exceptions, setExceptions] = useState<Exception[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingRowId, setPendingRowId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<Record<string, string>>({});

  const [investigatingId, setInvestigatingId] = useState<string | null>(null);
  const [traces, setTraces] = useState<Record<string, AgentTrace>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [investigateError, setInvestigateError] = useState<Record<string, string>>({});

  function loadExceptions() {
    return fetch("/api/exceptions")
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        return res.json();
      })
      .then((data) => setExceptions(data.exceptions))
      .catch((err) => setError(err.message));
  }

  useEffect(() => {
    loadExceptions();
  }, []);

  async function handleReview(exception: Exception, action: "approve" | "reject") {
    setPendingRowId(exception.id);
    setRowError((prev) => ({ ...prev, [exception.id]: "" }));

    try {
      const res = await fetch(`/api/exceptions/${exception.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, kind: exception.kind }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Request failed: ${res.status}`);
      }

      await loadExceptions();
    } catch (err) {
      setRowError((prev) => ({
        ...prev,
        [exception.id]: err instanceof Error ? err.message : "Something went wrong",
      }));
    } finally {
      setPendingRowId(null);
    }
  }

  async function handleInvestigate(exception: Exception) {
    const txnId = exception.bankTransaction.id;
    setInvestigatingId(txnId);
    setInvestigateError((prev) => ({ ...prev, [txnId]: "" }));

    try {
      const res = await fetch(`/api/exceptions/${txnId}/investigate`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Request failed: ${res.status}`);
      }

      const data = await res.json();
      setTraces((prev) => ({ ...prev, [txnId]: data.trace }));
      setExpandedId(txnId);
      await loadExceptions();
    } catch (err) {
      setInvestigateError((prev) => ({
        ...prev,
        [txnId]: err instanceof Error ? err.message : "Something went wrong",
      }));
    } finally {
      setInvestigatingId(null);
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8">
      <p className="text-sm text-zinc-500">
        Transactions that didn&apos;t clear automatic matching. Review and
        approve or reject.
      </p>

      {!canReview && (
        <p className="mt-4 rounded-md bg-zinc-100 px-3 py-2 text-xs text-zinc-600">
          Viewing as Viewer — read only. Switch roles in the sidebar to review exceptions.
        </p>
      )}

      {error && (
        <p className="mt-6 text-sm text-red-600">
          Failed to load exceptions: {error}
        </p>
      )}

      {!exceptions && !error && (
        <p className="mt-6 text-sm text-zinc-500">Loading…</p>
      )}

      {exceptions && exceptions.length === 0 && (
        <p className="mt-6 text-sm text-zinc-500">
          No exceptions — everything&apos;s reconciled.
        </p>
      )}

      {exceptions && exceptions.length > 0 && (
        <div className="mt-8 overflow-x-auto rounded-xl border border-zinc-200 bg-white">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-zinc-50 text-left text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-4 py-2 font-medium">Bank Transaction</th>
                <th className="px-4 py-2 font-medium">Candidate GL Entry</th>
                <th className="px-4 py-2 font-medium">Match</th>
                <th className="px-4 py-2 font-medium">Confidence</th>
                <th className="px-4 py-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {exceptions.map((exception) => {
                const isPending = pendingRowId === exception.id;
                const canApprove = exception.glEntry !== null;
                const txnId = exception.bankTransaction.id;
                const isInvestigating = investigatingId === txnId;
                const trace = traces[txnId];
                const isExpanded = expandedId === txnId;

                return (
                  <Fragment key={exception.id}>
                    <tr className="align-top">
                      <td className="px-4 py-3">
                        <p className="font-medium text-zinc-900">
                          {formatCents(exception.bankTransaction.amountCents)}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {exception.bankTransaction.accountId} ·{" "}
                          {exception.bankTransaction.date}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {exception.bankTransaction.memo}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        {exception.glEntry ? (
                          <>
                            <p className="font-medium text-zinc-900">
                              {formatCents(exception.glEntry.amountCents)}
                            </p>
                            <p className="text-xs text-zinc-500">
                              {exception.glEntry.accountCode} ·{" "}
                              {exception.glEntry.date}
                            </p>
                            <p className="text-xs text-zinc-500">
                              {exception.glEntry.description}
                            </p>
                          </>
                        ) : (
                          <span className="text-xs text-zinc-400">
                            No candidate found
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <MatchBadge kind={exception.kind} matchType={exception.matchType} />
                      </td>
                      <td className="px-4 py-3 text-zinc-900">
                        {exception.confidenceScore !== null
                          ? `${(exception.confidenceScore * 100).toFixed(0)}%`
                          : "—"}
                        {exception.matchType === "fuzzy" && exception.glEntry && (
                          <p className="mt-1 max-w-[220px] text-xs font-normal text-zinc-500">
                            {
                              describeFuzzyConfidence(
                                exception.bankTransaction.amountCents,
                                exception.bankTransaction.date,
                                exception.glEntry.amountCents,
                                exception.glEntry.date
                              ).summary
                            }
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          {exception.kind === "unmatched" ? (
                            <>
                              {canReview && (
                                <button
                                  onClick={() => handleInvestigate(exception)}
                                  disabled={isInvestigating}
                                  className="rounded-md border border-blue-600 px-3 py-1 text-xs font-medium text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  {isInvestigating ? "Investigating…" : "Investigate"}
                                </button>
                              )}
                              <button
                                onClick={() => setExpandedId(isExpanded ? null : txnId)}
                                className="rounded-md border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-600"
                              >
                                {isExpanded ? "Hide review" : "Review"}
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleReview(exception, "approve")}
                                disabled={!canApprove || isPending || !canReview}
                                title={canApprove ? undefined : "No candidate to approve"}
                                className="rounded-md border border-emerald-600 px-3 py-1 text-xs font-medium text-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleReview(exception, "reject")}
                                disabled={isPending || !canReview}
                                className="rounded-md border border-red-600 px-3 py-1 text-xs font-medium text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                        {rowError[exception.id] && (
                          <p className="mt-1 text-xs text-red-600">
                            {rowError[exception.id]}
                          </p>
                        )}
                        {investigateError[txnId] && (
                          <p className="mt-1 text-xs text-red-600">
                            {investigateError[txnId]}
                          </p>
                        )}
                      </td>
                    </tr>
                    {exception.kind === "unmatched" && isExpanded && (
                      <tr>
                        <td colSpan={5} className="space-y-3 bg-zinc-50 px-4 py-3">
                          {trace && <AgentTracePanel trace={trace} />}
                          <ManualMatchPanel
                            transactionId={txnId}
                            canReview={canReview}
                            onMatched={() => {
                              setExpandedId(null);
                              loadExceptions();
                            }}
                            onRejected={() => {
                              setExpandedId(null);
                              loadExceptions();
                            }}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
