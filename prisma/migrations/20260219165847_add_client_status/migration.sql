/*
  Warnings:

  - You are about to drop the column `anonymizedAt` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `archivedAt` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `bannedAt` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `bannedReason` on the `Client` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "ClientStatus" AS ENUM ('ACTIVE', 'BANNED', 'ARCHIVED', 'DELETED');

-- DropIndex
DROP INDEX "Client_userId_archivedAt_idx";

-- AlterTable
ALTER TABLE "Client" DROP COLUMN "anonymizedAt",
DROP COLUMN "archivedAt",
DROP COLUMN "bannedAt",
DROP COLUMN "bannedReason",
ADD COLUMN     "status" "ClientStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "statusChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "Client_userId_status_idx" ON "Client"("userId", "status");

-- CreateIndex
CREATE INDEX "Client_userId_createdAt_idx" ON "Client"("userId", "createdAt");
