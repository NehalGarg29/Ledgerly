import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { getRoleFromRequest, getCompanyIdFromRequest } from "../../../lib/getRoleFromRequest";
import { getFundTree } from "../../../lib/chartOfAccounts";

export async function GET(request: NextRequest) {
  const companyId = getCompanyIdFromRequest(request);
  if (!companyId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const funds = await getFundTree(companyId);
  return NextResponse.json({ funds });
}

export async function POST(request: NextRequest) {
  const role = getRoleFromRequest(request);
  if (role !== "admin") {
    return NextResponse.json({ error: "Only admins can add funds." }, { status: 403 });
  }
  const companyId = getCompanyIdFromRequest(request);
  if (!companyId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const { code, name, parentCode, isActive } = body as {
    code?: string;
    name?: string;
    parentCode?: string | null;
    isActive?: boolean;
  };

  if (!code || !name) {
    return NextResponse.json({ error: "Code and name are required." }, { status: 400 });
  }

  const existing = await prisma.fund.findFirst({ where: { companyId, code } });
  if (existing) {
    return NextResponse.json({ error: `Fund code "${code}" already exists.` }, { status: 409 });
  }

  let parentFundId: string | null = null;
  if (parentCode) {
    const parent = await prisma.fund.findFirst({ where: { companyId, code: parentCode } });
    if (!parent) {
      return NextResponse.json({ error: `Parent fund "${parentCode}" not found.` }, { status: 400 });
    }
    parentFundId = parent.id;
  }

  const fund = await prisma.fund.create({
    data: { code, name, parentFundId, isActive: isActive ?? true, companyId },
  });

  await prisma.auditLogEntry.create({
    data: {
      entityType: "Fund",
      entityId: fund.id,
      action: "fund_created",
      afterState: { code, name, parentCode: parentCode ?? null },
      companyId,
    },
  });

  return NextResponse.json({ fund });
}
