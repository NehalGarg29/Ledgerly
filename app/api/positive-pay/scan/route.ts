import { NextRequest, NextResponse } from "next/server";
import { getRoleFromRequest, getCompanyIdFromRequest } from "../../../../lib/getRoleFromRequest";
import { runPositivePayPass } from "../../../../lib/positivePay";

export async function POST(request: NextRequest) {
  const role = getRoleFromRequest(request);
  if (role === "viewer") {
    return NextResponse.json({ error: "Viewers cannot run a positive pay scan" }, { status: 403 });
  }
  const companyId = getCompanyIdFromRequest(request);
  if (!companyId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const result = await runPositivePayPass(companyId);
  return NextResponse.json(result);
}
