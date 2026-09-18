import { NextRequest, NextResponse } from "next/server";
import { getDashboardStats } from "../../../../lib/dashboardStats";
import { getCompanyIdFromRequest } from "../../../../lib/getRoleFromRequest";

export async function GET(request: NextRequest) {
  const companyId = getCompanyIdFromRequest(request);
  if (!companyId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const stats = await getDashboardStats(companyId);
  return NextResponse.json(stats);
}