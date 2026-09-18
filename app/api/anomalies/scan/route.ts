import { NextRequest, NextResponse } from "next/server";
import { getRoleFromRequest } from "../../../../lib/getRoleFromRequest";
import { detectAnomalies } from "../../../../lib/anomalyDetection";

export async function POST(request: NextRequest) {
  const role = getRoleFromRequest(request);
  if (role === "viewer") {
    return NextResponse.json({ error: "Viewers cannot run an anomaly scan" }, { status: 403 });
  }

  const result = await detectAnomalies();
  return NextResponse.json(result);
}
