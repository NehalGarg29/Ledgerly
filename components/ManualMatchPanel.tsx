"use client";

import { useEffect, useState } from "react";
import { formatCents } from "../lib/format";

type Candidate = {
  id: string;
  fundId: string;
  accountCode: string;
  amountCents: number;
  date: string;
  description: string;
  source?: string;
};

type AddForm = {
  fundId: string;
  accountCode: string;
  amount: string;
  date: string;
  description: string;
};

const EMPTY_FORM: AddForm = { fundId: "", accountCode: "", amount: "", date: "", description: "" };

// Manual reconciliation, for when neither the deterministic matcher nor the
// AI agent found something. Three ways out: pick from a proximity-ranked
// shortlist, search/browse the full unmatched GL pool (a human may know
// things a distance search can't — a typo'd amount, a late posting), or key
// in a GL entry that hasn't been ingested yet at all. Whatever a human picks
// here always goes through the same review endpoint as everything else, so
// it's audit-logged the same way.
export function ManualMatchPanel({
  transactionId,
  canReview,
  onMatched,
  onRejected,
}: {
  transactionId: string;
  canReview: boolean;
  onMatched: () => void;
  onRejected: () => void;
}) {
  const [nearCandidates, setNearCandidates] = useState<Candidate[] | null>(null);
  const [browseOpen, setBrowseOpen] = useState(false);
  const [browseQuery, setBrowseQuery] = useState("");
  const [browseResults, setBrowseResults] = useState<Candidate[] | null>(null);
  const [addFormOpen, setAddFormOpen] = useState(false);
  const [addForm, setAddForm] = useState<AddForm>(EMPTY_FORM);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/transactions/${transactionId}/candidates`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setNearCandidates(d.candidates ?? []);
      })
      .catch(() => {
        if (!cancelled) setNearCandidates([]);
      });
    return () => {
      cancelled = true;
    };
  }, [transactionId]);

  async function runBrowse(q: string) {
    setBrowseQuery(q);
    try {
      const res = await fetch(`/api/gl-entries/unmatched${q ? `?q=${encodeURIComponent(q)}` : ""}`);
      const data = await res.json();
      setBrowseResults(data.entries ?? []);
    } catch {
      setBrowseResults([]);
    }
  }

  async function matchTo(glEntryId: string, pendingKey: string) {
    if (!window.confirm("Match this transaction to this GL entry? This can't be undone.")) return;
    setPending(pendingKey);
    setError("");
    try {
      const res = await fetch(`/api/exceptions/${transactionId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve", kind: "unmatched", glEntryId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Request failed: ${res.status}`);
      }
      onMatched();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setPending(null);
    }
  }

  async function handleReject() {
    if (!window.confirm("Mark this transaction as unmatched? This can't be undone.")) return;
    setPending("reject");
    setError("");
    try {
      const res = await fetch(`/api/exceptions/${transactionId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", kind: "unmatched" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Request failed: ${res.status}`);
      }
      onRejected();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setPending(null);
    }
  }

  async function handleAddAndMatch() {
    setError("");
    const amountCents = Math.round(parseFloat(addForm.amount) * 100);
    if (!addForm.fundId || !addForm.accountCode || !addForm.date || !addForm.description || Number.isNaN(amountCents)) {
      setError("Fill in every field with a valid amount before creating.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(addForm.date)) {
      setError("Date must be in YYYY-MM-DD format.");
      return;
    }
    if (!window.confirm("Create this GL entry and match it to the transaction? This can't be undone.")) {
      return;
    }

    setPending("add");
    try {
      const createRes = await fetch("/api/gl-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fundId: addForm.fundId,
          accountCode: addForm.accountCode,
          amountCents,
          date: addForm.date,
          description: addForm.description,
        }),
      });
      if (!createRes.ok) {
        const data = await createRes.json().catch(() => ({}));
        throw new Error(data.error ?? "Couldn't create GL entry");
      }
      const { entry } = await createRes.json();
      await matchTo(entry.id, "add");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setPending(null);
    }
  }

  function CandidateRow({ c, pendingKey }: { c: Candidate; pendingKey: string }) {
    return (
      <li className="flex items-center justify-between gap-3 rounded-md border border-zinc-200 bg-white px-3 py-2">
        <span className="text-zinc-700">
          {c.date} · {c.accountCode} · fund {c.fundId} · {formatCents(c.amountCents)} — {c.description}
          {c.source === "manual" && (
            <span className="ml-2 rounded-full bg-purple-100 px-1.5 py-0.5 text-[10px] font-medium text-purple-700">
              manual
            </span>
          )}
        </span>
        {canReview && (
          <button
            onClick={() => matchTo(c.id, pendingKey)}
            disabled={pending !== null}
            className="shrink-0 rounded-md border border-emerald-600 px-2.5 py-1 text-xs font-medium text-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {pending === pendingKey ? "Matching…" : "Match"}
          </button>
        )}
      </li>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-medium text-zinc-500">Possible GL matches (by amount &amp; date)</p>
        {nearCandidates === null ? (
          <p className="mt-1 text-xs text-zinc-400">Searching…</p>
        ) : nearCandidates.length === 0 ? (
          <p className="mt-1 text-xs text-zinc-400">No close candidates found nearby in amount or date.</p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {nearCandidates.map((c) => (
              <CandidateRow key={c.id} c={c} pendingKey={`near-${c.id}`} />
            ))}
          </ul>
        )}
      </div>

      {canReview && (
        <div>
          <button
            onClick={() => {
              const next = !browseOpen;
              setBrowseOpen(next);
              if (next && browseResults === null) runBrowse("");
            }}
            className="text-xs font-medium text-blue-600 underline"
          >
            {browseOpen ? "Hide" : "Browse all unmatched GL entries"}
          </button>
          {browseOpen && (
            <div className="mt-2 space-y-2">
              <input
                type="text"
                placeholder="Search by description, account code, or fund…"
                value={browseQuery}
                onChange={(e) => runBrowse(e.target.value)}
                className="w-full rounded-md border border-zinc-300 px-2 py-1.5 text-xs focus:outline-none"
              />
              {browseResults === null ? (
                <p className="text-xs text-zinc-400">Loading…</p>
              ) : browseResults.length === 0 ? (
                <p className="text-xs text-zinc-400">No unmatched GL entries found.</p>
              ) : (
                <ul className="max-h-56 space-y-1.5 overflow-y-auto">
                  {browseResults.map((c) => (
                    <CandidateRow key={c.id} c={c} pendingKey={`browse-${c.id}`} />
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {canReview && (
        <div>
          <button
            onClick={() => setAddFormOpen((v) => !v)}
            className="text-xs font-medium text-blue-600 underline"
          >
            {addFormOpen ? "Cancel" : "GL entry doesn't exist yet? Add one"}
          </button>
          {addFormOpen && (
            <div className="mt-2 grid grid-cols-2 gap-2 rounded-md border border-zinc-200 bg-white p-3 sm:grid-cols-3">
              <input
                placeholder="Fund ID (e.g. 100)"
                value={addForm.fundId}
                onChange={(e) => setAddForm({ ...addForm, fundId: e.target.value })}
                className="rounded-md border border-zinc-300 px-2 py-1.5 text-xs focus:outline-none"
              />
              <input
                placeholder="Account code (e.g. 100-5100)"
                value={addForm.accountCode}
                onChange={(e) => setAddForm({ ...addForm, accountCode: e.target.value })}
                className="rounded-md border border-zinc-300 px-2 py-1.5 text-xs focus:outline-none"
              />
              <input
                placeholder="Amount (e.g. -450.00)"
                value={addForm.amount}
                onChange={(e) => setAddForm({ ...addForm, amount: e.target.value })}
                className="rounded-md border border-zinc-300 px-2 py-1.5 text-xs focus:outline-none"
              />
              <input
                placeholder="Date (YYYY-MM-DD)"
                value={addForm.date}
                onChange={(e) => setAddForm({ ...addForm, date: e.target.value })}
                className="rounded-md border border-zinc-300 px-2 py-1.5 text-xs focus:outline-none"
              />
              <input
                placeholder="Description"
                value={addForm.description}
                onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
                className="col-span-2 rounded-md border border-zinc-300 px-2 py-1.5 text-xs focus:outline-none sm:col-span-1"
              />
              <button
                onClick={handleAddAndMatch}
                disabled={pending !== null}
                className="col-span-2 rounded-md border border-emerald-600 px-2.5 py-1.5 text-xs font-medium text-emerald-600 disabled:cursor-not-allowed disabled:opacity-40 sm:col-span-3"
              >
                {pending === "add" ? "Creating & matching…" : "Create GL entry & match"}
              </button>
            </div>
          )}
        </div>
      )}

      {canReview && (
        <button
          onClick={handleReject}
          disabled={pending !== null}
          className="rounded-md border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending === "reject" ? "Confirming…" : "Confirm no match — mark unmatched"}
        </button>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
