import { NextRequest, NextResponse } from "next/server";
import { getCashForecast } from "../../../lib/cashForecast";
import { getCompanyIdFromRequest } from "../../../lib/getRoleFromRequest";

export async function GET(request: NextRequest) {
  const companyId = getCompanyIdFromRequest(request);
  if (!companyId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const forecast = await getCashForecast(companyId);
  return NextResponse.json(forecast);
}
