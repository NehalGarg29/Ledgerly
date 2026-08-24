import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const transaction = await prisma.bankTransaction.findUnique({ where: { id } });
  if (!transaction) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }

  // Loose net: same-ish amount (+/-15%, minimum $1 tolerance) within a 30-day
  // window, unmatched GL entries only. This is a manual-review aid, not the
  // deterministic matcher — a human picks from the results, nothing here
  // auto-applies.
  const amountTolerance = Math.max(Math.round(Math.abs(transaction.amountCents) * 0.15), 100);
  const txnDate = new Date(transaction.date);
  const windowStart = new Date(txnDate);
  windowStart.setDate(windowStart.getDate() - 30);
  const windowEnd = new Date(txnDate);
  windowEnd.setDate(windowEnd.getDate() + 30);

  const candidates = await prisma.gLEntry.findMany({
    where: {
      matches: { none: {} },
      amountCents: {
        gte: transaction.amountCents - amountTolerance,
        lte: transaction.amountCents + amountTolerance,
      },
      date: {
        gte: windowStart.toISOString().slice(0, 10),
        lte: windowEnd.toISOString().slice(0, 10),
      },
    },
    take: 25,
  });

  const ranked = candidates
    .map((c) => ({
      entry: c,
      amountDiff: Math.abs(c.amountCents - transaction.amountCents),
      dateDiff: Math.abs(new Date(c.date).getTime() - txnDate.getTime()),
    }))
    .sort((a, b) => a.amountDiff - b.amountDiff || a.dateDiff - b.dateDiff)
    .slice(0, 8)
    .map((r) => r.entry);

  return NextResponse.json({ candidates: ranked });
}
