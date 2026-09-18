-- CreateEnum
CREATE TYPE "IssuedCheckStatus" AS ENUM ('issued', 'cleared', 'voided');

-- CreateEnum
CREATE TYPE "PositivePayExceptionType" AS ENUM ('unauthorized_check', 'amount_mismatch', 'duplicate_presentment');

-- CreateEnum
CREATE TYPE "PositivePayExceptionStatus" AS ENUM ('pending', 'paid', 'returned');

-- CreateTable
CREATE TABLE "IssuedCheck" (
    "id" TEXT NOT NULL,
    "checkNumber" TEXT NOT NULL,
    "payee" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "issueDate" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "status" "IssuedCheckStatus" NOT NULL DEFAULT 'issued',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "voidedAt" TIMESTAMP(3),
    "clearedBankTransactionId" TEXT,

    CONSTRAINT "IssuedCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PositivePayException" (
    "id" TEXT NOT NULL,
    "bankTransactionId" TEXT NOT NULL,
    "issuedCheckId" TEXT,
    "exceptionType" "PositivePayExceptionType" NOT NULL,
    "detectedCheckNumber" TEXT,
    "status" "PositivePayExceptionStatus" NOT NULL DEFAULT 'pending',
    "reviewReason" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PositivePayException_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IssuedCheck_clearedBankTransactionId_key" ON "IssuedCheck"("clearedBankTransactionId");

-- CreateIndex
CREATE UNIQUE INDEX "PositivePayException_bankTransactionId_key" ON "PositivePayException"("bankTransactionId");

-- AddForeignKey
ALTER TABLE "IssuedCheck" ADD CONSTRAINT "IssuedCheck_clearedBankTransactionId_fkey" FOREIGN KEY ("clearedBankTransactionId") REFERENCES "BankTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PositivePayException" ADD CONSTRAINT "PositivePayException_bankTransactionId_fkey" FOREIGN KEY ("bankTransactionId") REFERENCES "BankTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PositivePayException" ADD CONSTRAINT "PositivePayException_issuedCheckId_fkey" FOREIGN KEY ("issuedCheckId") REFERENCES "IssuedCheck"("id") ON DELETE SET NULL ON UPDATE CASCADE;
