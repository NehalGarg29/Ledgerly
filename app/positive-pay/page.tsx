"use client";

import { useRole } from "../../lib/useRole";
import PositivePayView from "../../components/PositivePayView";

export default function PositivePayPage() {
  const role = useRole();
  const canReview = role !== "viewer";

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8">
      <p className="text-sm text-zinc-500">
        Register checks as you issue them. Bank transactions are checked against this register on every
        upload — unknown check numbers, amount mismatches, and duplicate presentments show up as
        exceptions below for you to pay or return.
      </p>

      {!canReview && (
        <p className="mt-4 rounded-md bg-zinc-100 px-3 py-2 text-xs text-zinc-600">
          Viewing as Viewer — read only.
        </p>
      )}

      <div className="mt-6">
        <PositivePayView canReview={canReview} />
      </div>
    </main>
  );
}
