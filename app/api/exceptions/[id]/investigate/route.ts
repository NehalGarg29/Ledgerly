import { NextRequest, NextResponse } from "next/server";
import { getRoleFromRequest, getCompanyIdFromRequest } from "../../../../../lib/getRoleFromRequest";
import { runAgentOnTransaction } from "../../../../../lib/agent/runAgent";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const role = getRoleFromRequest(request);
  if (role === "viewer") {
    return NextResponse.json({ error: "Viewers cannot trigger agent investigation" }, { status: 403 });
  }
  const companyId = getCompanyIdFromRequest(request);
  if (!companyId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const trace = await runAgentOnTransaction(companyId, id);
    return NextResponse.json({ trace });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Agent investigation failed" },
      { status: 400 }
    );
  }
}