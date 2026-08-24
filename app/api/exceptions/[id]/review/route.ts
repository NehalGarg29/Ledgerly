import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { Prisma } from "../../../../../lib/generated/prisma/client";
import { getRoleFromRequest } from "../../../../../lib/getRoleFromRequest";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const role = getRoleFromRequest(request);
  if (role === "viewer") {
    return NextResponse.json({ error: "Viewers cannot review exceptions" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const { action, kind } = body as {
    action: "approve" | "reject";
    kind: "pending_review" | "unmatched";
  };

  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  if (kind === "pending_review") {
    const existingMatch = await prisma.match.findUnique({ where: { id } });
    if (!existingMatch) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    const newStatus = action === "approve" ? "approved" : "rejected";

    const updatedMatch = await prisma.match.update({
      where: { id },
      data: {
        status: newStatus,
        reviewedByUserId: null,
        reviewedAt: new Date(),
      },
    });

    await prisma.auditLogEntry.create({
      data: {
        entityType: "Match",
        entityId: updatedMatch.id,
        action: action === "approve" ? "match_approved" : "match_rejected",
        actorUserId: null,
        beforeState: { status: existingMatch.status },
        afterState: { status: updatedMatch.status },
      },
    });

    return NextResponse.json({ match: updatedMatch });
  }

  // kind === "unmatched": no Match row exists yet.
  if (action === "approve") {
    return NextResponse.json(
      { error: "Cannot approve a transaction with no candidate GL entry" },
      { status: 400 }
    );
  }

  const bankTransaction = await prisma.bankTransaction.findUnique({
    where: { id },
  });
  if (!bankTransaction) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }

  const newMatch = await prisma.match.create({
    data: {
      bankTransactionId: bankTransaction.id,
      glEntryId: null,
      matchType: "manual",
      status: "rejected",
      reviewedByUserId: null,
      reviewedAt: new Date(),
    },
  });

  await prisma.auditLogEntry.create({
    data: {
      entityType: "Match",
      entityId: newMatch.id,
      action: "match_rejected",
      actorUserId: null,
      beforeState: Prisma.JsonNull,
      afterState: {
        status: newMatch.status,
        bankTransactionId: bankTransaction.id,
      },
    },
  });

  return NextResponse.json({ match: newMatch });
}