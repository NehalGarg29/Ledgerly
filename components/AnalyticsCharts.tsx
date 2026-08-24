"use client";

import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList,
} from "recharts";

type Slice = { label: string; value: number };

const STATUS_COLORS: Record<string, string> = {
  "Auto-matched": "#10b981",
  "Pending Review": "#f59e0b",
  "Approved": "#059669",
  "Rejected": "#ef4444",
  "Unmatched": "#a1a1aa",
};

const REVIEW_COLORS: Record<string, string> = {
  Approved: "#059669",
  Rejected: "#ef4444",
};

function Legend({ data, total }: { data: Slice[]; total: number }) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2">
      {data.map((slice) => (
        <div key={slice.label} className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: STATUS_COLORS[slice.label] ?? "#a1a1aa" }}
            />
            <span className="text-zinc-600">{slice.label}</span>
          </div>
          <span className="font-medium text-zinc-900">
            {slice.value}
            <span className="ml-1 text-zinc-400">
              ({total === 0 ? 0 : Math.round((slice.value / total) * 100)}%)
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

export function AnalyticsCharts({
  statusBreakdown,
  humanReview,
  totalTxns,
  reconciliationRate,
}: {
  statusBreakdown: Slice[];
  humanReview: Slice[];
  totalTxns: number;
  reconciliationRate: number;
}) {
  const hasStatusData = totalTxns > 0;
  const totalReviewed = humanReview.reduce((sum, s) => sum + s.value, 0);
  const hasReviewData = totalReviewed > 0;
  const reconciledPct = Math.round(reconciliationRate * 100);

  return (
    <div className="mt-8 grid grid-cols-1 gap-3 lg:grid-cols-2">
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex items-baseline justify-between">
          <h2 className="text-base font-semibold text-zinc-900">Match Status Breakdown</h2>
          <span className="text-xs text-zinc-400">{totalTxns} transactions</span>
        </div>
        <p className="mt-1 text-xs text-zinc-500">
          Every bank transaction, by reconciliation status.
        </p>

        {hasStatusData ? (
          <>
            <div className="relative mt-2 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusBreakdown}
                    dataKey="value"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    innerRadius={62}
                    outerRadius={95}
                    paddingAngle={2}
                    label={({ percent }) =>
                        (percent ?? 0) > 0.05 ? `${Math.round((percent ?? 0) * 100)}%` : ""
                    }
                    labelLine={false}
                  >
                    {statusBreakdown.map((slice) => (
                      <Cell key={slice.label} fill={STATUS_COLORS[slice.label] ?? "#a1a1aa"} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-semibold text-emerald-600">
                  {reconciledPct}%
                </span>
                <span className="text-xs text-zinc-500">reconciled</span>
              </div>
            </div>
            <Legend data={statusBreakdown} total={totalTxns} />
          </>
        ) : (
          <p className="mt-6 text-sm text-zinc-500">No transaction data yet.</p>
        )}
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex items-baseline justify-between">
          <h2 className="text-base font-semibold text-zinc-900">Human Review Outcomes</h2>
          {hasReviewData && (
            <span className="text-xs text-zinc-400">{totalReviewed} reviewed</span>
          )}
        </div>
        <p className="mt-1 text-xs text-zinc-500">
          Fuzzy and AI-suggested matches a human has approved or rejected.
        </p>

        {hasReviewData ? (
          <div className="mt-6 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={humanReview} margin={{ top: 24, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={80}>
                  {humanReview.map((slice) => (
                    <Cell key={slice.label} fill={REVIEW_COLORS[slice.label] ?? "#a1a1aa"} />
                  ))}
                  <LabelList dataKey="value" position="top" style={{ fill: "#18181b", fontSize: 12, fontWeight: 600 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="mt-8 flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-200 py-10 text-center">
            <p className="text-sm text-zinc-500">
              No reviewed fuzzy or AI-suggested matches yet.
            </p>
            <p className="mt-1 text-xs text-zinc-400">
              Approve or reject one on the Exceptions page to see it here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}