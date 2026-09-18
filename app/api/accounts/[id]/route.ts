import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getRoleFromRequest, getCompanyIdFromRequest } from "../../../../lib/getRoleFromRequest";

const ACCOUNT_TYPES = ["asset", "liability", "equity", "revenue", "expense"] as const;

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const role = getRoleFromRequest(request);
  if (role !== "admin") {
    return NextResponse.json({ error: "Only admins can edit accounts." }, { status: 403 });
  }
  const companyId = getCompanyIdFromRequest(request);
  if (!companyId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.account.findFirst({ where: { id, companyId } });
  if (!existing) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }

  const body = await request.json();
  const { name, type, parentCode, isActive } = body as {
    name?: string;
    type?: string;
    parentCode?: string | null;
    isActive?: boolean;
  };

  if (type !== undefined && !ACCOUNT_TYPES.includes(type as (typeof ACCOUNT_TYPES)[number])) {
    return NextResponse.json(
      { error: `Type must be one of: ${ACCOUNT_TYPES.join(", ")}.` },
      { status: 400 }
    );
  }

  let parentAccountId: string | null | undefined = undefined;
  if (parentCode !== undefined) {
    if (parentCode === null) {
      parentAccountId = null;
    } else if (parentCode === existing.code) {
      return NextResponse.json({ error: "An account can't be its own parent." }, { status: 400 });
    } else {
      const parent = await prisma.account.findFirst({ where: { companyId, code: parentCode } });
      if (!parent) {
        return NextResponse.json({ error: `Parent account "${parentCode}" not found.` }, { status: 400 });
      }
      parentAccountId = parent.id;
    }
  }

  const account = await prisma.account.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(type !== undefined ? { type: type as (typeof ACCOUNT_TYPES)[number] } : {}),
      ...(parentAccountId !== undefined ? { parentAccountId } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
    },
  });

  await prisma.auditLogEntry.create({
    data: {
      entityType: "Account",
      entityId: account.id,
      action: "account_updated",
      beforeState: {
        name: existing.name,
        type: existing.type,
        parentAccountId: existing.parentAccountId,
        isActive: existing.isActive,
      },
      afterState: {
        name: account.name,
        type: account.type,
        parentAccountId: account.parentAccountId,
        isActive: account.isActive,
      },
      companyId,
    },
  });

  return NextResponse.json({ account });
}
