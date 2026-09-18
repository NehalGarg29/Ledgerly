import { listRecentPeriods, getPeriodChecklist } from "../../lib/closePeriod";
import { getServerSession } from "../../lib/getServerSession";
import ClosePeriodsView from "../../components/ClosePeriodsView";

export const dynamic = "force-dynamic";

export default async function ClosePage() {
  const session = await getServerSession();
  if (!session) return null;

  const canReview = session.role !== "viewer";
  const periodList = await listRecentPeriods(session.companyId);
  const periods = await Promise.all(
    periodList.map((p) => getPeriodChecklist(session.companyId, p))
  );

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-8">
      <p className="text-sm text-zinc-500">
        Close a month once every exception dated in it is resolved. Closing locks that month&apos;s
        transactions and GL entries against edits and new uploads.
      </p>
      <div className="mt-6">
        <ClosePeriodsView periods={periods} canReview={canReview} />
      </div>
    </main>
  );
}
