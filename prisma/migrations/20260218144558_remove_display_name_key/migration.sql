/*
  Warnings:

  - You are about to drop the column `displayNameKey` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[displayName]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "User_displayNameKey_key";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "displayNameKey";

-- CreateIndex
CREATE UNIQUE INDEX "User_displayName_key" ON "User"("displayName");
