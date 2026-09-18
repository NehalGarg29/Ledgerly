import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { getCompanyIdFromRequest } from "../../../lib/getRoleFromRequest";

export async function GET(request: NextRequest) {
  const companyId = getCompanyIdFromRequest(request);
  if (!companyId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const flags = await prisma.anomalyFlag.findMany({
    where: { companyId, status: "pending" },
    include: { bankTransaction: true },
    orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
  });
  return NextResponse.json({ flags });
}
