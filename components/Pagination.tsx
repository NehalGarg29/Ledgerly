"use client";

import Link from "next/link";
import { useSearchParams, usePathname } from "next/navigation";

export function Pagination({ page, totalPages }: { page: number; totalPages: number }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  function hrefFor(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (p <= 1) params.delete("page");
    else params.set("page", String(p));
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  }

  if (totalPages <= 1) return null;

  return (
    <div className="mt-4 flex items-center justify-between text-sm">
      <Link
        href={hrefFor(page - 1)}
        aria-disabled={page <= 1}
        className={`rounded-md border border-zinc-200 px-3 py-1.5 font-medium ${
          page <= 1 ? "pointer-events-none opacity-40" : "text-zinc-700 hover:bg-zinc-50"
        }`}
      >
        Previous
      </Link>
      <span className="text-xs text-zinc-500">
        Page {page} of {totalPages}
      </span>
      <Link
        href={hrefFor(page + 1)}
        aria-disabled={page >= totalPages}
        className={`rounded-md border border-zinc-200 px-3 py-1.5 font-medium ${
          page >= totalPages ? "pointer-events-none opacity-40" : "text-zinc-700 hover:bg-zinc-50"
        }`}
      >
        Next
      </Link>
    </div>
  );
}
