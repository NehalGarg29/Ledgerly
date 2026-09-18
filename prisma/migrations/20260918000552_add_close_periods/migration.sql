-- CreateEnum
CREATE TYPE "ClosePeriodStatus" AS ENUM ('open', 'closed');

-- CreateTable
CREATE TABLE "ClosePeriod" (
    "id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "status" "ClosePeriodStatus" NOT NULL DEFAULT 'open',
    "closedAt" TIMESTAMP(3),
    "closedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClosePeriod_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClosePeriod_period_key" ON "ClosePeriod"("period");

-- AddForeignKey
ALTER TABLE "ClosePeriod" ADD CONSTRAINT "ClosePeriod_closedByUserId_fkey" FOREIGN KEY ("closedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
