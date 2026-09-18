/*
  Warnings:

  - Made the column `companyId` on table `Account` required. This step will fail if there are existing NULL values in that column.
  - Made the column `companyId` on table `AgentTrace` required. This step will fail if there are existing NULL values in that column.
  - Made the column `companyId` on table `AnomalyFlag` required. This step will fail if there are existing NULL values in that column.
  - Made the column `companyId` on table `AuditLogEntry` required. This step will fail if there are existing NULL values in that column.
  - Made the column `companyId` on table `BankTransaction` required. This step will fail if there are existing NULL values in that column.
  - Made the column `companyId` on table `ClosePeriod` required. This step will fail if there are existing NULL values in that column.
  - Made the column `companyId` on table `Fund` required. This step will fail if there are existing NULL values in that column.
  - Made the column `companyId` on table `GLEntry` required. This step will fail if there are existing NULL values in that column.
  - Made the column `companyId` on table `IssuedCheck` required. This step will fail if there are existing NULL values in that column.
  - Made the column `companyId` on table `Match` required. This step will fail if there are existing NULL values in that column.
  - Made the column `companyId` on table `MatchSettings` required. This step will fail if there are existing NULL values in that column.
  - Made the column `companyId` on table `PolicyRule` required. This step will fail if there are existing NULL values in that column.
  - Made the column `companyId` on table `PositivePayException` required. This step will fail if there are existing NULL values in that column.
  - Made the column `companyId` on table `UploadBatch` required. This step will fail if there are existing NULL values in that column.
  - Made the column `companyId` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Account" DROP CONSTRAINT "Account_companyId_fkey";

-- DropForeignKey
ALTER TABLE "AgentTrace" DROP CONSTRAINT "AgentTrace_companyId_fkey";

-- DropForeignKey
ALTER TABLE "AnomalyFlag" DROP CONSTRAINT "AnomalyFlag_companyId_fkey";

-- DropForeignKey
ALTER TABLE "AuditLogEntry" DROP CONSTRAINT "AuditLogEntry_companyId_fkey";

-- DropForeignKey
ALTER TABLE "BankTransaction" DROP CONSTRAINT "BankTransaction_companyId_fkey";

-- DropForeignKey
ALTER TABLE "ClosePeriod" DROP CONSTRAINT "ClosePeriod_companyId_fkey";

-- DropForeignKey
ALTER TABLE "Fund" DROP CONSTRAINT "Fund_companyId_fkey";

-- DropForeignKey
ALTER TABLE "GLEntry" DROP CONSTRAINT "GLEntry_companyId_fkey";

-- DropForeignKey
ALTER TABLE "IssuedCheck" DROP CONSTRAINT "IssuedCheck_companyId_fkey";

-- DropForeignKey
ALTER TABLE "Match" DROP CONSTRAINT "Match_companyId_fkey";

-- DropForeignKey
ALTER TABLE "MatchSettings" DROP CONSTRAINT "MatchSettings_companyId_fkey";

-- DropForeignKey
ALTER TABLE "PolicyRule" DROP CONSTRAINT "PolicyRule_companyId_fkey";

-- DropForeignKey
ALTER TABLE "PositivePayException" DROP CONSTRAINT "PositivePayException_companyId_fkey";

-- DropForeignKey
ALTER TABLE "UploadBatch" DROP CONSTRAINT "UploadBatch_companyId_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_companyId_fkey";

-- AlterTable
ALTER TABLE "Account" ALTER COLUMN "companyId" SET NOT NULL;

-- AlterTable
ALTER TABLE "AgentTrace" ALTER COLUMN "companyId" SET NOT NULL;

-- AlterTable
ALTER TABLE "AnomalyFlag" ALTER COLUMN "companyId" SET NOT NULL;

-- AlterTable
ALTER TABLE "AuditLogEntry" ALTER COLUMN "companyId" SET NOT NULL;

-- AlterTable
ALTER TABLE "BankTransaction" ALTER COLUMN "companyId" SET NOT NULL;

-- AlterTable
ALTER TABLE "ClosePeriod" ALTER COLUMN "companyId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Fund" ALTER COLUMN "companyId" SET NOT NULL;

-- AlterTable
ALTER TABLE "GLEntry" ALTER COLUMN "companyId" SET NOT NULL;

-- AlterTable
ALTER TABLE "IssuedCheck" ALTER COLUMN "companyId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Match" ALTER COLUMN "companyId" SET NOT NULL;

-- AlterTable
ALTER TABLE "MatchSettings" ALTER COLUMN "companyId" SET NOT NULL;

-- AlterTable
ALTER TABLE "PolicyRule" ALTER COLUMN "companyId" SET NOT NULL;

-- AlterTable
ALTER TABLE "PositivePayException" ALTER COLUMN "companyId" SET NOT NULL;

-- AlterTable
ALTER TABLE "UploadBatch" ALTER COLUMN "companyId" SET NOT NULL;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "companyId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "BankTransaction" ADD CONSTRAINT "BankTransaction_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GLEntry" ADD CONSTRAINT "GLEntry_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLogEntry" ADD CONSTRAINT "AuditLogEntry_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentTrace" ADD CONSTRAINT "AgentTrace_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UploadBatch" ADD CONSTRAINT "UploadBatch_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchSettings" ADD CONSTRAINT "MatchSettings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fund" ADD CONSTRAINT "Fund_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyRule" ADD CONSTRAINT "PolicyRule_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClosePeriod" ADD CONSTRAINT "ClosePeriod_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssuedCheck" ADD CONSTRAINT "IssuedCheck_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PositivePayException" ADD CONSTRAINT "PositivePayException_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnomalyFlag" ADD CONSTRAINT "AnomalyFlag_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
