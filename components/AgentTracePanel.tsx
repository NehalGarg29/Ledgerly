import { formatCents } from "../lib/format";

export type ToolCall = {
  step: number;
  tool: string;
  args: unknown;
  result: unknown;
};

export type AgentTrace = {
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

export function AgentTracePanel({ trace }: { trace: AgentTrace }) {
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
