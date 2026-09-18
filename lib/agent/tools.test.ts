import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { prisma } from "../prisma";
import { proposeMatch } from "./tools";

describe("proposeMatch", () => {
  let companyId: string;
  let bankTransactionId: string;
  let glEntryId: string;

  beforeEach(async () => {
    const company = await prisma.company.create({
      data: { name: "Test Company", inviteCode: `TEST-${Date.now()}-${Math.random()}` },
    });
    companyId = company.id;

    const txn = await prisma.bankTransaction.create({
      data: {
        accountId: "TEST-ACCT",
        date: "2026-01-01",
        amountCents: 10000,
        memo: "test fixture",
        sourceFormat: "test",
        companyId,
      },
    });
    bankTransactionId = txn.id;

    const gl = await prisma.gLEntry.create({
      data: {
        fundId: "TEST",
        accountCode: "TEST-0000",
        amountCents: 10000,
        date: "2026-01-01",
        description: "test fixture",
        companyId,
      },
    });
    glEntryId = gl.id;
  });

  afterEach(async () => {
    const related = await prisma.match.findMany({ where: { OR: [{ bankTransactionId }, { glEntryId }] } });
    const matchIds = related.map((m) => m.id);
    if (matchIds.length > 0) {
      await prisma.auditLogEntry.deleteMany({ where: { entityId: { in: matchIds } } });
    }
    await prisma.match.deleteMany({ where: { OR: [{ bankTransactionId }, { glEntryId }] } });
    await prisma.bankTransaction.deleteMany({ where: { id: bankTransactionId } });
    await prisma.gLEntry.deleteMany({ where: { id: glEntryId } });
    await prisma.company.deleteMany({ where: { id: companyId } });
  });

  it("throws when the GL entry does not exist", async () => {
    const fakeGlEntryId = "00000000-0000-0000-0000-000000000000";
    await expect(
      proposeMatch(companyId, bankTransactionId, fakeGlEntryId, 0.8, "test reasoning")
    ).rejects.toThrow(/does not exist/);
  });

  it("throws when the GL entry is already matched to another transaction", async () => {
    const otherTxn = await prisma.bankTransaction.create({
      data: {
        accountId: "TEST-ACCT-2",
        date: "2026-01-01",
        amountCents: 10000,
        memo: "other txn",
        sourceFormat: "test",
        companyId,
      },
    });
    await prisma.match.create({
      data: { bankTransactionId: otherTxn.id, glEntryId, matchType: "manual", status: "approved", companyId },
    });

    await expect(
      proposeMatch(companyId, bankTransactionId, glEntryId, 0.8, "test reasoning")
    ).rejects.toThrow(/already matched/);

    await prisma.match.deleteMany({ where: { bankTransactionId: otherTxn.id } });
    await prisma.bankTransaction.deleteMany({ where: { id: otherTxn.id } });
  });

  it("creates a pending_review match and an audit log entry when the GL entry is valid and unmatched", async () => {
    const result = await proposeMatch(companyId, bankTransactionId, glEntryId, 0.85, "amount and date line up");

    const match = await prisma.match.findUnique({ where: { id: result.matchId } });
    expect(match?.status).toBe("pending_review");
    expect(match?.matchType).toBe("ai_suggested");
    expect(match?.confidenceScore).toBe(0.85);

    const auditEntry = await prisma.auditLogEntry.findFirst({ where: { entityId: result.matchId } });
    expect(auditEntry?.action).toBe("agent_proposed_match");
  });
});
