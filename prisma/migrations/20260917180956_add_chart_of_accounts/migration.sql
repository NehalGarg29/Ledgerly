-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('asset', 'liability', 'equity', 'revenue', 'expense');

-- CreateTable
CREATE TABLE "Fund" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "parentFundId" TEXT,

    CONSTRAINT "Fund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AccountType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "parentAccountId" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Fund_code_key" ON "Fund"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Account_code_key" ON "Account"("code");

-- AddForeignKey
ALTER TABLE "Fund" ADD CONSTRAINT "Fund_parentFundId_fkey" FOREIGN KEY ("parentFundId") REFERENCES "Fund"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_parentAccountId_fkey" FOREIGN KEY ("parentAccountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
