"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatCents } from "../lib/format";
import type { FundNode, AccountNode } from "../lib/chartOfAccounts";

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  asset: "Asset",
  liability: "Liability",
  equity: "Equity",
  revenue: "Revenue",
  expense: "Expense",
};

function FundRow({
  node,
  depth,
  isAdmin,
  onToggleActive,
}: {
  node: FundNode;
  depth: number;
  isAdmin: boolean;
  onToggleActive: (id: string, isActive: boolean) => void;
}) {
  return (
    <>
      <tr className={!node.isActive ? "opacity-50" : ""}>
        <td className="px-4 py-2 text-zinc-900" style={{ paddingLeft: `${16 + depth * 20}px` }}>
          <span className="text-zinc-400">{node.code}</span> {node.name}
        </td>
        <td className="px-4 py-2 text-right font-medium text-zinc-900">
          {formatCents(node.balanceCents)}
        </td>
        {isAdmin && (
          <td className="px-4 py-2 text-right">
            <button
              onClick={() => onToggleActive(node.id, !node.isActive)}
              className="text-xs font-medium text-teal-700 hover:text-teal-900"
            >
              {node.isActive ? "Deactivate" : "Activate"}
            </button>
          </td>
        )}
      </tr>
      {node.children.map((child) => (
        <FundRow key={child.id} node={child} depth={depth + 1} isAdmin={isAdmin} onToggleActive={onToggleActive} />
      ))}
    </>
  );
}

function AccountRow({
  node,
  depth,
  isAdmin,
  onToggleActive,
}: {
  node: AccountNode;
  depth: number;
  isAdmin: boolean;
  onToggleActive: (id: string, isActive: boolean) => void;
}) {
  return (
    <>
      <tr className={!node.isActive ? "opacity-50" : ""}>
        <td className="px-4 py-2 text-zinc-900" style={{ paddingLeft: `${16 + depth * 20}px` }}>
          <span className="text-zinc-400">{node.code}</span> {node.name}
        </td>
        <td className="px-4 py-2 text-xs text-zinc-500">{ACCOUNT_TYPE_LABELS[node.type] ?? node.type}</td>
        <td className="px-4 py-2 text-right font-medium text-zinc-900">
          {formatCents(node.balanceCents)}
        </td>
        {isAdmin && (
          <td className="px-4 py-2 text-right">
            <button
              onClick={() => onToggleActive(node.id, !node.isActive)}
              className="text-xs font-medium text-teal-700 hover:text-teal-900"
            >
              {node.isActive ? "Deactivate" : "Activate"}
            </button>
          </td>
        )}
      </tr>
      {node.children.map((child) => (
        <AccountRow key={child.id} node={child} depth={depth + 1} isAdmin={isAdmin} onToggleActive={onToggleActive} />
      ))}
    </>
  );
}

export default function ChartOfAccountsView({
  funds,
  accounts,
  isAdmin,
}: {
  funds: FundNode[];
  accounts: AccountNode[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [addingFund, setAddingFund] = useState(false);
  const [addingAccount, setAddingAccount] = useState(false);
  const [fundForm, setFundForm] = useState({ code: "", name: "", parentCode: "" });
  const [accountForm, setAccountForm] = useState({ code: "", name: "", type: "expense", parentCode: "" });

  async function toggleFundActive(id: string, isActive: boolean) {
    setError("");
    const res = await fetch(`/api/funds/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to update fund.");
      return;
    }
    router.refresh();
  }

  async function toggleAccountActive(id: string, isActive: boolean) {
    setError("");
    const res = await fetch(`/api/accounts/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to update account.");
      return;
    }
    router.refresh();
  }

  async function submitFund() {
    setError("");
    const res = await fetch("/api/funds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: fundForm.code,
        name: fundForm.name,
        parentCode: fundForm.parentCode || undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to create fund.");
      return;
    }
    setFundForm({ code: "", name: "", parentCode: "" });
    setAddingFund(false);
    router.refresh();
  }

  async function submitAccount() {
    setError("");
    const res = await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: accountForm.code,
        name: accountForm.name,
        type: accountForm.type,
        parentCode: accountForm.parentCode || undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to create account.");
      return;
    }
    setAccountForm({ code: "", name: "", type: "expense", parentCode: "" });
    setAddingAccount(false);
    router.refresh();
  }

  return (
    <div className="space-y-8">
      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>
      )}

      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-900">Funds</h2>
          {isAdmin && (
            <button
              onClick={() => setAddingFund((v) => !v)}
              className="text-xs font-medium text-teal-700 hover:text-teal-900"
            >
              {addingFund ? "Cancel" : "+ Add fund"}
            </button>
          )}
        </div>

        {addingFund && (
          <div className="mt-3 flex flex-wrap items-end gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
            <div>
              <label className="block text-xs font-medium text-zinc-600">Code</label>
              <input
                value={fundForm.code}
                onChange={(e) => setFundForm({ ...fundForm, code: e.target.value })}
                className="mt-1 w-28 rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600">Name</label>
              <input
                value={fundForm.name}
                onChange={(e) => setFundForm({ ...fundForm, name: e.target.value })}
                className="mt-1 w-48 rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600">Parent code (optional)</label>
              <input
                value={fundForm.parentCode}
                onChange={(e) => setFundForm({ ...fundForm, parentCode: e.target.value })}
                className="mt-1 w-32 rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
              />
            </div>
            <button
              onClick={submitFund}
              className="rounded-md bg-teal-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-900"
            >
              Save
            </button>
          </div>
        )}

        <div className="mt-3 overflow-x-auto rounded-xl border border-zinc-200 bg-white">
          <table className="w-full min-w-[420px] text-sm">
            <thead className="bg-zinc-50 text-left text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-4 py-2 font-medium">Fund</th>
                <th className="px-4 py-2 font-medium text-right">Balance</th>
                {isAdmin && <th className="px-4 py-2" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {funds.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 3 : 2} className="px-4 py-6 text-center text-zinc-500">
                    No funds yet.
                  </td>
                </tr>
              ) : (
                funds.map((f) => (
                  <FundRow key={f.id} node={f} depth={0} isAdmin={isAdmin} onToggleActive={toggleFundActive} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-900">Chart of Accounts</h2>
          {isAdmin && (
            <button
              onClick={() => setAddingAccount((v) => !v)}
              className="text-xs font-medium text-teal-700 hover:text-teal-900"
            >
              {addingAccount ? "Cancel" : "+ Add account"}
            </button>
          )}
        </div>

        {addingAccount && (
          <div className="mt-3 flex flex-wrap items-end gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
            <div>
              <label className="block text-xs font-medium text-zinc-600">Code</label>
              <input
                value={accountForm.code}
                onChange={(e) => setAccountForm({ ...accountForm, code: e.target.value })}
                className="mt-1 w-28 rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600">Name</label>
              <input
                value={accountForm.name}
                onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })}
                className="mt-1 w-48 rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600">Type</label>
              <select
                value={accountForm.type}
                onChange={(e) => setAccountForm({ ...accountForm, type: e.target.value })}
                className="mt-1 rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
              >
                {Object.entries(ACCOUNT_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600">Parent code (optional)</label>
              <input
                value={accountForm.parentCode}
                onChange={(e) => setAccountForm({ ...accountForm, parentCode: e.target.value })}
                className="mt-1 w-32 rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
              />
            </div>
            <button
              onClick={submitAccount}
              className="rounded-md bg-teal-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-900"
            >
              Save
            </button>
          </div>
        )}

        <div className="mt-3 overflow-x-auto rounded-xl border border-zinc-200 bg-white">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="bg-zinc-50 text-left text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-4 py-2 font-medium">Account</th>
                <th className="px-4 py-2 font-medium">Type</th>
                <th className="px-4 py-2 font-medium text-right">Balance</th>
                {isAdmin && <th className="px-4 py-2" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {accounts.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 4 : 3} className="px-4 py-6 text-center text-zinc-500">
                    No accounts yet.
                  </td>
                </tr>
              ) : (
                accounts.map((a) => (
                  <AccountRow key={a.id} node={a} depth={0} isAdmin={isAdmin} onToggleActive={toggleAccountActive} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
