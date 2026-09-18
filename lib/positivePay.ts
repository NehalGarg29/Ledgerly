import { prisma } from "./prisma";
import { extractCheckNumber } from "./checkNumber";

export type PositivePayPassResult = { cleared: number; flagged: number; skipped: number };

// Runs positive pay against every bank transaction that hasn't been through
// it yet (no linked cleared check, no existing exception). Safe to call
// repeatedly — on every bank upload, and on demand via the "Re-scan" button,
// since it only ever touches unprocessed transactions.
export async function runPositivePayPass(): Promise<PositivePayPassResult> {
  const candidates = await prisma.bankTransaction.findMany({
    where: {
      clearedCheck: { is: null },
      positivePayException: { is: null },
    },
  });

  let cleared = 0;
  let flagged = 0;
  let skipped = 0;

  for (const txn of candidates) {
    const checkNumber = extractCheckNumber(txn.memo);
    if (!checkNumber) {
      skipped++;
      continue;
    }

    const issuedCheck = await prisma.issuedCheck.findFirst({
      where: { accountId: txn.accountId, checkNumber, status: { not: "voided" } },
    });

    if (!issuedCheck) {
      await prisma.positivePayException.create({
        data: {
          bankTransactionId: txn.id,
          exceptionType: "unauthorized_check",
          detectedCheckNumber: checkNumber,
        },
      });
      await prisma.auditLogEntry.create({
        data: {
          entityType: "BankTransaction",
          entityId: txn.id,
          action: "positive_pay_flagged",
          afterState: { exceptionType: "unauthorized_check", checkNumber, amountCents: txn.amountCents },
        },
      });
      flagged++;
      continue;
    }

    if (issuedCheck.status === "cleared") {
      await prisma.positivePayException.create({
        data: {
          bankTransactionId: txn.id,
          issuedCheckId: issuedCheck.id,
          exceptionType: "duplicate_presentment",
          detectedCheckNumber: checkNumber,
        },
      });
      await prisma.auditLogEntry.create({
        data: {
          entityType: "BankTransaction",
          entityId: txn.id,
          action: "positive_pay_flagged",
          afterState: { exceptionType: "duplicate_presentment", checkNumber, amountCents: txn.amountCents },
        },
      });
      flagged++;
      continue;
    }

    if (Math.abs(issuedCheck.amountCents) !== Math.abs(txn.amountCents)) {
      await prisma.positivePayException.create({
        data: {
          bankTransactionId: txn.id,
          issuedCheckId: issuedCheck.id,
          exceptionType: "amount_mismatch",
          detectedCheckNumber: checkNumber,
        },
      });
      await prisma.auditLogEntry.create({
        data: {
          entityType: "BankTransaction",
          entityId: txn.id,
          action: "positive_pay_flagged",
          afterState: {
            exceptionType: "amount_mismatch",
            checkNumber,
            expectedAmountCents: issuedCheck.amountCents,
            actualAmountCents: txn.amountCents,
          },
        },
      });
      flagged++;
      continue;
    }

    await prisma.issuedCheck.update({
      where: { id: issuedCheck.id },
      data: { status: "cleared", clearedBankTransactionId: txn.id },
    });
    await prisma.auditLogEntry.create({
      data: {
        entityType: "IssuedCheck",
        entityId: issuedCheck.id,
        action: "check_cleared",
        afterState: { checkNumber, amountCents: txn.amountCents, bankTransactionId: txn.id },
      },
    });
    cleared++;
  }

  return { cleared, flagged, skipped };
}
