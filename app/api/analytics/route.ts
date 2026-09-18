import { NextRequest, NextResponse } from "next/server";
import { getAnalyticsStats } from "../../../lib/analyticsStats";
import { getCompanyIdFromRequest } from "../../../lib/getRoleFromRequest";

export async function GET(request: NextRequest) {
  const companyId = getCompanyIdFromRequest(request);
  if (!companyId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const stats = await getAnalyticsStats(companyId);
  return NextResponse.json(stats);
}