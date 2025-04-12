-- DropIndex
DROP INDEX "Slide_fileId_index_key";

-- AlterTable
ALTER TABLE "TranslationHistory" ADD COLUMN     "fileId" TEXT;

-- CreateIndex
CREATE INDEX "TranslationHistory_fileId_idx" ON "TranslationHistory"("fileId");

-- AddForeignKey
ALTER TABLE "TranslationHistory" ADD CONSTRAINT "TranslationHistory_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE;
