"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type PeriodChecklist = {
  period: string;
  status: "open" | "closed";
  pendingReviewCount: number;
  unmatchedCount: number;
  canClose: boolean;
  closedAt: string | null;
  closedByEmail: string | null;
};

function formatPeriod(period: string): string {
  const [year, month] = period.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export default function ClosePeriodsView({
  periods,
  canReview,
}: {
  periods: PeriodChecklist[];
  canReview: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busyPeriod, setBusyPeriod] = useState<string | null>(null);

  async function closePeriod(period: string) {
    setError("");
    setBusyPeriod(period);
    try {
      const res = await fetch(`/api/close-periods/${period}/close`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to close period.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusyPeriod(null);
    }
  }

  async function reopenPeriod(period: string) {
    if (!window.confirm(`Reopen ${formatPeriod(period)}? This unlocks it for editing again.`)) return;
    setError("");
    setBusyPeriod(period);
    try {
      const res = await fetch(`/api/close-periods/${period}/reopen`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to reopen period.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusyPeriod(null);
    }
  }

  if (periods.length === 0) {
    return <p className="mt-6 text-sm text-zinc-500">No transaction data yet — nothing to close.</p>;
  }

  const [current, ...history] = periods;

  return (
    <div className="space-y-8">
      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>
      )}

      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">
              {formatPeriod(current.period)}
              {current.status === "closed" && (
                <span className="ml-2 rounded-full bg-zinc-800 px-2 py-0.5 text-xs font-medium text-white">
                  Closed
                </span>
              )}
            </h2>
            <p className="mt-1 text-xs text-zinc-500">Most recent period with activity.</p>
          </div>
          <div className="flex items-center gap-2">
            {canReview && current.status === "open" && (
              <button
                onClick={() => closePeriod(current.period)}
                disabled={!current.canClose || busyPeriod === current.period}
                className="rounded-md bg-teal-800 px-4 py-2 text-sm font-medium text-white hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busyPeriod === current.period ? "Closing…" : "Close period"}
              </button>
            )}
            {canReview && current.status === "closed" && (
              <button
                onClick={() => reopenPeriod(current.period)}
                disabled={busyPeriod === current.period}
                className="rounded-md border border-amber-600 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busyPeriod === current.period ? "Reopening…" : "Reopen period"}
              </button>
            )}
            <a
              href={`/api/compliance-export/${current.period}`}
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
            >
              Export evidence pack
            </a>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-4">
            <p className="text-xs font-medium text-zinc-500">Pending review</p>
            <p className={`mt-1 text-2xl font-semibold ${current.pendingReviewCount === 0 ? "text-emerald-600" : "text-amber-600"}`}>
              {current.pendingReviewCount}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-4">
            <p className="text-xs font-medium text-zinc-500">Unmatched</p>
            <p className={`mt-1 text-2xl font-semibold ${current.unmatchedCount === 0 ? "text-emerald-600" : "text-amber-600"}`}>
              {current.unmatchedCount}
            </p>
          </div>
        </div>

        {current.status === "open" && !current.canClose && (
          <p className="mt-4 text-xs text-zinc-500">
            Resolve every pending and unmatched exception dated in {formatPeriod(current.period)} before it can close.
          </p>
        )}
        {current.status === "closed" && current.closedByEmail && (
          <p className="mt-4 text-xs text-zinc-500">
            Closed by {current.closedByEmail}
            {current.closedAt ? ` on ${new Date(current.closedAt).toLocaleString()}` : ""}.
          </p>
        )}
      </div>

      {history.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">Prior periods</h2>
          <div className="mt-3 overflow-x-auto rounded-xl border border-zinc-200 bg-white">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="bg-zinc-50 text-left text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Period</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium text-right">Pending</th>
                  <th className="px-4 py-2 font-medium text-right">Unmatched</th>
                  <th className="px-4 py-2" />
                  {canReview && <th className="px-4 py-2" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {history.map((p) => (
                  <tr key={p.period}>
                    <td className="px-4 py-2 text-zinc-900">{formatPeriod(p.period)}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          p.status === "closed" ? "bg-zinc-800 text-white" : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right text-zinc-600">{p.pendingReviewCount}</td>
                    <td className="px-4 py-2 text-right text-zinc-600">{p.unmatchedCount}</td>
                    <td className="px-4 py-2 text-right">
                      <a
                        href={`/api/compliance-export/${p.period}`}
                        className="text-xs font-medium text-zinc-500 hover:text-zinc-900"
                      >
                        Export
                      </a>
                    </td>
                    {canReview && (
                      <td className="px-4 py-2 text-right">
                        {p.status === "open" ? (
                          <button
                            onClick={() => closePeriod(p.period)}
                            disabled={!p.canClose || busyPeriod === p.period}
                            className="text-xs font-medium text-teal-700 hover:text-teal-900 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Close
                          </button>
                        ) : (
                          <button
                            onClick={() => reopenPeriod(p.period)}
                            disabled={busyPeriod === p.period}
                            className="text-xs font-medium text-amber-700 hover:text-amber-900"
                          >
                            Reopen
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
