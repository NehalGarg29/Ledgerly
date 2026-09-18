import { NextRequest, NextResponse } from "next/server";
import { getRoleFromRequest } from "../../../../lib/getRoleFromRequest";
import { runPositivePayPass } from "../../../../lib/positivePay";

export async function POST(request: NextRequest) {
  const role = getRoleFromRequest(request);
  if (role === "viewer") {
    return NextResponse.json({ error: "Viewers cannot run a positive pay scan" }, { status: 403 });
  }

  const result = await runPositivePayPass();
  return NextResponse.json(result);
}
