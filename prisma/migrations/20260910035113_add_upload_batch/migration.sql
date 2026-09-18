-- AlterTable
ALTER TABLE "BankTransaction" ADD COLUMN     "uploadBatchId" TEXT;

-- AlterTable
ALTER TABLE "GLEntry" ADD COLUMN     "uploadBatchId" TEXT;

-- CreateTable
CREATE TABLE "UploadBatch" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "rowCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UploadBatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UploadBatch_contentHash_key" ON "UploadBatch"("contentHash");

-- AddForeignKey
ALTER TABLE "BankTransaction" ADD CONSTRAINT "BankTransaction_uploadBatchId_fkey" FOREIGN KEY ("uploadBatchId") REFERENCES "UploadBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GLEntry" ADD CONSTRAINT "GLEntry_uploadBatchId_fkey" FOREIGN KEY ("uploadBatchId") REFERENCES "UploadBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
