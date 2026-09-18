"use client";

import { useEffect, useState } from "react";
import { formatCents } from "../lib/format";
import StatCard, { StatCardGrid } from "./StatCard";
import { AlertTriangleIcon, DuplicateIcon, HashIcon } from "./icons";

type AnomalyFlag = {
  id: string;
  anomalyType: "round_number" | "duplicate_transaction" | "statistical_outlier";
  severity: number;
  explanation: string;
  bankTransaction: {
    id: string;
    accountId: string;
    date: string;
    amountCents: number;
    memo: string;
  };
};

const TYPE_LABELS: Record<AnomalyFlag["anomalyType"], string> = {
  round_number: "Round number",
  duplicate_transaction: "Possible duplicate",
  statistical_outlier: "Statistical outlier",
};

const TYPE_STYLES: Record<AnomalyFlag["anomalyType"], string> = {
  round_number: "bg-amber-100 text-amber-700",
  duplicate_transaction: "bg-purple-100 text-purple-700",
  statistical_outlier: "bg-orange-100 text-orange-700",
};

export default function AnomaliesView({ canReview }: { canReview: boolean }) {
  const [flags, setFlags] = useState<AnomalyFlag[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  function load() {
    fetch("/api/anomalies")
      .then((r) => r.json())
      .then((d) => {
        setFlags(d.flags ?? []);
        setLoaded(true);
      });
  }

  useEffect(load, []);

  async function rescan() {
    setError("");
    setScanning(true);
    try {
      const res = await fetch("/api/anomalies/scan", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Scan failed.");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setScanning(false);
    }
  }

  async function review(id: string, action: "dismiss" | "confirm") {
    const reason = window.prompt(
      `${action === "dismiss" ? "Dismiss" : "Confirm"} this flag. Add a reason (optional), or Cancel to back out.`
    );
    if (reason === null) return;
    setError("");
    setPendingId(id);
    try {
      const res = await fetch(`/api/anomalies/${id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason: reason || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to review.");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPendingId(null);
    }
  }

  if (!loaded) {
    return <p className="mt-6 text-sm text-zinc-500">Loading…</p>;
  }

  return (
    <div>
      {error && (
        <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mb-6">
        <StatCardGrid>
          <StatCard
            label="Round Number"
            value={flags.filter((f) => f.anomalyType === "round_number").length.toString()}
            icon={HashIcon}
            accent="text-amber-600"
            iconBg="bg-amber-50 text-amber-600"
          />
          <StatCard
            label="Possible Duplicates"
            value={flags.filter((f) => f.anomalyType === "duplicate_transaction").length.toString()}
            icon={DuplicateIcon}
            accent="text-purple-600"
            iconBg="bg-purple-50 text-purple-600"
          />
          <StatCard
            label="Statistical Outliers"
            value={flags.filter((f) => f.anomalyType === "statistical_outlier").length.toString()}
            icon={AlertTriangleIcon}
            accent="text-orange-600"
            iconBg="bg-orange-50 text-orange-600"
          />
        </StatCardGrid>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-900">
          Pending flags {flags.length > 0 && `(${flags.length})`}
        </h2>
        {canReview && (
          <button
            onClick={rescan}
            disabled={scanning}
            className="text-xs font-medium text-teal-700 hover:text-teal-900 disabled:opacity-40"
          >
            {scanning ? "Scanning…" : "Re-scan transactions"}
          </button>
        )}
      </div>

      {flags.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500">No anomalies flagged — nothing unusual detected.</p>
      ) : (
        <div className="mt-3 space-y-3">
          {flags.map((flag) => (
            <div key={flag.id} className="rounded-xl border border-zinc-200 bg-white p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_STYLES[flag.anomalyType]}`}
                    >
                      {TYPE_LABELS[flag.anomalyType]}
                    </span>
                    {flag.anomalyType === "statistical_outlier" && (
                      <span className="text-xs font-medium text-zinc-500">{flag.severity.toFixed(1)}σ</span>
                    )}
                  </div>
                  <p className="mt-2 font-medium text-zinc-900">
                    {formatCents(flag.bankTransaction.amountCents)}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {flag.bankTransaction.accountId} · {flag.bankTransaction.date}
                  </p>
                  <p className="text-xs text-zinc-500">{flag.bankTransaction.memo}</p>
                  <p className="mt-2 max-w-xl text-sm text-zinc-600">{flag.explanation}</p>
                </div>
                {canReview && (
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => review(flag.id, "dismiss")}
                      disabled={pendingId === flag.id}
                      className="rounded-md border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-600 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Dismiss
                    </button>
                    <button
                      onClick={() => review(flag.id, "confirm")}
                      disabled={pendingId === flag.id}
                      className="rounded-md border border-red-600 px-3 py-1 text-xs font-medium text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Confirm
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
