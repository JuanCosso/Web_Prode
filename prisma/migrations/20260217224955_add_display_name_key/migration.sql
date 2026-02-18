/*
  Warnings:

  - You are about to drop the column `displayNameNorm` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[displayNameKey]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "User_displayNameNorm_key";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "displayNameNorm",
ADD COLUMN     "displayNameKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_displayNameKey_key" ON "User"("displayNameKey");
