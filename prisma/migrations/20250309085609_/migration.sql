/*
  Warnings:

  - You are about to drop the column `currentSlide` on the `Translation` table. All the data in the column will be lost.
  - You are about to drop the column `slides` on the `Translation` table. All the data in the column will be lost.
  - You are about to drop the column `translations` on the `Translation` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Translation` table. All the data in the column will be lost.
  - You are about to drop the `ActivityLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `users` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `model` to the `Translation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sourceLang` to the `Translation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `targetLang` to the `Translation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `textId` to the `Translation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `translation` to the `Translation` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "FileStatus" AS ENUM ('PROCESSING', 'READY', 'ERROR');

-- CreateEnum
CREATE TYPE "Language" AS ENUM ('ja', 'en', 'zh', 'ko');

-- DropForeignKey
ALTER TABLE "Account" DROP CONSTRAINT "Account_userId_fkey";

-- DropForeignKey
ALTER TABLE "ActivityLog" DROP CONSTRAINT "ActivityLog_userId_fkey";

-- DropForeignKey
ALTER TABLE "Session" DROP CONSTRAINT "Session_userId_fkey";

-- DropForeignKey
ALTER TABLE "Translation" DROP CONSTRAINT "Translation_userId_fkey";

-- DropIndex
DROP INDEX "Translation_userId_idx";

-- AlterTable
ALTER TABLE "Translation" DROP COLUMN "currentSlide",
DROP COLUMN "slides",
DROP COLUMN "translations",
DROP COLUMN "userId",
ADD COLUMN     "model" TEXT NOT NULL,
ADD COLUMN     "sourceLang" "Language" NOT NULL,
ADD COLUMN     "targetLang" "Language" NOT NULL,
ADD COLUMN     "textId" TEXT NOT NULL,
ADD COLUMN     "translation" TEXT NOT NULL;

-- DropTable
DROP TABLE "ActivityLog";

-- DropTable
DROP TABLE "users";

-- DropEnum
DROP TYPE "ActivityAction";

-- CreateTable
CREATE TABLE "File" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "status" "FileStatus" NOT NULL DEFAULT 'PROCESSING',
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "File_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Slide" (
    "id" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "imagePath" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Slide_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Text" (
    "id" TEXT NOT NULL,
    "slideId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "position" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Text_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Slide_fileId_index_key" ON "Slide"("fileId", "index");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Translation" ADD CONSTRAINT "Translation_textId_fkey" FOREIGN KEY ("textId") REFERENCES "Text"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Slide" ADD CONSTRAINT "Slide_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Text" ADD CONSTRAINT "Text_slideId_fkey" FOREIGN KEY ("slideId") REFERENCES "Slide"("id") ON DELETE CASCADE ON UPDATE CASCADE;
