import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { getRoleFromRequest, getCompanyIdFromRequest } from "../../../../../lib/getRoleFromRequest";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const role = getRoleFromRequest(request);
  if (role === "viewer") {
    return NextResponse.json({ error: "Viewers cannot void checks" }, { status: 403 });
  }
  const companyId = getCompanyIdFromRequest(request);
  if (!companyId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.issuedCheck.findFirst({ where: { id, companyId } });
  if (!existing) {
    return NextResponse.json({ error: "Check not found" }, { status: 404 });
  }
  if (existing.status === "cleared") {
    return NextResponse.json({ error: "Can't void a check that's already cleared." }, { status: 409 });
  }

  const check = await prisma.issuedCheck.update({
    where: { id },
    data: { status: "voided", voidedAt: new Date() },
  });

  await prisma.auditLogEntry.create({
    data: {
      entityType: "IssuedCheck",
      entityId: check.id,
      action: "check_voided",
      beforeState: { status: existing.status },
      afterState: { status: check.status, checkNumber: check.checkNumber },
      companyId,
    },
  });

  return NextResponse.json({ check });
}
