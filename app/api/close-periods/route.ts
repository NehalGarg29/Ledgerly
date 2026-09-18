import { NextRequest, NextResponse } from "next/server";
import { listRecentPeriods, getPeriodChecklist } from "../../../lib/closePeriod";
import { getCompanyIdFromRequest } from "../../../lib/getRoleFromRequest";

export async function GET(request: NextRequest) {
  const companyId = getCompanyIdFromRequest(request);
  if (!companyId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const periods = await listRecentPeriods(companyId);
  const checklists = await Promise.all(periods.map((p) => getPeriodChecklist(companyId, p)));
  return NextResponse.json({ periods: checklists });
}
