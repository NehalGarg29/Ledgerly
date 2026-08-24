"use client";

import { Fragment, useEffect, useState } from "react";
import { useRole } from "../../lib/useRole";

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

type ToolCall = {
  step: number;
  tool: string;
  args: unknown;
  result: unknown;
};

type AgentTrace = {
  id: string;
  bankTransactionId: string;
  toolCalls: ToolCall[];
  finalAction: string;
  finalReasoning: string | null;
  proposedGlEntryId: string | null;
  proposedConfidence: number | null;
  matchId: string | null;
  createdAt: string;
};

function formatCents(cents: number) {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

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

const FINAL_ACTION_LABELS: Record<string, string> = {
  propose_match: "Proposed a match",
  escalate_to_human: "Escalated for human review",
  cap_reached: "Escalated — tool limit reached",
};

const TOOL_LABELS: Record<string, string> = {
  search_gl_entries: "Search GL entries",
  get_transaction_history: "Check transaction history",
  check_policy_flags: "Check policy flags",
  propose_match: "Propose match",
  escalate_to_human: "Escalate to human",
};

type GlSearchResult = {
  id: string;
  accountCode: string;
  amountCents: number;
  date: string;
  description: string;
};

type HistoryResult = {
  memo: string;
  amountCents: number;
  date: string;
  matchType: string | null;
  glAccountCode: string | null;
};

function stepTone(call: ToolCall): "empty" | "found" | "action" {
  if (call.tool === "propose_match" || call.tool === "escalate_to_human") return "action";
  return Array.isArray(call.result) && call.result.length > 0 ? "found" : "empty";
}

function StepStatus({ tone }: { tone: "empty" | "found" | "action" }) {
  const styles: Record<string, string> = {
    empty: "bg-zinc-100 text-zinc-400",
    found: "bg-emerald-100 text-emerald-700",
    action: "bg-blue-100 text-blue-700",
  };
  return (
    <span
      className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${styles[tone]}`}
    >
      {tone === "empty" ? "–" : tone === "found" ? "✓" : "→"}
    </span>
  );
}

function StepDetail({ call }: { call: ToolCall }) {
  const args = (call.args ?? {}) as Record<string, unknown>;

  if (call.tool === "search_gl_entries") {
    const results = (call.result as GlSearchResult[]) ?? [];
    const parts: string[] = [];
    if (args.dateFrom || args.dateTo) {
      parts.push(`dated ${args.dateFrom ?? "…"} to ${args.dateTo ?? "…"}`);
    }
    if (args.minAmountCents !== undefined || args.maxAmountCents !== undefined) {
      const min = args.minAmountCents !== undefined ? formatCents(Number(args.minAmountCents)) : "…";
      const max = args.maxAmountCents !== undefined ? formatCents(Number(args.maxAmountCents)) : "…";
      parts.push(`amount ${min} to ${max}`);
    }
    if (args.fundId) parts.push(`fund ${args.fundId}`);

    return (
      <div>
        <p className="text-zinc-700">
          Searched GL entries {parts.length > 0 ? parts.join(", ") : "with no filters"}.
        </p>
        {results.length === 0 ? (
          <p className="mt-1 text-zinc-400">No matches found.</p>
        ) : (
          <ul className="mt-1 space-y-1">
            {results.slice(0, 4).map((r) => (
              <li key={r.id} className="text-zinc-700">
                {r.date} · {r.accountCode} · {formatCents(r.amountCents)} — {r.description}
              </li>
            ))}
            {results.length > 4 && (
              <li className="text-zinc-400">+{results.length - 4} more</li>
            )}
          </ul>
        )}
      </div>
    );
  }

  if (call.tool === "get_transaction_history") {
    const results = (call.result as HistoryResult[]) ?? [];
    return (
      <div>
        <p className="text-zinc-700">
          Checked past transactions with memo containing &quot;{String(args.vendorPattern)}&quot;.
        </p>
        {results.length === 0 ? (
          <p className="mt-1 text-zinc-400">No prior matches found.</p>
        ) : (
          <ul className="mt-1 space-y-1">
            {results.slice(0, 4).map((r, i) => (
              <li key={i} className="text-zinc-700">
                {r.date} · {r.memo} · {formatCents(r.amountCents)} → matched {r.glAccountCode} ({r.matchType})
              </li>
            ))}
            {results.length > 4 && (
              <li className="text-zinc-400">+{results.length - 4} more</li>
            )}
          </ul>
        )}
      </div>
    );
  }

  if (call.tool === "check_policy_flags") {
    const result = (call.result ?? {}) as { message?: string };
    return (
      <p className="text-zinc-700">
        Checked policy flags for fund {String(args.fundId)}.{" "}
        <span className="text-zinc-400">{result.message ?? ""}</span>
      </p>
    );
  }

  if (call.tool === "propose_match") {
    const confidence = Number(args.confidence ?? 0);
    return (
      <p className="text-zinc-700">
        Proposed GL entry{" "}
        <span className="font-mono text-[11px]">{String(args.glEntryId ?? "").slice(0, 8)}…</span>{" "}
        as the match, confidence {Math.round(confidence * 100)}%. Reasoning shown above.
      </p>
    );
  }

  if (call.tool === "escalate_to_human") {
    return <p className="text-zinc-700">Escalated to human review. Reasoning shown above.</p>;
  }

  return (
    <pre className="overflow-x-auto whitespace-pre-wrap text-[11px] text-zinc-500">
      {JSON.stringify(call.result)}
    </pre>
  );
}

function AgentTracePanel({ trace }: { trace: AgentTrace }) {
  return (
    <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-4 text-xs">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="font-semibold text-zinc-900">
          {FINAL_ACTION_LABELS[trace.finalAction] ?? trace.finalAction}
        </span>
        {trace.proposedConfidence !== null && (
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-blue-700">
            confidence {(trace.proposedConfidence * 100).toFixed(0)}%
          </span>
        )}
        <span className="text-zinc-400">
          {new Date(trace.createdAt).toLocaleString()}
        </span>
      </div>

      {trace.finalReasoning && (
        <p className="mb-3 text-zinc-700">{trace.finalReasoning}</p>
      )}

      <div className="space-y-2">
        {trace.toolCalls.map((call) => (
          <div key={call.step} className="flex gap-2 rounded-md border border-zinc-200 bg-white p-2.5">
            <StepStatus tone={stepTone(call)} />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-zinc-900">{TOOL_LABELS[call.tool] ?? call.tool}</p>
              <div className="mt-1">
                <StepDetail call={call} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
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
  const [expandedTraceId, setExpandedTraceId] = useState<string | null>(null);
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
      setExpandedTraceId(txnId);
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
                const isExpanded = expandedTraceId === txnId;

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
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          {exception.kind === "unmatched" && (
                            <button
                              onClick={() => handleInvestigate(exception)}
                              disabled={isInvestigating || !canReview}
                              className="rounded-md border border-blue-600 px-3 py-1 text-xs font-medium text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              {isInvestigating ? "Investigating…" : "Investigate"}
                            </button>
                          )}
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
                        {trace && (
                          <button
                            onClick={() =>
                              setExpandedTraceId(isExpanded ? null : txnId)
                            }
                            className="mt-1 block text-xs text-blue-600 underline"
                          >
                            {isExpanded ? "Hide agent trace" : "View agent trace"}
                          </button>
                        )}
                      </td>
                    </tr>
                    {trace && isExpanded && (
                      <tr>
                        <td colSpan={5} className="bg-zinc-50 px-4 py-3">
                          <AgentTracePanel trace={trace} />
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