import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { getRoleFromRequest } from "../../../lib/getRoleFromRequest";

export async function GET() {
  const checks = await prisma.issuedCheck.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  return NextResponse.json({ checks });
}

export async function POST(request: NextRequest) {
  const role = getRoleFromRequest(request);
  if (role === "viewer") {
    return NextResponse.json({ error: "Viewers cannot issue checks" }, { status: 403 });
  }

  const body = await request.json();
  const { checkNumber, payee, amountCents, issueDate, accountId } = body as {
    checkNumber?: string;
    payee?: string;
    amountCents?: number;
    issueDate?: string;
    accountId?: string;
  };

  if (!checkNumber || !payee || !issueDate || !accountId || typeof amountCents !== "number") {
    return NextResponse.json(
      { error: "checkNumber, payee, amountCents, issueDate, and accountId are all required." },
      { status: 400 }
    );
  }

  const existing = await prisma.issuedCheck.findFirst({
    where: { accountId, checkNumber, status: { not: "voided" } },
  });
  if (existing) {
    return NextResponse.json(
      { error: `Check ${checkNumber} is already active on account ${accountId}.` },
      { status: 409 }
    );
  }

  const check = await prisma.issuedCheck.create({
    data: { checkNumber, payee, amountCents, issueDate, accountId },
  });

  await prisma.auditLogEntry.create({
    data: {
      entityType: "IssuedCheck",
      entityId: check.id,
      action: "check_issued",
      afterState: { checkNumber, payee, amountCents, issueDate, accountId },
    },
  });

  return NextResponse.json({ check });
}
