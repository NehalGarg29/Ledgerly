import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { Prisma } from "../../../../../lib/generated/prisma/client";
import { getRoleFromRequest } from "../../../../../lib/getRoleFromRequest";
import { checkPolicyFlags } from "../../../../../lib/policyEngine";
import { periodFromDate, isPeriodClosed } from "../../../../../lib/closePeriod";

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
  const { action, kind, glEntryId, reason } = body as {
    action: "approve" | "reject";
    kind: "pending_review" | "unmatched";
    glEntryId?: string;
    reason?: string;
  };

  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  if (kind === "pending_review") {
    const existingMatch = await prisma.match.findUnique({
      where: { id },
      include: { glEntry: true, bankTransaction: true },
    });
    if (!existingMatch) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    const period = periodFromDate(existingMatch.bankTransaction.date);
    if (await isPeriodClosed(period)) {
      return NextResponse.json(
        { error: `${period} is closed for editing. Reopen it under Month-End Close first.` },
        { status: 423 }
      );
    }

    let policyFlags: Awaited<ReturnType<typeof checkPolicyFlags>>["flags"] = [];
    if (action === "approve" && existingMatch.glEntry) {
      const result = await checkPolicyFlags(
        existingMatch.glEntry.fundId,
        existingMatch.glEntry.accountCode,
        existingMatch.glEntry.amountCents
      );
      policyFlags = result.flags;
      if (result.blocked) {
        await prisma.auditLogEntry.create({
          data: {
            entityType: "Match",
            entityId: existingMatch.id,
            action: "policy_blocked_approval",
            beforeState: { status: existingMatch.status },
            afterState: { flags: policyFlags },
          },
        });
        return NextResponse.json(
          {
            error: `Blocked by policy: ${policyFlags
              .filter((f) => f.severity === "block")
              .map((f) => f.message)
              .join(" ")}`,
          },
          { status: 422 }
        );
      }
    }

    const newStatus = action === "approve" ? "approved" : "rejected";

    const updatedMatch = await prisma.match.update({
      where: { id },
      data: {
        status: newStatus,
        reviewReason: reason || null,
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
        afterState: {
          status: updatedMatch.status,
          reason: reason || undefined,
          ...(policyFlags.length > 0 ? { policyFlags } : {}),
        },
      },
    });

    return NextResponse.json({ match: updatedMatch, policyFlags });
  }

  const bankTransaction = await prisma.bankTransaction.findUnique({
    where: { id },
  });
  if (!bankTransaction) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }

  const unmatchedPeriod = periodFromDate(bankTransaction.date);
  if (await isPeriodClosed(unmatchedPeriod)) {
    return NextResponse.json(
      { error: `${unmatchedPeriod} is closed for editing. Reopen it under Month-End Close first.` },
      { status: 423 }
    );
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

    const { flags: policyFlags, blocked } = await checkPolicyFlags(
      glEntry.fundId,
      glEntry.accountCode,
      glEntry.amountCents
    );
    if (blocked) {
      await prisma.auditLogEntry.create({
        data: {
          entityType: "BankTransaction",
          entityId: bankTransaction.id,
          action: "policy_blocked_approval",
          afterState: { glEntryId, flags: policyFlags },
        },
      });
      return NextResponse.json(
        {
          error: `Blocked by policy: ${policyFlags
            .filter((f) => f.severity === "block")
            .map((f) => f.message)
            .join(" ")}`,
        },
        { status: 422 }
      );
    }

    const newMatch = await prisma.match.create({
      data: {
        bankTransactionId: bankTransaction.id,
        glEntryId,
        matchType: "manual",
        status: "approved",
        reviewReason: reason || null,
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
          reason: reason || undefined,
          ...(policyFlags.length > 0 ? { policyFlags } : {}),
        },
      },
    });

    return NextResponse.json({ match: newMatch, policyFlags });
  }

  const newMatch = await prisma.match.create({
    data: {
      bankTransactionId: bankTransaction.id,
      glEntryId: null,
      matchType: "manual",
      status: "rejected",
      reviewReason: reason || null,
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
        reason: reason || undefined,
      },
    },
  });

  return NextResponse.json({ match: newMatch });
}