-- CreateEnum
CREATE TYPE "RoomRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- AlterTable
ALTER TABLE "RoomMember" ADD COLUMN     "role" "RoomRole" NOT NULL DEFAULT 'MEMBER';

-- CreateIndex
CREATE INDEX "RoomMember_userId_idx" ON "RoomMember"("userId");
