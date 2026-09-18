-- CreateEnum
CREATE TYPE "AnomalyType" AS ENUM ('round_number', 'duplicate_transaction', 'statistical_outlier');

-- CreateEnum
CREATE TYPE "AnomalyStatus" AS ENUM ('pending', 'dismissed', 'confirmed');

-- CreateTable
CREATE TABLE "AnomalyFlag" (
    "id" TEXT NOT NULL,
    "bankTransactionId" TEXT NOT NULL,
    "anomalyType" "AnomalyType" NOT NULL,
    "severity" DOUBLE PRECISION NOT NULL,
    "explanation" TEXT NOT NULL,
    "status" "AnomalyStatus" NOT NULL DEFAULT 'pending',
    "reviewReason" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnomalyFlag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AnomalyFlag_bankTransactionId_anomalyType_key" ON "AnomalyFlag"("bankTransactionId", "anomalyType");

-- AddForeignKey
ALTER TABLE "AnomalyFlag" ADD CONSTRAINT "AnomalyFlag_bankTransactionId_fkey" FOREIGN KEY ("bankTransactionId") REFERENCES "BankTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
