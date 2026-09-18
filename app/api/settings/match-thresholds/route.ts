import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getRoleFromRequest } from "../../../../lib/getRoleFromRequest";

const DEFAULTS = { autoApproveThreshold: 0.9, suggestThreshold: 0.5 };

export async function GET() {
  const settings = await prisma.matchSettings.findUnique({ where: { id: "singleton" } });
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
    where: { id: "singleton" },
    create: { id: "singleton", autoApproveThreshold, suggestThreshold },
    update: { autoApproveThreshold, suggestThreshold },
  });

  await prisma.auditLogEntry.create({
    data: {
      entityType: "MatchSettings",
      entityId: "singleton",
      action: "match_thresholds_updated",
      afterState: { autoApproveThreshold, suggestThreshold },
    },
  });

  return NextResponse.json({ settings });
}
