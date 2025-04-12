/*
  Warnings:

  - Made the column `fileId` on table `TranslationHistory` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "TranslationHistory" DROP CONSTRAINT "TranslationHistory_fileId_fkey";

-- AlterTable
ALTER TABLE "TranslationHistory" ALTER COLUMN "fileId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "TranslationHistory" ADD CONSTRAINT "TranslationHistory_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE;
