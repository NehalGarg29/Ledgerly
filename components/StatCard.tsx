import Link from "next/link";
import type { ReactNode } from "react";

export type StatCardProps = {
  label: string;
  value: string;
  sub?: string;
  href?: string;
  accent?: string;
  iconBg?: string;
  icon?: ReactNode;
  progress?: number;
};

export default function StatCard({
  label,
  value,
  sub,
  href,
  accent = "text-zinc-900",
  iconBg = "bg-zinc-100 text-zinc-600",
  icon,
  progress,
}: StatCardProps) {
  const content = (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition-colors hover:border-emerald-300">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-zinc-500">{label}</p>
        {icon && (
          <span className={`flex h-8 w-8 items-center justify-center rounded-full ${iconBg}`}>{icon}</span>
        )}
      </div>
      <p className={`mt-2 text-3xl font-semibold tracking-tight ${accent}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-zinc-500">{sub}</p>}
      {progress !== undefined && (
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
          <div
            className="h-full rounded-full bg-emerald-500"
            style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
          />
        </div>
      )}
    </div>
  );

  if (!href) return content;
  return <Link href={href}>{content}</Link>;
}

export function StatCardGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">{children}</div>;
}
