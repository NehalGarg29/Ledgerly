"use client";

import { useEffect, useState } from "react";
import { formatCents } from "../lib/format";
import StatCard, { StatCardGrid } from "./StatCard";
import { CheckCircleIcon, AlertTriangleIcon, BankNoteIcon } from "./icons";

type IssuedCheck = {
  id: string;
  checkNumber: string;
  payee: string;
  amountCents: number;
  issueDate: string;
  accountId: string;
  status: "issued" | "cleared" | "voided";
};

type PositivePayException = {
  id: string;
  exceptionType: "unauthorized_check" | "amount_mismatch" | "duplicate_presentment";
  detectedCheckNumber: string | null;
  status: "pending" | "paid" | "returned";
  bankTransaction: {
    id: string;
    accountId: string;
    date: string;
    amountCents: number;
    memo: string;
  };
  issuedCheck: IssuedCheck | null;
};

const EXCEPTION_LABELS: Record<PositivePayException["exceptionType"], string> = {
  unauthorized_check: "Unauthorized check",
  amount_mismatch: "Amount mismatch",
  duplicate_presentment: "Duplicate presentment",
};

const EXCEPTION_STYLES: Record<PositivePayException["exceptionType"], string> = {
  unauthorized_check: "bg-red-100 text-red-700",
  amount_mismatch: "bg-amber-100 text-amber-700",
  duplicate_presentment: "bg-purple-100 text-purple-700",
};

export default function PositivePayView({ canReview }: { canReview: boolean }) {
  const [checks, setChecks] = useState<IssuedCheck[]>([]);
  const [exceptions, setExceptions] = useState<PositivePayException[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    checkNumber: "",
    payee: "",
    amountDollars: "",
    issueDate: "",
    accountId: "",
  });

  function load() {
    Promise.all([
      fetch("/api/issued-checks").then((r) => r.json()),
      fetch("/api/positive-pay/exceptions").then((r) => r.json()),
    ]).then(([checksData, exceptionsData]) => {
      setChecks(checksData.checks ?? []);
      setExceptions(exceptionsData.exceptions ?? []);
      setLoaded(true);
    });
  }

  useEffect(load, []);

  async function submitCheck() {
    setError("");
    const res = await fetch("/api/issued-checks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        checkNumber: form.checkNumber,
        payee: form.payee,
        amountCents: Math.round(Number(form.amountDollars) * 100),
        issueDate: form.issueDate,
        accountId: form.accountId,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to issue check.");
      return;
    }
    setForm({ checkNumber: "", payee: "", amountDollars: "", issueDate: "", accountId: "" });
    setAdding(false);
    load();
  }

  async function voidCheck(id: string) {
    if (!window.confirm("Void this check? It can no longer clear once voided.")) return;
    setError("");
    setPendingId(id);
    try {
      const res = await fetch(`/api/issued-checks/${id}/void`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to void check.");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPendingId(null);
    }
  }

  async function reviewException(id: string, action: "pay" | "return") {
    const reason = window.prompt(
      `${action === "pay" ? "Pay" : "Return"} this item. Add a reason (optional), or Cancel to back out.`
    );
    if (reason === null) return;
    setError("");
    setPendingId(id);
    try {
      const res = await fetch(`/api/positive-pay/exceptions/${id}/review`, {
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

  async function rescan() {
    setError("");
    setScanning(true);
    try {
      const res = await fetch("/api/positive-pay/scan", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Scan failed.");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setScanning(false);
    }
  }

  if (!loaded) {
    return <p className="mt-6 text-sm text-zinc-500">Loading…</p>;
  }

  const outstandingChecks = checks.filter((c) => c.status === "issued");
  const outstandingCents = outstandingChecks.reduce((sum, c) => sum + c.amountCents, 0);
  const pendingExceptions = exceptions.filter((e) => e.status === "pending");

  return (
    <div className="space-y-8">
      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>
      )}

      <StatCardGrid>
        <StatCard
          label="Outstanding Checks"
          value={outstandingChecks.length.toString()}
          sub={formatCents(outstandingCents)}
          icon={BankNoteIcon}
          iconBg="bg-blue-50 text-blue-700"
        />
        <StatCard
          label="Cleared Checks"
          value={checks.filter((c) => c.status === "cleared").length.toString()}
          icon={CheckCircleIcon}
          accent="text-emerald-600"
          iconBg="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          label="Pending Exceptions"
          value={pendingExceptions.length.toString()}
          icon={AlertTriangleIcon}
          accent={pendingExceptions.length === 0 ? "text-emerald-600" : "text-red-600"}
          iconBg={pendingExceptions.length === 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}
        />
      </StatCardGrid>

      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-900">
            Exceptions {exceptions.length > 0 && `(${exceptions.length})`}
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

        {exceptions.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">No positive pay exceptions — everything clean.</p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-xl border border-zinc-200 bg-white">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-zinc-50 text-left text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Bank Transaction</th>
                  <th className="px-4 py-2 font-medium">Type</th>
                  <th className="px-4 py-2 font-medium">Register entry</th>
                  {canReview && <th className="px-4 py-2 font-medium text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {exceptions.map((exc) => (
                  <tr key={exc.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-zinc-900">{formatCents(exc.bankTransaction.amountCents)}</p>
                      <p className="text-xs text-zinc-500">
                        {exc.bankTransaction.accountId} · {exc.bankTransaction.date}
                      </p>
                      <p className="text-xs text-zinc-500">{exc.bankTransaction.memo}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${EXCEPTION_STYLES[exc.exceptionType]}`}
                      >
                        {EXCEPTION_LABELS[exc.exceptionType]}
                      </span>
                      <p className="mt-1 text-xs text-zinc-500">check #{exc.detectedCheckNumber}</p>
                    </td>
                    <td className="px-4 py-3">
                      {exc.issuedCheck ? (
                        <>
                          <p className="text-zinc-900">{exc.issuedCheck.payee}</p>
                          <p className="text-xs text-zinc-500">
                            {formatCents(exc.issuedCheck.amountCents)} · {exc.issuedCheck.issueDate}
                          </p>
                        </>
                      ) : (
                        <span className="text-xs text-zinc-400">No matching check on file</span>
                      )}
                    </td>
                    {canReview && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => reviewException(exc.id, "pay")}
                            disabled={pendingId === exc.id}
                            className="rounded-md border border-emerald-600 px-3 py-1 text-xs font-medium text-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Pay
                          </button>
                          <button
                            onClick={() => reviewException(exc.id, "return")}
                            disabled={pendingId === exc.id}
                            className="rounded-md border border-red-600 px-3 py-1 text-xs font-medium text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Return
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-900">Issued checks register</h2>
          {canReview && (
            <button
              onClick={() => setAdding((v) => !v)}
              className="text-xs font-medium text-teal-700 hover:text-teal-900"
            >
              {adding ? "Cancel" : "+ Issue check"}
            </button>
          )}
        </div>

        {adding && (
          <div className="mt-3 flex flex-wrap items-end gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
            <div>
              <label className="block text-xs font-medium text-zinc-600">Check #</label>
              <input
                value={form.checkNumber}
                onChange={(e) => setForm({ ...form, checkNumber: e.target.value })}
                className="mt-1 w-24 rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600">Payee</label>
              <input
                value={form.payee}
                onChange={(e) => setForm({ ...form, payee: e.target.value })}
                className="mt-1 w-44 rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600">Amount ($)</label>
              <input
                type="number"
                value={form.amountDollars}
                onChange={(e) => setForm({ ...form, amountDollars: e.target.value })}
                className="mt-1 w-28 rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600">Issue date</label>
              <input
                type="date"
                value={form.issueDate}
                onChange={(e) => setForm({ ...form, issueDate: e.target.value })}
                className="mt-1 rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600">Bank account</label>
              <input
                value={form.accountId}
                onChange={(e) => setForm({ ...form, accountId: e.target.value })}
                placeholder="e.g. OP-1001"
                className="mt-1 w-32 rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
              />
            </div>
            <button
              onClick={submitCheck}
              className="rounded-md bg-teal-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-900"
            >
              Save
            </button>
          </div>
        )}

        <div className="mt-3 overflow-x-auto rounded-xl border border-zinc-200 bg-white">
          <table className="w-full min-w-[620px] text-sm">
            <thead className="bg-zinc-50 text-left text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-4 py-2 font-medium">Check #</th>
                <th className="px-4 py-2 font-medium">Payee</th>
                <th className="px-4 py-2 font-medium">Account</th>
                <th className="px-4 py-2 font-medium">Issued</th>
                <th className="px-4 py-2 font-medium text-right">Amount</th>
                <th className="px-4 py-2 font-medium">Status</th>
                {canReview && <th className="px-4 py-2" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {checks.length === 0 ? (
                <tr>
                  <td colSpan={canReview ? 7 : 6} className="px-4 py-6 text-center text-zinc-500">
                    No checks issued yet.
                  </td>
                </tr>
              ) : (
                checks.map((check) => (
                  <tr key={check.id} className={check.status === "voided" ? "opacity-50" : ""}>
                    <td className="px-4 py-2 text-zinc-900">#{check.checkNumber}</td>
                    <td className="px-4 py-2 text-zinc-900">{check.payee}</td>
                    <td className="px-4 py-2 text-zinc-600">{check.accountId}</td>
                    <td className="px-4 py-2 text-zinc-600">{check.issueDate}</td>
                    <td className="px-4 py-2 text-right font-medium text-zinc-900">
                      {formatCents(check.amountCents)}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          check.status === "cleared"
                            ? "bg-emerald-100 text-emerald-700"
                            : check.status === "voided"
                              ? "bg-zinc-200 text-zinc-600"
                              : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {check.status}
                      </span>
                    </td>
                    {canReview && (
                      <td className="px-4 py-2 text-right">
                        {check.status === "issued" && (
                          <button
                            onClick={() => voidCheck(check.id)}
                            disabled={pendingId === check.id}
                            className="text-xs font-medium text-red-600 hover:text-red-800"
                          >
                            Void
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
