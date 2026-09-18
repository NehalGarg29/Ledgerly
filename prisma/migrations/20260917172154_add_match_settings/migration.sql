-- CreateTable
CREATE TABLE "MatchSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "autoApproveThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.9,
    "suggestThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MatchSettings_pkey" PRIMARY KEY ("id")
);
