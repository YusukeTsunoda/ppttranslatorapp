/*
  Warnings:

  - You are about to drop the column `passwordHash` on the `users` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[magicLinkToken]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "passwordHash",
ADD COLUMN     "lastMagicLinkSent" TIMESTAMP(3),
ADD COLUMN     "magicLinkExpires" TIMESTAMP(3),
ADD COLUMN     "magicLinkToken" TEXT,
ADD COLUMN     "password" TEXT,
ALTER COLUMN "email" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "users_magicLinkToken_key" ON "users"("magicLinkToken");

-- CreateIndex
CREATE INDEX "users_magicLinkToken_idx" ON "users"("magicLinkToken");
