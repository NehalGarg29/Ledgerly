"use client";

import { useRole } from "../../lib/useRole";
import AnomaliesView from "../../components/AnomaliesView";

export default function AnomaliesPage() {
  const role = useRole();
  const canReview = role !== "viewer";

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-8">
      <p className="text-sm text-zinc-500">
        Statistically or behaviorally unusual bank transactions — round-dollar amounts, possible
        duplicates, and outliers relative to each account&apos;s own history. These aren&apos;t
        configured rules like Policy Rules; they&apos;re computed from your data, and every flag shows
        the actual math behind it.
      </p>

      {!canReview && (
        <p className="mt-4 rounded-md bg-zinc-100 px-3 py-2 text-xs text-zinc-600">
          Viewing as Viewer — read only.
        </p>
      )}

      <div className="mt-6">
        <AnomaliesView canReview={canReview} />
      </div>
    </main>
  );
}
