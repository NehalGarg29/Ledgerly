-- CreateEnum
CREATE TYPE "PolicyRuleType" AS ENUM ('max_amount', 'inactive_fund_or_account', 'restricted_account_type');

-- CreateEnum
CREATE TYPE "PolicySeverity" AS ENUM ('block', 'warn');

-- CreateTable
CREATE TABLE "PolicyRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ruleType" "PolicyRuleType" NOT NULL,
    "severity" "PolicySeverity" NOT NULL DEFAULT 'warn',
    "fundCode" TEXT,
    "thresholdCents" INTEGER,
    "allowedAccountTypes" "AccountType"[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PolicyRule_pkey" PRIMARY KEY ("id")
);
