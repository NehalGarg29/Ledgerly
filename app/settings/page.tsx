"use client";

import { useEffect, useState } from "react";
import { useRole } from "../../lib/useRole";
import PolicyRulesPanel from "../../components/PolicyRulesPanel";
import CompanyInviteCard from "../../components/CompanyInviteCard";

export default function SettingsPage() {
  const role = useRole();
  const isAdmin = role === "admin";

  const [autoApprove, setAutoApprove] = useState("90");
  const [suggest, setSuggest] = useState("50");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/settings/match-thresholds")
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (ok && d.settings) {
          setAutoApprove(String(Math.round(d.settings.autoApproveThreshold * 100)));
          setSuggest(String(Math.round(d.settings.suggestThreshold * 100)));
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  async function handleSave() {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/settings/match-thresholds", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          autoApproveThreshold: Number(autoApprove) / 100,
          suggestThreshold: Number(suggest) / 100,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      setMessage("Saved. This applies to every match from now on.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-8">
      <p className="text-sm text-zinc-500">
        Tune how confident the fuzzy matcher needs to be before it auto-approves a match versus just
        suggesting one for review.
      </p>

      {!isAdmin ? (
        <p className="mt-6 rounded-md bg-zinc-100 px-3 py-2 text-sm text-zinc-600">
          Only admins can view or change match thresholds. Log in as an admin account to make changes.
        </p>
      ) : !loaded ? (
        <p className="mt-6 text-sm text-zinc-500">Loading…</p>
      ) : (
        <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-6">
          <label className="block text-sm font-medium text-zinc-900">
            Auto-approve threshold ({autoApprove}%)
          </label>
          <input
            type="number"
            min={0}
            max={100}
            value={autoApprove}
            onChange={(e) => setAutoApprove(e.target.value)}
            className="mt-2 w-32 rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
          />
          <p className="mt-1 text-xs text-zinc-500">
            A fuzzy match at or above this confidence gets auto-approved with no human review.
          </p>

          <label className="mt-6 block text-sm font-medium text-zinc-900">
            Suggest threshold ({suggest}%)
          </label>
          <input
            type="number"
            min={0}
            max={100}
            value={suggest}
            onChange={(e) => setSuggest(e.target.value)}
            className="mt-2 w-32 rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
          />
          <p className="mt-1 text-xs text-zinc-500">
            Below this, a transaction stays unmatched instead of showing up as a pending review candidate.
          </p>

          <button
            onClick={handleSave}
            disabled={saving}
            className="mt-6 rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save thresholds"}
          </button>

          {message && (
            <p className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>
          )}
          {error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        </div>
      )}

      {isAdmin && <CompanyInviteCard />}
      {isAdmin && <PolicyRulesPanel />}
    </main>
  );
}
