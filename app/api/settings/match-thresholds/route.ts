import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getRoleFromRequest, getCompanyIdFromRequest } from "../../../../lib/getRoleFromRequest";

const DEFAULTS = { autoApproveThreshold: 0.9, suggestThreshold: 0.5 };

export async function GET(request: NextRequest) {
  const companyId = getCompanyIdFromRequest(request);
  if (!companyId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const settings = await prisma.matchSettings.findUnique({ where: { companyId } });
  return NextResponse.json({ settings: settings ?? DEFAULTS });
}

export async function PUT(request: NextRequest) {
  const role = getRoleFromRequest(request);
  if (role !== "admin") {
    return NextResponse.json(
      { error: "Only admins can change match thresholds — this affects every future transaction." },
      { status: 403 }
    );
  }
  const companyId = getCompanyIdFromRequest(request);
  if (!companyId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const { autoApproveThreshold, suggestThreshold } = body as {
    autoApproveThreshold?: number;
    suggestThreshold?: number;
  };

  if (
    typeof autoApproveThreshold !== "number" ||
    typeof suggestThreshold !== "number" ||
    autoApproveThreshold < 0 ||
    autoApproveThreshold > 1 ||
    suggestThreshold < 0 ||
    suggestThreshold > 1
  ) {
    return NextResponse.json(
      { error: "Both thresholds must be numbers between 0 and 1." },
      { status: 400 }
    );
  }

  if (suggestThreshold > autoApproveThreshold) {
    return NextResponse.json(
      {
        error:
          "The suggest threshold can't be higher than the auto-approve threshold — nothing would ever land in between.",
      },
      { status: 400 }
    );
  }

  const settings = await prisma.matchSettings.upsert({
    where: { companyId },
    create: { companyId, autoApproveThreshold, suggestThreshold },
    update: { autoApproveThreshold, suggestThreshold },
  });

  await prisma.auditLogEntry.create({
    data: {
      entityType: "MatchSettings",
      entityId: settings.id,
      action: "match_thresholds_updated",
      afterState: { autoApproveThreshold, suggestThreshold },
      companyId,
    },
  });

  return NextResponse.json({ settings });
}
