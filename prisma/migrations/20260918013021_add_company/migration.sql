/*
  Warnings:

  - A unique constraint covering the columns `[companyId,code]` on the table `Account` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[companyId,period]` on the table `ClosePeriod` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[companyId,code]` on the table `Fund` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[companyId]` on the table `MatchSettings` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[companyId,contentHash]` on the table `UploadBatch` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Account_code_key";

-- DropIndex
DROP INDEX "ClosePeriod_period_key";

-- DropIndex
DROP INDEX "Fund_code_key";

-- DropIndex
DROP INDEX "UploadBatch_contentHash_key";

-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "companyId" TEXT;

-- AlterTable
ALTER TABLE "AgentTrace" ADD COLUMN     "companyId" TEXT;

-- AlterTable
ALTER TABLE "AnomalyFlag" ADD COLUMN     "companyId" TEXT;

-- AlterTable
ALTER TABLE "AuditLogEntry" ADD COLUMN     "companyId" TEXT;

-- AlterTable
ALTER TABLE "BankTransaction" ADD COLUMN     "companyId" TEXT;

-- AlterTable
ALTER TABLE "ClosePeriod" ADD COLUMN     "companyId" TEXT;

-- AlterTable
ALTER TABLE "Fund" ADD COLUMN     "companyId" TEXT;

-- AlterTable
ALTER TABLE "GLEntry" ADD COLUMN     "companyId" TEXT;

-- AlterTable
ALTER TABLE "IssuedCheck" ADD COLUMN     "companyId" TEXT;

-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "companyId" TEXT;

-- AlterTable
ALTER TABLE "MatchSettings" ADD COLUMN     "companyId" TEXT,
ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "PolicyRule" ADD COLUMN     "companyId" TEXT;

-- AlterTable
ALTER TABLE "PositivePayException" ADD COLUMN     "companyId" TEXT;

-- AlterTable
ALTER TABLE "UploadBatch" ADD COLUMN     "companyId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "companyId" TEXT;

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "inviteCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Company_inviteCode_key" ON "Company"("inviteCode");

-- CreateIndex
CREATE UNIQUE INDEX "Account_companyId_code_key" ON "Account"("companyId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "ClosePeriod_companyId_period_key" ON "ClosePeriod"("companyId", "period");

-- CreateIndex
CREATE UNIQUE INDEX "Fund_companyId_code_key" ON "Fund"("companyId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "MatchSettings_companyId_key" ON "MatchSettings"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "UploadBatch_companyId_contentHash_key" ON "UploadBatch"("companyId", "contentHash");

-- AddForeignKey
ALTER TABLE "BankTransaction" ADD CONSTRAINT "BankTransaction_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GLEntry" ADD CONSTRAINT "GLEntry_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLogEntry" ADD CONSTRAINT "AuditLogEntry_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentTrace" ADD CONSTRAINT "AgentTrace_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UploadBatch" ADD CONSTRAINT "UploadBatch_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchSettings" ADD CONSTRAINT "MatchSettings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fund" ADD CONSTRAINT "Fund_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyRule" ADD CONSTRAINT "PolicyRule_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClosePeriod" ADD CONSTRAINT "ClosePeriod_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssuedCheck" ADD CONSTRAINT "IssuedCheck_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PositivePayException" ADD CONSTRAINT "PositivePayException_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnomalyFlag" ADD CONSTRAINT "AnomalyFlag_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
