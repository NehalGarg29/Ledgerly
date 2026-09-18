import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { getRoleFromRequest } from "../../../../../lib/getRoleFromRequest";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const role = getRoleFromRequest(request);
  if (role === "viewer") {
    return NextResponse.json({ error: "Viewers cannot review anomaly flags" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const { action, reason } = body as { action?: "dismiss" | "confirm"; reason?: string };

  if (action !== "dismiss" && action !== "confirm") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const existing = await prisma.anomalyFlag.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Flag not found" }, { status: 404 });
  }
  if (existing.status !== "pending") {
    return NextResponse.json({ error: "This flag was already reviewed." }, { status: 409 });
  }

  const newStatus = action === "dismiss" ? "dismissed" : "confirmed";

  const updated = await prisma.anomalyFlag.update({
    where: { id },
    data: { status: newStatus, reviewReason: reason || null, reviewedAt: new Date() },
  });

  await prisma.auditLogEntry.create({
    data: {
      entityType: "AnomalyFlag",
      entityId: updated.id,
      action: action === "dismiss" ? "anomaly_dismissed" : "anomaly_confirmed",
      beforeState: { status: existing.status },
      afterState: { status: updated.status, reason: reason || undefined },
    },
  });

  return NextResponse.json({ flag: updated });
}
