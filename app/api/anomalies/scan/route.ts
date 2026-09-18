import { NextRequest, NextResponse } from "next/server";
import { getRoleFromRequest, getCompanyIdFromRequest } from "../../../../lib/getRoleFromRequest";
import { detectAnomalies } from "../../../../lib/anomalyDetection";

export async function POST(request: NextRequest) {
  const role = getRoleFromRequest(request);
  if (role === "viewer") {
    return NextResponse.json({ error: "Viewers cannot run an anomaly scan" }, { status: 403 });
  }
  const companyId = getCompanyIdFromRequest(request);
  if (!companyId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const result = await detectAnomalies(companyId);
  return NextResponse.json(result);
}
