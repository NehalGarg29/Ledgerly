import { getCashForecast } from "../../lib/cashForecast";
import { formatCents } from "../../lib/format";
import CashForecastChart from "../../components/CashForecastChart";

export const dynamic = "force-dynamic";

export default async function ForecastPage() {
  const forecast = await getCashForecast();
  const isGrowing = forecast.avgDailyNetFlowCents >= 0;

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-8">
      <p className="text-sm text-zinc-500">
        A 30-day cash projection based on your historical average daily net flow, plus any checks
        you&apos;ve issued that haven&apos;t cleared yet. This is a simple trend projection, not a
        seasonal forecast — treat it as a directional signal, not a guarantee.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <p className="text-sm font-medium text-zinc-500">Current cash balance</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">
            {formatCents(forecast.currentBalanceCents)}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <p className="text-sm font-medium text-zinc-500">Avg. daily net flow</p>
          <p className={`mt-2 text-2xl font-semibold ${isGrowing ? "text-emerald-600" : "text-red-600"}`}>
            {isGrowing ? "+" : ""}
            {formatCents(forecast.avgDailyNetFlowCents)}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <p className="text-sm font-medium text-zinc-500">Based on</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">{forecast.historyDays} days</p>
          <p className="mt-1 text-xs text-zinc-500">of historical activity</p>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-zinc-900">30-day projected balance</h2>
        <div className="mt-4">
          <CashForecastChart projection={forecast.projection} />
        </div>
      </div>

      <div className="mt-6">
        <h2 className="text-sm font-semibold text-zinc-900">Known upcoming outflows</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Issued checks that haven&apos;t cleared the bank yet — concrete future cash events, not part
          of the trend average above.
        </p>
        <div className="mt-3 overflow-x-auto rounded-xl border border-zinc-200 bg-white">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="bg-zinc-50 text-left text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-4 py-2 font-medium">Check #</th>
                <th className="px-4 py-2 font-medium">Payee</th>
                <th className="px-4 py-2 font-medium">Account</th>
                <th className="px-4 py-2 font-medium">Issued</th>
                <th className="px-4 py-2 font-medium text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {forecast.upcomingOutflows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-zinc-500">
                    No outstanding checks.
                  </td>
                </tr>
              ) : (
                forecast.upcomingOutflows.map((c) => (
                  <tr key={c.checkNumber + c.accountId}>
                    <td className="px-4 py-2 text-zinc-900">#{c.checkNumber}</td>
                    <td className="px-4 py-2 text-zinc-900">{c.payee}</td>
                    <td className="px-4 py-2 text-zinc-600">{c.accountId}</td>
                    <td className="px-4 py-2 text-zinc-600">{c.issueDate}</td>
                    <td className="px-4 py-2 text-right font-medium text-zinc-900">
                      {formatCents(c.amountCents)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
