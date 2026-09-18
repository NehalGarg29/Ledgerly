import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma";
import { getRoleFromRequest } from "../../../../../../lib/getRoleFromRequest";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const role = getRoleFromRequest(request);
  if (role === "viewer") {
    return NextResponse.json({ error: "Viewers cannot review positive pay exceptions" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const { action, reason } = body as { action?: "pay" | "return"; reason?: string };

  if (action !== "pay" && action !== "return") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const existing = await prisma.positivePayException.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Exception not found" }, { status: 404 });
  }
  if (existing.status !== "pending") {
    return NextResponse.json({ error: "This exception was already reviewed." }, { status: 409 });
  }

  const newStatus = action === "pay" ? "paid" : "returned";

  const updated = await prisma.$transaction(async (tx) => {
    const exception = await tx.positivePayException.update({
      where: { id },
      data: { status: newStatus, reviewReason: reason || null, reviewedAt: new Date() },
    });

    if (action === "pay" && existing.issuedCheckId) {
      await tx.issuedCheck.update({
        where: { id: existing.issuedCheckId },
        data: { status: "cleared", clearedBankTransactionId: existing.bankTransactionId },
      });
    }

    return exception;
  });

  await prisma.auditLogEntry.create({
    data: {
      entityType: "PositivePayException",
      entityId: updated.id,
      action: action === "pay" ? "positive_pay_paid" : "positive_pay_returned",
      beforeState: { status: existing.status },
      afterState: { status: updated.status, reason: reason || undefined },
    },
  });

  return NextResponse.json({ exception: updated });
}
