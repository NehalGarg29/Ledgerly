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
  const { action, kind, glEntryId } = body as {
    action: "approve" | "reject";
    kind: "pending_review" | "unmatched";
    glEntryId?: string;
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
  const bankTransaction = await prisma.bankTransaction.findUnique({
    where: { id },
  });
  if (!bankTransaction) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }

  if (action === "approve") {
    if (!glEntryId) {
      return NextResponse.json(
        { error: "Select a GL entry to match before approving" },
        { status: 400 }
      );
    }

    const glEntry = await prisma.gLEntry.findUnique({ where: { id: glEntryId } });
    if (!glEntry) {
      return NextResponse.json({ error: "GL entry not found" }, { status: 404 });
    }

    const alreadyMatched = await prisma.match.findFirst({ where: { glEntryId } });
    if (alreadyMatched) {
      return NextResponse.json(
        { error: "That GL entry is already matched to another transaction" },
        { status: 409 }
      );
    }

    const newMatch = await prisma.match.create({
      data: {
        bankTransactionId: bankTransaction.id,
        glEntryId,
        matchType: "manual",
        status: "approved",
        reviewedByUserId: null,
        reviewedAt: new Date(),
      },
    });

    await prisma.auditLogEntry.create({
      data: {
        entityType: "Match",
        entityId: newMatch.id,
        action: "manual_match_created",
        actorUserId: null,
        beforeState: Prisma.JsonNull,
        afterState: {
          status: newMatch.status,
          bankTransactionId: bankTransaction.id,
          glEntryId,
        },
      },
    });

    return NextResponse.json({ match: newMatch });
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