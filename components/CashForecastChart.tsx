"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { formatCents } from "../lib/format";

type ForecastPoint = { date: string; balanceCents: number };

export default function CashForecastChart({ projection }: { projection: ForecastPoint[] }) {
  const data = projection.map((p) => ({
    date: p.date.slice(5),
    fullDate: p.date,
    dollars: p.balanceCents / 100,
  }));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 16, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f4" />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#71717a" }} tickLine={false} axisLine={{ stroke: "#e4e4e7" }} />
          <YAxis
            tick={{ fontSize: 11, fill: "#71717a" }}
            tickLine={false}
            axisLine={{ stroke: "#e4e4e7" }}
            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
            width={48}
          />
          <Tooltip
            formatter={(value) => formatCents(Math.round(Number(value) * 100))}
            labelFormatter={(_, payload) => payload?.[0]?.payload?.fullDate ?? ""}
            contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: "#e4e4e7" }}
          />
          <Line type="monotone" dataKey="dollars" stroke="#0f766e" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
