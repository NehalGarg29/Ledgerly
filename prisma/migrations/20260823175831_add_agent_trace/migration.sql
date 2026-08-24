-- CreateTable
CREATE TABLE "AgentTrace" (
    "id" TEXT NOT NULL,
    "bankTransactionId" TEXT NOT NULL,
    "toolCalls" JSONB NOT NULL,
    "finalAction" TEXT NOT NULL,
    "finalReasoning" TEXT,
    "proposedGlEntryId" TEXT,
    "proposedConfidence" DOUBLE PRECISION,
    "matchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentTrace_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AgentTrace" ADD CONSTRAINT "AgentTrace_bankTransactionId_fkey" FOREIGN KEY ("bankTransactionId") REFERENCES "BankTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
