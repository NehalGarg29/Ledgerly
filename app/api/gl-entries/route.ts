import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { Prisma } from "../../../lib/generated/prisma/client";
import { getRoleFromRequest, getCompanyIdFromRequest } from "../../../lib/getRoleFromRequest";

// Lets a reviewer key in a GL entry that hasn't been ingested from a file
// yet — e.g. they know from their own books that a posting exists but it
// hasn't been uploaded. Tagged source: "manual" so it stays distinguishable
// from file-ingested entries everywhere it's displayed.
export async function POST(request: NextRequest) {
  const role = getRoleFromRequest(request);
  if (role === "viewer") {
    return NextResponse.json({ error: "Viewers cannot create GL entries" }, { status: 403 });
  }
  const companyId = getCompanyIdFromRequest(request);
  if (!companyId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const { fundId, accountCode, amountCents, date, description } = body as {
    fundId?: string;
    accountCode?: string;
    amountCents?: number;
    date?: string;
    description?: string;
  };

  if (!fundId || !accountCode || !date || !description || typeof amountCents !== "number") {
    return NextResponse.json(
      { error: "fundId, accountCode, amountCents, date, and description are all required" },
      { status: 400 }
    );
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "date must be in YYYY-MM-DD format" }, { status: 400 });
  }

  const entry = await prisma.gLEntry.create({
    data: {
      fundId,
      accountCode,
      amountCents,
      date,
      description,
      source: "manual",
      companyId,
    },
  });

  await prisma.auditLogEntry.create({
    data: {
      entityType: "GLEntry",
      entityId: entry.id,
      action: "manual_gl_entry_created",
      actorUserId: null,
      beforeState: Prisma.JsonNull,
      afterState: {
        fundId: entry.fundId,
        accountCode: entry.accountCode,
        amountCents: entry.amountCents,
        date: entry.date,
        description: entry.description,
      },
      companyId,
    },
  });

  return NextResponse.json({ entry });
}
