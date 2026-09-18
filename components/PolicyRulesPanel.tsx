"use client";

import { useEffect, useState } from "react";
import { formatCents } from "../lib/format";

type PolicyRule = {
  id: string;
  name: string;
  ruleType: "max_amount" | "inactive_fund_or_account" | "restricted_account_type";
  severity: "block" | "warn";
  fundCode: string | null;
  thresholdCents: number | null;
  allowedAccountTypes: string[];
  isActive: boolean;
};

const RULE_TYPE_LABELS: Record<PolicyRule["ruleType"], string> = {
  max_amount: "Amount over threshold",
  inactive_fund_or_account: "Deactivated fund/account",
  restricted_account_type: "Restricted account type",
};

const ACCOUNT_TYPES = ["asset", "liability", "equity", "revenue", "expense"];

export default function PolicyRulesPanel() {
  const [rules, setRules] = useState<PolicyRule[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);

  const [form, setForm] = useState({
    name: "",
    ruleType: "max_amount" as PolicyRule["ruleType"],
    severity: "warn" as PolicyRule["severity"],
    fundCode: "",
    thresholdDollars: "",
    allowedAccountTypes: [] as string[],
  });

  function load() {
    fetch("/api/policy-rules")
      .then((r) => r.json())
      .then((d) => {
        setRules(d.rules ?? []);
        setLoaded(true);
      });
  }

  useEffect(load, []);

  function toggleAccountType(type: string) {
    setForm((f) => ({
      ...f,
      allowedAccountTypes: f.allowedAccountTypes.includes(type)
        ? f.allowedAccountTypes.filter((t) => t !== type)
        : [...f.allowedAccountTypes, type],
    }));
  }

  async function submit() {
    setError("");
    const res = await fetch("/api/policy-rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        ruleType: form.ruleType,
        severity: form.severity,
        fundCode: form.fundCode || undefined,
        thresholdCents:
          form.ruleType === "max_amount" ? Math.round(Number(form.thresholdDollars) * 100) : undefined,
        allowedAccountTypes: form.ruleType === "restricted_account_type" ? form.allowedAccountTypes : undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to create rule.");
      return;
    }
    setForm({
      name: "",
      ruleType: "max_amount",
      severity: "warn",
      fundCode: "",
      thresholdDollars: "",
      allowedAccountTypes: [],
    });
    setAdding(false);
    load();
  }

  async function toggleActive(id: string, isActive: boolean) {
    setError("");
    const res = await fetch(`/api/policy-rules/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to update rule.");
      return;
    }
    load();
  }

  if (!loaded) {
    return <p className="mt-6 text-sm text-zinc-500">Loading…</p>;
  }

  return (
    <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">Policy rules</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Compliance rules the reconciliation agent and human reviewers are both held to.
          </p>
        </div>
        <button
          onClick={() => setAdding((v) => !v)}
          className="text-xs font-medium text-teal-700 hover:text-teal-900"
        >
          {adding ? "Cancel" : "+ Add rule"}
        </button>
      </div>

      {error && (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {adding && (
        <div className="mt-4 space-y-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
          <div className="flex flex-wrap gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-600">Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1 w-56 rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600">Rule type</label>
              <select
                value={form.ruleType}
                onChange={(e) => setForm({ ...form, ruleType: e.target.value as PolicyRule["ruleType"] })}
                className="mt-1 rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
              >
                {Object.entries(RULE_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600">Severity</label>
              <select
                value={form.severity}
                onChange={(e) => setForm({ ...form, severity: e.target.value as PolicyRule["severity"] })}
                className="mt-1 rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
              >
                <option value="warn">Warn (recorded, doesn't block)</option>
                <option value="block">Block (approval refused)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600">Fund code (blank = all funds)</label>
              <input
                value={form.fundCode}
                onChange={(e) => setForm({ ...form, fundCode: e.target.value })}
                placeholder="e.g. 100"
                className="mt-1 w-32 rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
              />
            </div>
          </div>

          {form.ruleType === "max_amount" && (
            <div>
              <label className="block text-xs font-medium text-zinc-600">Threshold ($)</label>
              <input
                type="number"
                value={form.thresholdDollars}
                onChange={(e) => setForm({ ...form, thresholdDollars: e.target.value })}
                className="mt-1 w-40 rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
              />
            </div>
          )}

          {form.ruleType === "restricted_account_type" && (
            <div>
              <label className="block text-xs font-medium text-zinc-600">Allowed account types</label>
              <div className="mt-1 flex flex-wrap gap-3">
                {ACCOUNT_TYPES.map((type) => (
                  <label key={type} className="flex items-center gap-1.5 text-sm text-zinc-700">
                    <input
                      type="checkbox"
                      checked={form.allowedAccountTypes.includes(type)}
                      onChange={() => toggleAccountType(type)}
                    />
                    {type}
                  </label>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={submit}
            className="rounded-md bg-teal-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-900"
          >
            Save rule
          </button>
        </div>
      )}

      <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-200">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-zinc-50 text-left text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-4 py-2 font-medium">Rule</th>
              <th className="px-4 py-2 font-medium">Type</th>
              <th className="px-4 py-2 font-medium">Severity</th>
              <th className="px-4 py-2 font-medium">Scope</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {rules.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-zinc-500">
                  No policy rules yet.
                </td>
              </tr>
            ) : (
              rules.map((rule) => (
                <tr key={rule.id} className={!rule.isActive ? "opacity-50" : ""}>
                  <td className="px-4 py-2 text-zinc-900">{rule.name}</td>
                  <td className="px-4 py-2 text-zinc-600">
                    {RULE_TYPE_LABELS[rule.ruleType]}
                    {rule.ruleType === "max_amount" && rule.thresholdCents
                      ? ` (${formatCents(rule.thresholdCents)})`
                      : ""}
                    {rule.ruleType === "restricted_account_type" && rule.allowedAccountTypes.length > 0
                      ? ` (${rule.allowedAccountTypes.join(", ")})`
                      : ""}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        rule.severity === "block" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {rule.severity}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-zinc-600">{rule.fundCode ? `Fund ${rule.fundCode}` : "All funds"}</td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => toggleActive(rule.id, !rule.isActive)}
                      className="text-xs font-medium text-teal-700 hover:text-teal-900"
                    >
                      {rule.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
