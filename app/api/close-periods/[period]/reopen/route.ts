import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { getRoleFromRequest, getUserIdFromRequest, getCompanyIdFromRequest } from "../../../../../lib/getRoleFromRequest";

export async function POST(request: NextRequest, { params }: { params: Promise<{ period: string }> }) {
  const role = getRoleFromRequest(request);
  if (role === "viewer") {
    return NextResponse.json({ error: "Viewers cannot reopen a period" }, { status: 403 });
  }
  const companyId = getCompanyIdFromRequest(request);
  if (!companyId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { period } = await params;
  const existing = await prisma.closePeriod.findFirst({ where: { companyId, period } });
  if (!existing || existing.status !== "closed") {
    return NextResponse.json({ error: `${period} is not currently closed.` }, { status: 409 });
  }

  const userId = getUserIdFromRequest(request);
  const closePeriod = await prisma.closePeriod.update({
    where: { companyId_period: { companyId, period } },
    data: { status: "open" },
  });

  await prisma.auditLogEntry.create({
    data: {
      entityType: "ClosePeriod",
      entityId: closePeriod.id,
      action: "period_reopened",
      actorUserId: userId,
      beforeState: { period, status: "closed" },
      afterState: { period, status: "open" },
      companyId,
    },
  });

  return NextResponse.json({ closePeriod });
}
