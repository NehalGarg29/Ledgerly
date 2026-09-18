import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { getRoleFromRequest, getUserIdFromRequest } from "../../../../../lib/getRoleFromRequest";
import { getPeriodChecklist } from "../../../../../lib/closePeriod";

export async function POST(request: NextRequest, { params }: { params: Promise<{ period: string }> }) {
  const role = getRoleFromRequest(request);
  if (role === "viewer") {
    return NextResponse.json({ error: "Viewers cannot close a period" }, { status: 403 });
  }

  const { period } = await params;
  const checklist = await getPeriodChecklist(period);

  if (checklist.status === "closed") {
    return NextResponse.json({ error: `${period} is already closed.` }, { status: 409 });
  }
  if (!checklist.canClose) {
    return NextResponse.json(
      {
        error: `Can't close ${period} — ${checklist.pendingReviewCount} pending review match(es) and ${checklist.unmatchedCount} unmatched transaction(s) still need to be resolved.`,
      },
      { status: 422 }
    );
  }

  const userId = getUserIdFromRequest(request);
  const closePeriod = await prisma.closePeriod.upsert({
    where: { period },
    create: { period, status: "closed", closedAt: new Date(), closedByUserId: userId },
    update: { status: "closed", closedAt: new Date(), closedByUserId: userId },
  });

  await prisma.auditLogEntry.create({
    data: {
      entityType: "ClosePeriod",
      entityId: closePeriod.id,
      action: "period_closed",
      actorUserId: userId,
      afterState: { period, closedAt: closePeriod.closedAt },
    },
  });

  return NextResponse.json({ closePeriod });
}
