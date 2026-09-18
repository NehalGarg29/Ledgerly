import { NextResponse } from "next/server";
import { listRecentPeriods, getPeriodChecklist } from "../../../lib/closePeriod";

export async function GET() {
  const periods = await listRecentPeriods();
  const checklists = await Promise.all(periods.map((p) => getPeriodChecklist(p)));
  return NextResponse.json({ periods: checklists });
}
