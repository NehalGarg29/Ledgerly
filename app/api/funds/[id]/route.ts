import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getRoleFromRequest, getCompanyIdFromRequest } from "../../../../lib/getRoleFromRequest";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const role = getRoleFromRequest(request);
  if (role !== "admin") {
    return NextResponse.json({ error: "Only admins can edit funds." }, { status: 403 });
  }
  const companyId = getCompanyIdFromRequest(request);
  if (!companyId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.fund.findFirst({ where: { id, companyId } });
  if (!existing) {
    return NextResponse.json({ error: "Fund not found." }, { status: 404 });
  }

  const body = await request.json();
  const { name, parentCode, isActive } = body as {
    name?: string;
    parentCode?: string | null;
    isActive?: boolean;
  };

  let parentFundId: string | null | undefined = undefined;
  if (parentCode !== undefined) {
    if (parentCode === null) {
      parentFundId = null;
    } else if (parentCode === existing.code) {
      return NextResponse.json({ error: "A fund can't be its own parent." }, { status: 400 });
    } else {
      const parent = await prisma.fund.findFirst({ where: { companyId, code: parentCode } });
      if (!parent) {
        return NextResponse.json({ error: `Parent fund "${parentCode}" not found.` }, { status: 400 });
      }
      parentFundId = parent.id;
    }
  }

  const fund = await prisma.fund.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(parentFundId !== undefined ? { parentFundId } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
    },
  });

  await prisma.auditLogEntry.create({
    data: {
      entityType: "Fund",
      entityId: fund.id,
      action: "fund_updated",
      beforeState: {
        name: existing.name,
        parentFundId: existing.parentFundId,
        isActive: existing.isActive,
      },
      afterState: { name: fund.name, parentFundId: fund.parentFundId, isActive: fund.isActive },
      companyId,
    },
  });

  return NextResponse.json({ fund });
}
