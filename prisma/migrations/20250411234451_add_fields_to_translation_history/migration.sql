-- AlterTable
ALTER TABLE "TranslationHistory" ADD COLUMN     "fileSize" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "processingTime" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "tags" JSONB,
ADD COLUMN     "thumbnailPath" TEXT;
