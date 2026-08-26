import { getAuditLog, ACTION_LABELS } from "../../lib/getAuditLog";

export const dynamic = "force-dynamic";

const ACTION_STYLES: Record<string, string> = {
  agent_proposed_match: "bg-blue-100 text-blue-700",
  match_approved: "bg-emerald-100 text-emerald-700",
  match_rejected: "bg-red-100 text-red-700",
  manual_match_created: "bg-purple-100 text-purple-700",
  manual_gl_entry_created: "bg-amber-100 text-amber-700",
};

export default async function AuditLogPage() {
  const rows = await getAuditLog();

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8">
      <p className="text-sm text-zinc-500">
        Every action taken on a transaction or GL entry, in the order it happened. Nothing here is ever edited or deleted.
      </p>

      {rows.length === 0 ? (
        <p className="mt-6 text-sm text-zinc-500">No activity yet.</p>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-xl border border-zinc-200 bg-white">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-zinc-50 text-left text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-4 py-2 font-medium">When</th>
                <th className="px-4 py-2 font-medium">Action</th>
                <th className="px-4 py-2 font-medium">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-2 text-xs text-zinc-500">
                    {new Date(row.timestamp).toLocaleString()}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        ACTION_STYLES[row.action] ?? "bg-zinc-100 text-zinc-600"
                      }`}
                    >
                      {ACTION_LABELS[row.action] ?? row.action}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-zinc-900">{row.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
