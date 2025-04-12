/*
  Warnings:

  - You are about to drop the column `fileName` on the `TranslationHistory` table. All the data in the column will be lost.
  - Changed the type of `status` on the `TranslationHistory` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "TranslationStatus" AS ENUM ('PROCESSING', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "TranslationHistory" DROP COLUMN "fileName",
ADD COLUMN     "errorMessage" TEXT,
ADD COLUMN     "translatedFileKey" TEXT,
DROP COLUMN "status",
ADD COLUMN     "status" "TranslationStatus" NOT NULL;

-- CreateIndex
CREATE INDEX "TranslationHistory_userId_createdAt_idx" ON "TranslationHistory"("userId", "createdAt");
