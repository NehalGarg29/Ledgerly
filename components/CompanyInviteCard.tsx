"use client";

import { useEffect, useState } from "react";

export default function CompanyInviteCard() {
  const [name, setName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  function load() {
    fetch("/api/company")
      .then((r) => r.json())
      .then((d) => {
        if (d.company) {
          setName(d.company.name);
          setInviteCode(d.company.inviteCode);
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }

  useEffect(load, []);

  async function regenerate() {
    if (
      !window.confirm(
        "Regenerate the invite code? The old code will stop working immediately — anyone you shared it with will need the new one."
      )
    ) {
      return;
    }
    setRegenerating(true);
    setError("");
    try {
      const res = await fetch("/api/company", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to regenerate invite code.");
      setInviteCode(data.company.inviteCode);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setRegenerating(false);
    }
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can fail silently (e.g. no permission) — no need
      // to surface an error for a convenience action like this.
    }
  }

  if (!loaded) return null;

  return (
    <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-6">
      <h2 className="text-sm font-semibold text-zinc-900">Invite teammates</h2>
      <p className="mt-1 text-xs text-zinc-500">
        Share this code with teammates. They enter it at registration to join {name || "your company"}
        's workspace as a viewer — you can promote them to analyst or admin afterward.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <code className="rounded-md bg-zinc-100 px-3 py-2 text-sm font-semibold tracking-wider text-zinc-900">
          {inviteCode}
        </code>
        <button
          type="button"
          onClick={copyCode}
          className="rounded-md border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
        <button
          type="button"
          onClick={regenerate}
          disabled={regenerating}
          className="rounded-md border border-amber-600 px-3 py-2 text-xs font-medium text-amber-700 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {regenerating ? "Regenerating…" : "Regenerate"}
        </button>
      </div>

      {error && <p className="mt-3 text-xs text-red-600">{error}</p>}
    </div>
  );
}
