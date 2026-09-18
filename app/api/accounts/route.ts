import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { getRoleFromRequest } from "../../../lib/getRoleFromRequest";
import { getAccountTree } from "../../../lib/chartOfAccounts";

const ACCOUNT_TYPES = ["asset", "liability", "equity", "revenue", "expense"] as const;

export async function GET() {
  const accounts = await getAccountTree();
  return NextResponse.json({ accounts });
}

export async function POST(request: NextRequest) {
  const role = getRoleFromRequest(request);
  if (role !== "admin") {
    return NextResponse.json({ error: "Only admins can add accounts." }, { status: 403 });
  }

  const body = await request.json();
  const { code, name, type, parentCode, isActive } = body as {
    code?: string;
    name?: string;
    type?: string;
    parentCode?: string | null;
    isActive?: boolean;
  };

  if (!code || !name || !type) {
    return NextResponse.json({ error: "Code, name, and type are required." }, { status: 400 });
  }
  if (!ACCOUNT_TYPES.includes(type as (typeof ACCOUNT_TYPES)[number])) {
    return NextResponse.json(
      { error: `Type must be one of: ${ACCOUNT_TYPES.join(", ")}.` },
      { status: 400 }
    );
  }

  const existing = await prisma.account.findUnique({ where: { code } });
  if (existing) {
    return NextResponse.json({ error: `Account code "${code}" already exists.` }, { status: 409 });
  }

  let parentAccountId: string | null = null;
  if (parentCode) {
    const parent = await prisma.account.findUnique({ where: { code: parentCode } });
    if (!parent) {
      return NextResponse.json({ error: `Parent account "${parentCode}" not found.` }, { status: 400 });
    }
    parentAccountId = parent.id;
  }

  const account = await prisma.account.create({
    data: {
      code,
      name,
      type: type as (typeof ACCOUNT_TYPES)[number],
      parentAccountId,
      isActive: isActive ?? true,
    },
  });

  await prisma.auditLogEntry.create({
    data: {
      entityType: "Account",
      entityId: account.id,
      action: "account_created",
      afterState: { code, name, type, parentCode: parentCode ?? null },
    },
  });

  return NextResponse.json({ account });
}
