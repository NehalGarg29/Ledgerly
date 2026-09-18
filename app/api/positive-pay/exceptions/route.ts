import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getCompanyIdFromRequest } from "../../../../lib/getRoleFromRequest";

export async function GET(request: NextRequest) {
  const companyId = getCompanyIdFromRequest(request);
  if (!companyId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const exceptions = await prisma.positivePayException.findMany({
    where: { companyId, status: "pending" },
    include: { bankTransaction: true, issuedCheck: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ exceptions });
}
