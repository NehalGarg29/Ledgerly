"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from "recharts";

type Slice = { category: string; count: number };

export function AuditLogBreakdownChart({ breakdown }: { breakdown: Slice[] }) {
  if (breakdown.length === 0) {
    return (
      <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-white py-10 text-center">
        <p className="text-sm text-zinc-500">No activity yet.</p>
      </div>
    );
  }

  return (
    <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-zinc-900">Activity by Area</h2>
      <p className="mt-1 text-xs text-zinc-500">Where audit-logged actions are coming from.</p>
      <div className="mt-4 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={breakdown} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" horizontal={false} />
            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis
              type="category"
              dataKey="category"
              tick={{ fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={120}
            />
            <Tooltip />
            <Bar dataKey="count" fill="#0d9488" radius={[0, 6, 6, 0]} maxBarSize={22}>
              <LabelList dataKey="count" position="right" style={{ fill: "#18181b", fontSize: 12, fontWeight: 600 }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
