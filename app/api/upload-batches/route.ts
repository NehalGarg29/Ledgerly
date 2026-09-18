import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { getCompanyIdFromRequest } from "../../../lib/getRoleFromRequest";

export async function GET(request: NextRequest) {
  const companyId = getCompanyIdFromRequest(request);
  if (!companyId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const batches = await prisma.uploadBatch.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json({ batches });
}