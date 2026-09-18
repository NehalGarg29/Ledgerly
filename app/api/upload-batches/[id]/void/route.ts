import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { getRoleFromRequest } from "../../../../../lib/getRoleFromRequest";

// Deletes an upload batch and everything it created: its bank transactions,
// its GL entries, and any matches touching either side of that (even a
// match where only the GL entry came from this batch — the transaction on
// the other end just goes back to being unmatched, which is correct).
//
// The audit log is NOT touched here on purpose. Old entries that reference
// a now-deleted match are left exactly as they were — this app's audit log
// is append-only everywhere else, and a void shouldn't be the one place
// that rewrites history. Instead this writes one new entry recording the
// void itself, with a snapshot of what the batch was and what was removed.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const role = getRoleFromRequest(request);
  if (role === "viewer") {
    return NextResponse.json({ error: "Viewers cannot void an upload batch" }, { status: 403 });
  }

  const { id } = await params;

  const batch = await prisma.uploadBatch.findUnique({ where: { id } });
  if (!batch) {
    return NextResponse.json({ error: "Upload batch not found" }, { status: 404 });
  }

  const bankTxns = await prisma.bankTransaction.findMany({
    where: { uploadBatchId: id },
    select: { id: true },
  });
  const glEntries = await prisma.gLEntry.findMany({
    where: { uploadBatchId: id },
    select: { id: true },
  });
  const bankTxnIds = bankTxns.map((t) => t.id);
  const glEntryIds = glEntries.map((g) => g.id);

  const summary = await prisma.$transaction(async (tx) => {
    const removedTraces = await tx.agentTrace.deleteMany({
      where: { bankTransactionId: { in: bankTxnIds } },
    });

    const removedMatches = await tx.match.deleteMany({
      where: {
        OR: [{ bankTransactionId: { in: bankTxnIds } }, { glEntryId: { in: glEntryIds } }],
      },
    });

    const removedTxns = await tx.bankTransaction.deleteMany({ where: { id: { in: bankTxnIds } } });
    const removedGl = await tx.gLEntry.deleteMany({ where: { id: { in: glEntryIds } } });

    await tx.uploadBatch.delete({ where: { id } });

    const result = {
      removedBankTransactions: removedTxns.count,
      removedGlEntries: removedGl.count,
      removedMatches: removedMatches.count,
      removedAgentTraces: removedTraces.count,
    };

    await tx.auditLogEntry.create({
      data: {
        entityType: "UploadBatch",
        entityId: id,
        action: "upload_batch_voided",
        beforeState: {
          filename: batch.filename,
          source: batch.source,
          rowCount: batch.rowCount,
          uploadedAt: batch.createdAt,
        },
        afterState: result,
      },
    });

    return result;
  });

  return NextResponse.json({ voided: true, filename: batch.filename, ...summary });
}